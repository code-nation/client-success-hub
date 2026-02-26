import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Filter, ChevronRight } from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ClientTickets() {
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user || isPreviewMode) {
      fetchTickets();
    }
  }, [user, isPreviewMode]);

  async function fetchTickets() {
    try {
      if (isPreviewMode) {
        setTickets([
          { id: '1', title: 'Website not loading on mobile', status: 'open', created_at: new Date(Date.now() - 2 * 3600000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString() },
          { id: '2', title: 'Email campaign setup help', status: 'waiting_on_client', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 7200000).toISOString() },
          { id: '3', title: 'Social media assets for Q1 launch', status: 'open', created_at: new Date(Date.now() - 2 * 86400000).toISOString(), updated_at: new Date(Date.now() - 43200000).toISOString() },
          { id: '4', title: 'DNS records need updating', status: 'open', created_at: new Date(Date.now() - 3 * 86400000).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString() },
          { id: '5', title: 'Monthly analytics report request', status: 'closed', created_at: new Date(Date.now() - 5 * 86400000).toISOString(), updated_at: new Date(Date.now() - 2 * 86400000).toISOString() },
          { id: '6', title: 'Logo redesign feedback', status: 'closed', created_at: new Date(Date.now() - 7 * 86400000).toISOString(), updated_at: new Date(Date.now() - 3 * 86400000).toISOString() },
          { id: '7', title: 'SEO optimization questions', status: 'closed', created_at: new Date(Date.now() - 14 * 86400000).toISOString(), updated_at: new Date(Date.now() - 10 * 86400000).toISOString() },
        ]);
        setIsLoading(false);
        return;
      }

      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (membership?.organization_id) {
        const { data } = await supabase
          .from('tickets')
          .select('id, title, status, created_at, updated_at')
          .eq('organization_id', membership.organization_id)
          .order('created_at', { ascending: false });

        if (data) {
          setTickets(data as Ticket[]);
        }
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      open: { variant: 'default', label: 'Open' },
      in_progress: { variant: 'default', label: 'Open' },
      waiting_on_client: { variant: 'outline', label: 'Waiting on You' },
      resolved: { variant: 'secondary', label: 'Closed' },
      closed: { variant: 'secondary', label: 'Closed' },
    };
    const { variant, label } = config[status] || { variant: 'default', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <DashboardLayout role="client">
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Support Tickets</h1>
            <p className="text-muted-foreground">Track and manage your support requests</p>
          </div>
          <Button asChild>
            <Link to="/client/tickets/new">
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="waiting_on_client">Waiting on You</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Ticket list */}
        <Card>
          <CardHeader>
            <CardTitle>Your Tickets</CardTitle>
            <CardDescription>
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No tickets found</p>
                {searchQuery || statusFilter !== 'all' ? (
                  <p className="text-sm mt-2">Try adjusting your filters</p>
                ) : (
                  <Button asChild variant="link" className="mt-2">
                    <Link to="/client/tickets/new">Create your first ticket</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    to={`/client/tickets/${ticket.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-medium truncate">{ticket.title}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
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
