import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PaymentLockout from '@/components/PaymentLockout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { mockOrganizations, mockHourAllocations, mockTickets } from '@/lib/mockData';
import {
  Clock,
  Ticket,
  AlertTriangle,
  Plus,
  ChevronRight,
  CreditCard,
  Eye,
} from 'lucide-react';

interface HourAllocation {
  id: string;
  total_hours: number;
  used_hours: number;
  period_start: string;
  period_end: string;
}

interface TicketSummary {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  account_status: string;
  payment_overdue_since: string | null;
  stripe_customer_id: string | null;
}

export default function ClientDashboard() {
  const { user, profile } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [hourAllocation, setHourAllocation] = useState<HourAllocation | null>(null);
  const [recentTickets, setRecentTickets] = useState<TicketSummary[]>([]);
  const [openTicketCount, setOpenTicketCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isPreviewMode) {
      const previewOrg = mockOrganizations[0]; // Acme Corp as the demo client
      setOrganization({
        id: previewOrg.id,
        name: previewOrg.name,
        account_status: previewOrg.account_status,
        payment_overdue_since: previewOrg.payment_overdue_since,
        stripe_customer_id: previewOrg.stripe_customer_id,
      });
      const alloc = mockHourAllocations.find(a => a.organization_id === '1' && !a.id.includes('prev'));
      if (alloc) {
        setHourAllocation({
          id: alloc.id,
          total_hours: alloc.total_hours,
          used_hours: alloc.used_hours,
          period_start: alloc.period_start,
          period_end: alloc.period_end,
        });
      }
      const orgTickets = mockTickets.filter(t => t.organization_id === '1');
      setRecentTickets(orgTickets.slice(0, 5).map(t => ({ id: t.id, title: t.title, status: t.status, created_at: t.created_at })));
      setOpenTicketCount(orgTickets.filter(t => ['open', 'in_progress', 'waiting_on_client'].includes(t.status)).length);
      setIsLoading(false);
    } else if (user) {
      fetchDashboardData();
    }
  }, [user, isPreviewMode]);

  async function fetchDashboardData() {
    try {
      // Get user's organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (membership?.organization_id) {
        // Fetch organization details
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', membership.organization_id)
          .maybeSingle();

        if (orgData) {
          setOrganization(orgData as Organization);
        }

        // Fetch current hour allocation
        const today = new Date().toISOString().split('T')[0];
        const { data: hoursData } = await supabase
          .from('hour_allocations')
          .select('*')
          .eq('organization_id', membership.organization_id)
          .lte('period_start', today)
          .gte('period_end', today)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (hoursData) {
          setHourAllocation(hoursData as HourAllocation);
        }

        // Fetch recent tickets
        const { data: ticketsData } = await supabase
          .from('tickets')
          .select('id, title, status, created_at')
          .eq('organization_id', membership.organization_id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (ticketsData) {
          setRecentTickets(ticketsData as TicketSummary[]);
        }

        // Count open tickets
        const { count } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', membership.organization_id)
          .in('status', ['open', 'in_progress', 'waiting_on_client']);

        setOpenTicketCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const hoursUsedPercent = hourAllocation
    ? Math.min((hourAllocation.used_hours / hourAllocation.total_hours) * 100, 100)
    : 0;

  const hoursRemaining = hourAllocation
    ? Math.max(hourAllocation.total_hours - hourAllocation.used_hours, 0)
    : 0;

  const isOverdue = organization?.account_status === 'overdue';
  const isSuspended = organization?.account_status === 'suspended';

  // Hard lockout for suspended or severely overdue accounts (14+ days)
  const overdueDays = organization?.payment_overdue_since
    ? Math.floor((Date.now() - new Date(organization.payment_overdue_since).getTime()) / 86400000)
    : 0;

  if (isSuspended || (isOverdue && overdueDays >= 14)) {
    return (
      <PaymentLockout
        organizationName={organization?.name || 'Your organization'}
        overdueSince={organization?.payment_overdue_since || null}
        stripeCustomerId={organization?.stripe_customer_id || null}
      />
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      open: 'default',
      in_progress: 'secondary',
      waiting_on_client: 'outline',
      resolved: 'secondary',
      closed: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <DashboardLayout role="client">
      <div className="p-6 space-y-6">
        {/* Payment overdue banner (grace period) */}
        {isOverdue && organization && (
          <PaymentLockout
            organizationName={organization.name}
            overdueSince={organization.payment_overdue_since}
            stripeCustomerId={organization.stripe_customer_id}
          />
        )}

        {isPreviewMode && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <Eye className="h-4 w-4" />
            <AlertDescription><strong>Preview Mode:</strong> Showing Acme Corp's dashboard as the demo client.</AlertDescription>
          </Alert>
        )}

        {/* Welcome header */}
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {isPreviewMode ? 'Jessica' : (profile?.full_name?.split(' ')[0] || 'there')}!
          </h1>
          <p className="text-muted-foreground">
            {organization?.name || 'Your organization'} dashboard
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Hours remaining */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Hours Remaining</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hoursRemaining.toFixed(1)}</div>
              <Progress value={100 - hoursUsedPercent} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {hourAllocation?.used_hours.toFixed(1) || 0} of {hourAllocation?.total_hours || 0} hours used
              </p>
            </CardContent>
          </Card>

          {/* Open tickets */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openTicketCount}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Active support requests
              </p>
              <Button asChild variant="link" className="px-0 mt-2">
                <Link to="/client/tickets">
                  View all tickets <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Subscription status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Subscription</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {organization?.account_status || 'Active'}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Current plan status
              </p>
              <Button asChild variant="link" className="px-0 mt-2">
                <Link to="/client/subscriptions">
                  Manage subscription <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent tickets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Tickets</CardTitle>
              <CardDescription>Your latest support requests</CardDescription>
            </div>
            <Button asChild>
              <Link to="/client/tickets/new">
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tickets yet</p>
                <p className="text-sm">Create your first support ticket to get help.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    to={`/client/tickets/${ticket.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{ticket.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(ticket.status)}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
