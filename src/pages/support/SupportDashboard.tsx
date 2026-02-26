import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { mockTickets } from '@/lib/mockData';
import {
  Ticket,
  Users,
  Clock,
  ChevronRight,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface TicketWithOrg {
  id: string;
  title: string;
  status: string;
  created_at: string;
  organization_id: string;
  organizations: {
    name: string;
  } | null;
}

export default function SupportDashboard() {
  const { user, profile } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const [myTickets, setMyTickets] = useState<TicketWithOrg[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [myOpenCount, setMyOpenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isPreviewMode) {
      // Show tickets assigned to "Sarah Chen" (u2) as the demo support user
      const assigned = mockTickets.filter(
        t => t.assigned_to_user_id === 'u2' && ['open', 'in_progress', 'waiting_on_client'].includes(t.status)
      ) as unknown as TicketWithOrg[];
      setMyTickets(assigned);
      setMyOpenCount(assigned.length);
      setUnassignedCount(mockTickets.filter(t => !t.assigned_to_user_id && ['open', 'in_progress'].includes(t.status)).length);
      setIsLoading(false);
    } else if (user) {
      fetchDashboardData();
    }
  }, [user, isPreviewMode]);

  async function fetchDashboardData() {
    try {
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select(`
          id, title, status, created_at, organization_id,
          organizations (name)
        `)
        .eq('assigned_to_user_id', user?.id)
        .in('status', ['open', 'in_progress', 'waiting_on_client'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (ticketsData) {
        setMyTickets(ticketsData as unknown as TicketWithOrg[]);
        setMyOpenCount(ticketsData.length);
      }

      const { count } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .is('assigned_to_user_id', null)
        .in('status', ['open', 'in_progress']);

      setUnassignedCount(count || 0);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      open: 'default',
      in_progress: 'secondary',
      waiting_on_client: 'outline',
      resolved: 'secondary',
      closed: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <DashboardLayout role="support">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome, {isPreviewMode ? 'Sarah' : (profile?.full_name?.split(' ')[0] || 'Support')}
          </h1>
          <p className="text-muted-foreground">
            Here's your ticket queue overview
          </p>
        </div>

        {isPreviewMode && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <Eye className="h-4 w-4" />
            <AlertDescription><strong>Preview Mode:</strong> Showing Sarah Chen's queue as the demo support user.</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">My Open Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myOpenCount}</div>
              <p className="text-xs text-muted-foreground mt-2">Assigned to you</p>
            </CardContent>
          </Card>

          <Card className={unassignedCount > 0 ? 'border-warning' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
              <AlertCircle className={`h-4 w-4 ${unassignedCount > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unassignedCount}</div>
              <p className="text-xs text-muted-foreground mt-2">Waiting to be claimed</p>
              {unassignedCount > 0 && (
                <Button asChild variant="link" className="px-0 mt-2">
                  <Link to="/support/tickets?filter=unassigned">
                    Claim tickets <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/support/tickets">
                  <Ticket className="h-4 w-4 mr-2" />
                  View All Tickets
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/support/clients">
                  <Users className="h-4 w-4 mr-2" />
                  Browse Clients
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Ticket Queue</CardTitle>
            <CardDescription>Tickets assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            {myTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tickets assigned</p>
                <p className="text-sm">Check the unassigned queue to claim tickets.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    to={`/support/tickets/${ticket.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{ticket.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {ticket.organizations?.name} • {new Date(ticket.created_at).toLocaleDateString()}
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
