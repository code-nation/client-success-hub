import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';

export default function ClientSubscriptions() {
  const { toast } = useToast();
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  async function handleManageSubscription() {
    setIsPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data.url) window.open(data.url, '_blank');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to open billing portal',
        variant: 'destructive',
      });
    } finally {
      setIsPortalLoading(false);
    }
  }

  return (
    <DashboardLayout role="client">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">Manage your billing and subscription</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing & Subscription
            </CardTitle>
            <CardDescription>
              Manage your subscription, update payment methods, and view invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleManageSubscription} disabled={isPortalLoading}>
              {isPortalLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Manage Billing
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
