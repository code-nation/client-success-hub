import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';

interface Message {
  author: string;
  content: string;
  is_internal: boolean;
}

interface Suggestion {
  label: string;
  text: string;
}

interface AISuggestRepliesProps {
  ticketTitle: string;
  ticketDescription: string | null;
  ticketCategory: string | null;
  messages: Message[];
  onSelectSuggestion: (text: string) => void;
  isPreviewMode?: boolean;
}

const mockSuggestions: Suggestion[] = [
  { label: 'Quick Acknowledge', text: "Thank you for bringing this to our attention. I'm looking into the mobile rendering issue now and will have an update within the hour." },
  { label: 'Detailed Response', text: "I've identified the CSS viewport issue causing the navigation overlap on iOS. The fix involves updating the media queries for the hero section. I'll push the changes to staging for your review today." },
  { label: 'Ask for Details', text: "Could you let me know which specific iOS version and device model you're using? Also, does the issue happen on all pages or just the homepage? This will help me narrow down the fix." },
];

export default function AISuggestReplies({
  ticketTitle,
  ticketDescription,
  ticketCategory,
  messages,
  onSelectSuggestion,
  isPreviewMode = false,
}: AISuggestRepliesProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  async function generateSuggestions() {
    if (isPreviewMode) {
      setSuggestions(mockSuggestions);
      setHasGenerated(true);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-reply', {
        body: {
          ticketTitle,
          ticketDescription,
          messages,
          category: ticketCategory,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setSuggestions(data?.suggestions || []);
      setHasGenerated(true);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error('Failed to generate suggestions');
    } finally {
      setIsLoading(false);
    }
  }

  if (!hasGenerated) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={generateSuggestions}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        AI Suggest Replies
      </Button>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          AI Suggestions
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => {
            setHasGenerated(false);
            setSuggestions([]);
          }}
        >
          Dismiss
        </Button>
      </div>
      <div className="grid gap-2">
        {suggestions.map((suggestion, i) => (
          <Card
            key={i}
            className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => {
              onSelectSuggestion(suggestion.text);
              setHasGenerated(false);
              setSuggestions([]);
            }}
          >
            <p className="text-xs font-medium text-muted-foreground mb-1">{suggestion.label}</p>
            <p className="text-sm">{suggestion.text}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
