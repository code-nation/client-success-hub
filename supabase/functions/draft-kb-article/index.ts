import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketTitle, ticketDescription, messages, categoryName } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build conversation context from ticket
    const conversationContext = messages
      .filter((m: any) => !m.is_internal)
      .map((m: any) => `${m.author}: ${m.content}`)
      .join("\n\n");

    const systemPrompt = `You are a technical writer for a digital agency's knowledge base. Your job is to transform support ticket conversations into helpful, generalized knowledge base articles.

Rules:
- Remove all client-specific details (names, company names, URLs, account info)
- Write in a clear, professional tone suitable for any client
- Structure with a clear title, introduction, step-by-step instructions where applicable, and a summary
- Use markdown formatting (headings, bullet points, code blocks if relevant)
- Include a brief excerpt (1-2 sentences) at the start that summarizes the article
- Make the content actionable and self-service oriented
- If the resolution involved multiple steps, present them as numbered instructions

Return your response in this exact format:
TITLE: [article title]
EXCERPT: [1-2 sentence summary]
CONTENT:
[full article content in markdown]`;

    const userPrompt = `Transform this support ticket into a knowledge base article:

Ticket Title: ${ticketTitle}
${ticketDescription ? `Description: ${ticketDescription}` : ""}
${categoryName ? `Category: ${categoryName}` : ""}

Conversation:
${conversationContext}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the structured response
    const titleMatch = content.match(/TITLE:\s*(.+)/);
    const excerptMatch = content.match(/EXCERPT:\s*(.+)/);
    const contentMatch = content.match(/CONTENT:\s*([\s\S]+)/);

    const article = {
      title: titleMatch?.[1]?.trim() || ticketTitle,
      excerpt: excerptMatch?.[1]?.trim() || "",
      content: contentMatch?.[1]?.trim() || content,
    };

    return new Response(JSON.stringify(article), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("draft-kb-article error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
