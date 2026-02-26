import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

interface PaymentLockoutProps {
  organizationName: string;
  overdueSince: string | null;
  stripeCustomerId: string | null;
  isPreviewMode?: boolean;
}

export default function PaymentLockout({ organizationName, overdueSince, stripeCustomerId, isPreviewMode }: PaymentLockoutProps) {
  const [isLoading, setIsLoading] = useState(false);

  const daysSinceOverdue = overdueSince
    ? Math.floor((Date.now() - new Date(overdueSince).getTime()) / 86400000)
    : 0;

  const isHardLockout = daysSinceOverdue >= 14;

  async function openBillingPortal() {
    if (isPreviewMode) {
      toast.info('Billing portal would open here (preview mode)');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: { customer_id: stripeCustomerId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
      toast.error('Failed to open billing portal');
    } finally {
      setIsLoading(false);
    }
  }

  if (isHardLockout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Account Suspended</CardTitle>
            <CardDescription>
              {organizationName}'s account has been suspended due to an overdue payment ({daysSinceOverdue} days).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Please update your payment method to restore access to all portal features.
            </p>
            <Button className="w-full" onClick={openBillingPortal} disabled={isLoading}>
              <CreditCard className="h-4 w-4 mr-2" />
              {isLoading ? 'Opening...' : 'Update Payment Method'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              If you believe this is an error, please contact support@agency.com
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Grace period banner (shown inline, not full-screen)
  return (
    <Card className="border-destructive bg-destructive/5">
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-destructive">Payment Overdue — {daysSinceOverdue} day{daysSinceOverdue !== 1 ? 's' : ''}</p>
            <p className="text-sm text-muted-foreground">
              Please update your payment within {14 - daysSinceOverdue} day{14 - daysSinceOverdue !== 1 ? 's' : ''} to avoid account suspension.
            </p>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={openBillingPortal} disabled={isLoading} className="shrink-0">
          <CreditCard className="h-4 w-4 mr-2" />
          {isLoading ? 'Opening...' : 'Update Payment'}
        </Button>
      </CardContent>
    </Card>
  );
}
