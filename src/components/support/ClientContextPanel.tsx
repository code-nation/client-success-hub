import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2,
  Clock,
  Ticket,
  AlertTriangle,
  ExternalLink,
  Flag,
  CreditCard,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface ClientContextPanelProps {
  organizationId: string;
  isPreviewMode?: boolean;
}

interface OrgData {
  id: string;
  name: string;
  account_status: string;
  website: string | null;
  notes: string | null;
  payment_overdue_since: string | null;
}

interface HourAllocation {
  total_hours: number;
  used_hours: number;
  period_end: string;
}

interface RecentTicket {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

// Mock data for preview
const mockOrgData: OrgData = {
  id: '1',
  name: 'Acme Corp',
  account_status: 'active',
  website: 'https://acme.com',
  notes: 'Premium client. Very responsive. Prefers email communication.',
  payment_overdue_since: null,
};

const mockHourAllocation: HourAllocation = {
  total_hours: 40,
  used_hours: 28,
  period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
};

const mockRecentTickets: RecentTicket[] = [
  { id: '1', title: 'Website update request', status: 'resolved', created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '2', title: 'Email campaign review', status: 'closed', created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '3', title: 'Logo redesign', status: 'closed', created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
];

export default function ClientContextPanel({ organizationId, isPreviewMode = false }: ClientContextPanelProps) {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [allocation, setAllocation] = useState<HourAllocation | null>(null);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [ticketCount, setTicketCount] = useState(0);
  const [avgSatisfaction, setAvgSatisfaction] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isPreviewMode) {
      setOrg(mockOrgData);
      setAllocation(mockHourAllocation);
      setRecentTickets(mockRecentTickets);
      setTicketCount(12);
      setAvgSatisfaction(4.5);
      setIsLoading(false);
    } else {
      fetchClientData();
    }
  }, [organizationId, isPreviewMode]);

  async function fetchClientData() {
    try {
      // Fetch organization
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name, account_status, website, notes, payment_overdue_since')
        .eq('id', organizationId)
        .maybeSingle();

      if (orgData) setOrg(orgData as OrgData);

      // Fetch current hour allocation
      const today = new Date().toISOString().split('T')[0];
      const { data: allocData } = await supabase
        .from('hour_allocations')
        .select('total_hours, used_hours, period_end')
        .eq('organization_id', organizationId)
        .lte('period_start', today)
        .gte('period_end', today)
        .maybeSingle();

      if (allocData) setAllocation(allocData as HourAllocation);

      // Fetch recent tickets
      const { data: ticketsData, count } = await supabase
        .from('tickets')
        .select('id, title, status, created_at', { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (ticketsData) setRecentTickets(ticketsData as RecentTicket[]);
      setTicketCount(count || 0);

      // Fetch average satisfaction
      const { data: surveys } = await supabase
        .from('satisfaction_surveys')
        .select('rating')
        .eq('organization_id', organizationId)
        .not('rating', 'is', null);

      if (surveys && surveys.length > 0) {
        const avg = surveys.reduce((sum, s) => sum + (s.rating || 0), 0) / surveys.length;
        setAvgSatisfaction(avg);
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const getAccountStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      active: { variant: 'default', label: 'Active' },
      paused: { variant: 'secondary', label: 'Paused' },
      suspended: { variant: 'destructive', label: 'Suspended' },
      overdue: { variant: 'destructive', label: 'Overdue' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const hoursPercent = allocation 
    ? (allocation.used_hours / allocation.total_hours) * 100 
    : 0;

  const daysUntilRenewal = allocation
    ? Math.ceil((new Date(allocation.period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  if (isLoading) {
    return (
      <Card className="w-80">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!org) {
    return (
      <Card className="w-80">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">Client not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-80 flex-shrink-0">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <Link to={`/support/clients/${org.id}`} className="text-base font-semibold hover:text-primary hover:underline transition-colors">
              {org.name}
            </Link>
          </div>
          {getAccountStatusBadge(org.account_status)}
        </div>
        {org.website && (
          <a 
            href={org.website} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            {org.website.replace(/^https?:\/\//, '')}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Payment Warning */}
        {org.payment_overdue_since && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Payment Overdue</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Since {new Date(org.payment_overdue_since).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Hours */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              Hours Remaining
            </span>
            <span className="font-medium">
              {allocation ? `${(allocation.total_hours - allocation.used_hours).toFixed(1)}h` : 'N/A'}
            </span>
          </div>
          {allocation && (
            <>
              <Progress 
                value={hoursPercent} 
                className={hoursPercent > 85 ? '[&>div]:bg-destructive' : ''} 
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{allocation.used_hours.toFixed(1)} / {allocation.total_hours}h used</span>
                {daysUntilRenewal !== null && (
                  <span>{daysUntilRenewal}d until renewal</span>
                )}
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* Satisfaction */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Avg. Satisfaction</span>
          <div className="flex items-center gap-1">
            {avgSatisfaction !== null ? (
              <>
                <span className="font-medium">{avgSatisfaction.toFixed(1)}</span>
                <span className="text-muted-foreground">/5</span>
                {avgSatisfaction >= 4 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : avgSatisfaction < 3 ? (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground text-sm">No data</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Tickets</span>
          <span className="font-medium">{ticketCount}</span>
        </div>

        <Separator />

        {/* Notes */}
        {org.notes && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Flag className="h-4 w-4" />
              <span>Notes</span>
            </div>
            <p className="text-sm bg-muted/50 p-2 rounded">
              {org.notes}
            </p>
          </div>
        )}

        {/* Recent Tickets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Ticket className="h-4 w-4" />
              Recent Tickets
            </span>
          </div>
          {recentTickets.length === 0 ? (
            <p className="text-xs text-muted-foreground">No previous tickets</p>
          ) : (
            <div className="space-y-1">
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/support/tickets/${ticket.id}`}
                  className="block p-2 rounded hover:bg-muted/50 transition-colors"
                >
                  <p className="text-sm font-medium truncate">{ticket.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ticket.status.replace(/_/g, ' ')} • {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
