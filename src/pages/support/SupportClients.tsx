import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { mockOrganizations, mockTickets } from '@/lib/mockData';
import { Search, Eye, Building2, ChevronRight, Users } from 'lucide-react';

interface ClientRow {
  id: string;
  name: string;
  account_status: string;
  website: string | null;
  openTickets: number;
}

const mockClients: ClientRow[] = mockOrganizations.map(org => ({
  id: org.id,
  name: org.name,
  account_status: org.account_status,
  website: org.website,
  openTickets: mockTickets.filter(t => t.organization_id === org.id && ['open', 'in_progress', 'waiting_on_client'].includes(t.status)).length,
}));

export default function SupportClients() {
  const { isPreviewMode } = usePreviewMode();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isPreviewMode) {
      setClients(mockClients);
      setIsLoading(false);
    } else {
      fetchClients();
    }
  }, [isPreviewMode]);

  async function fetchClients() {
    try {
      const { data: orgs } = await supabase.from('organizations').select('id, name, account_status, website');
      if (!orgs) { setIsLoading(false); return; }

      const clientRows: ClientRow[] = [];
      for (const org of orgs) {
        const { count: tickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .in('status', ['open', 'in_progress', 'waiting_on_client']);

        clientRows.push({
          id: org.id,
          name: org.name,
          account_status: org.account_status,
          website: org.website,
          openTickets: tickets || 0,
        });
      }
      setClients(clientRows);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const statusBadge = (s: string) => {
    const v: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default', paused: 'secondary', suspended: 'destructive', overdue: 'destructive',
    };
    return <Badge variant={v[s] || 'outline'}>{s}</Badge>;
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout role="support">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground">Browse client accounts</p>
        </div>

        {isPreviewMode && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <Eye className="h-4 w-4" />
            <AlertDescription><strong>Preview Mode:</strong> Sample data shown.</AlertDescription>
          </Alert>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search clients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        <div className="space-y-3">
          {filtered.map(client => (
            <Link key={client.id} to={`/support/clients/${client.id}`}>
              <Card className={`hover:bg-muted/50 transition-colors ${client.account_status === 'overdue' ? 'border-destructive/50' : ''}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{client.name}</span>
                          {statusBadge(client.account_status)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {client.website && <span>{client.website}</span>}
                          <span>{client.openTickets} open ticket{client.openTickets !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {filtered.length === 0 && !isLoading && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No clients found</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
