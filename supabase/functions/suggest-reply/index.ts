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
    const { ticketTitle, ticketDescription, messages, category } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const conversationContext = messages
      .map((m: any) => `${m.is_internal ? '[Internal] ' : ''}${m.author}: ${m.content}`)
      .join("\n\n");

    const systemPrompt = `You are an AI assistant helping support staff at a digital agency respond to client tickets. Generate helpful reply suggestions.

Rules:
- Provide exactly 3 suggested replies: one brief acknowledgement, one detailed technical response, and one that asks clarifying questions
- Keep each reply professional, empathetic, and actionable
- Do not include greetings like "Hi" or sign-offs - just the message body
- Each reply should be 2-4 sentences max
- Consider the ticket category and conversation context
- If the conversation shows a technical issue, include relevant troubleshooting steps

Return your response as a JSON array of objects with "label" and "text" fields.
Example: [{"label": "Quick Acknowledge", "text": "..."}, {"label": "Detailed Response", "text": "..."}, {"label": "Ask for Details", "text": "..."}]`;

    const userPrompt = `Ticket: ${ticketTitle}
${ticketDescription ? `Description: ${ticketDescription}` : ""}
${category ? `Category: ${category}` : ""}

Conversation so far:
${conversationContext || "(No messages yet)"}`;

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
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_replies",
                description: "Return 3 suggested reply options for the support agent.",
                parameters: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          text: { type: "string" },
                        },
                        required: ["label", "text"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["suggestions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "suggest_replies" } },
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
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    
    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions = [];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      suggestions = parsed.suggestions || [];
    } else {
      // Fallback: try to parse content directly
      const content = data.choices?.[0]?.message?.content || "[]";
      try {
        suggestions = JSON.parse(content);
      } catch {
        suggestions = [];
      }
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-reply error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
