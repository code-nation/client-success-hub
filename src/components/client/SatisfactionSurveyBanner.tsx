import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SatisfactionSurveyBannerProps {
  surveyId: string;
  ticketTitle: string;
  isPreviewMode?: boolean;
  onDismiss: () => void;
}

export default function SatisfactionSurveyBanner({
  surveyId,
  ticketTitle,
  isPreviewMode = false,
  onDismiss,
}: SatisfactionSurveyBannerProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submitSurvey() {
    if (!rating) {
      toast.error('Please select a rating');
      return;
    }

    if (isPreviewMode) {
      setSubmitted(true);
      toast.success('Thank you for your feedback!');
      setTimeout(onDismiss, 2000);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('satisfaction_surveys')
        .update({
          rating,
          feedback: feedback || null,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', surveyId);

      if (error) throw error;
      setSubmitted(true);
      toast.success('Thank you for your feedback!');
      setTimeout(onDismiss, 2000);
    } catch (error) {
      console.error('Error submitting survey:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
        <CardContent className="py-4 text-center">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            Thank you for your feedback! 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-medium">How was your experience?</p>
              <p className="text-xs text-muted-foreground">
                Your ticket "{ticketTitle}" has been resolved
              </p>
            </div>

            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(null)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      'h-6 w-6 transition-colors',
                      (hoveredStar !== null ? star <= hoveredStar : star <= (rating || 0))
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30'
                    )}
                  />
                </button>
              ))}
              {rating && (
                <span className="text-xs text-muted-foreground ml-2">
                  {rating === 5 ? 'Excellent!' : rating === 4 ? 'Great' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
                </span>
              )}
            </div>

            {rating && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Any additional feedback? (optional)"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <Button size="sm" onClick={submitSurvey} disabled={isSubmitting}>
                  Submit Feedback
                </Button>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
