import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AssigneeSelect from '@/components/support/AssigneeSelect';
import {
  Search, Eye, Clock, AlertCircle, Ticket, ChevronRight, RotateCcw,
} from 'lucide-react';

interface TicketRow {
  id: string;
  title: string;
  status: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  organization_id: string;
  assigned_to_user_id: string | null;
  sla_due_at: string | null;
  organizations: { name: string } | null;
}

const mockTickets: TicketRow[] = [
  { id: '1', title: 'Website not loading properly on mobile', status: 'open', category: 'Technical', created_at: new Date(Date.now() - 2*3600000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString(), organization_id: '1', assigned_to_user_id: null, sla_due_at: new Date(Date.now() + 4*3600000).toISOString(), organizations: { name: 'Acme Corp' } },
  { id: '2', title: 'Email campaign setup help', status: 'in_progress', category: 'Marketing', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 7200000).toISOString(), organization_id: '2', assigned_to_user_id: 'user-1', sla_due_at: new Date(Date.now() + 12*3600000).toISOString(), organizations: { name: 'TechStart Inc' } },
  { id: '3', title: 'SEO optimization questions', status: 'waiting_on_client', category: 'SEO', created_at: new Date(Date.now() - 3*86400000).toISOString(), updated_at: new Date(Date.now() - 43200000).toISOString(), organization_id: '3', assigned_to_user_id: 'user-2', sla_due_at: null, organizations: { name: 'Global Services' } },
  { id: '4', title: 'Social media integration broken', status: 'open', category: 'Technical', created_at: new Date(Date.now() - 1800000).toISOString(), updated_at: new Date(Date.now() - 900000).toISOString(), organization_id: '1', assigned_to_user_id: null, sla_due_at: new Date(Date.now() + 2*3600000).toISOString(), organizations: { name: 'Acme Corp' } },
  { id: '5', title: 'Monthly report request', status: 'in_progress', category: 'Reporting', created_at: new Date(Date.now() - 2*86400000).toISOString(), updated_at: new Date(Date.now() - 21600000).toISOString(), organization_id: '4', assigned_to_user_id: 'user-1', sla_due_at: new Date(Date.now() + 86400000).toISOString(), organizations: { name: 'Local Business' } },
  { id: '6', title: 'DNS records need updating', status: 'open', category: 'Technical', created_at: new Date(Date.now() - 4*3600000).toISOString(), updated_at: new Date(Date.now() - 2*3600000).toISOString(), organization_id: '5', assigned_to_user_id: null, sla_due_at: new Date(Date.now() - 3600000).toISOString(), organizations: { name: 'Startup XYZ' } },
];

export default function AdminTicketTriage() {
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');

  useEffect(() => {
    if (isPreviewMode) {
      setTickets(mockTickets);
      setIsLoading(false);
    } else {
      fetchTickets();
    }
  }, [isPreviewMode]);

  async function fetchTickets() {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, title, status, category, created_at, updated_at, organization_id, assigned_to_user_id, sla_due_at, organizations (name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTickets((data as unknown as TicketRow[]) || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filteredTickets.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredTickets.map(t => t.id)));
    }
  }

  async function applyBulkAction() {
    if (selected.size === 0) return;
    const updates: Record<string, string> = {};
    if (bulkStatus && bulkStatus !== 'none') updates.status = bulkStatus;
    if (Object.keys(updates).length === 0) {
      toast.error('Select an action to apply');
      return;
    }

    if (isPreviewMode) {
      setTickets(prev => prev.map(t =>
        selected.has(t.id) ? { ...t, ...updates } : t
      ));
      setSelected(new Set());
      toast.success(`Updated ${selected.size} tickets`);
      return;
    }

    try {
      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .in('id', Array.from(selected));
      if (error) throw error;
      toast.success(`Updated ${selected.size} tickets`);
      setSelected(new Set());
      fetchTickets();
    } catch (err) {
      console.error(err);
      toast.error('Bulk update failed');
    }
  }

  const filteredTickets = tickets
    .filter(t => {
      const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.organizations?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getSLABadge = (sla: string | null, status: string) => {
    if (!sla || ['resolved', 'closed'].includes(status)) return null;
    const diff = (new Date(sla).getTime() - Date.now()) / 3600000;
    if (diff < 0) return <Badge variant="destructive" className="text-xs">Breached</Badge>;
    if (diff < 2) return <Badge variant="destructive" className="text-xs">{Math.round(diff * 60)}m left</Badge>;
    if (diff < 8) return <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">{Math.round(diff)}h left</Badge>;
    return <Badge variant="outline" className="text-xs">{Math.round(diff)}h</Badge>;
  };

  const getStatusBadge = (status: string) => {
    return <Badge variant="outline" className="text-xs">{status.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <DashboardLayout role="admin">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ticket Triage Center</h1>
            <p className="text-muted-foreground">Global view of all tickets with bulk actions</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => isPreviewMode ? null : fetchTickets()}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {isPreviewMode && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <Eye className="h-4 w-4" />
            <AlertDescription><strong>Preview Mode:</strong> Sample data shown.</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search tickets or clients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="waiting_on_client">Waiting on Client</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <Card className="border-primary">
            <CardContent className="py-3 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">{selected.size} selected</span>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-[160px] h-8"><SelectValue placeholder="Set status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No change —</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="waiting_on_client">Waiting on Client</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              {!isPreviewMode && (
                <AssigneeSelect
                  ticketId={Array.from(selected)[0]}
                  currentAssigneeId={null}
                  isPreviewMode={isPreviewMode}
                  compact
                  onAssigned={async (userId) => {
                    if (!userId) return;
                    try {
                      const { error } = await supabase
                        .from('tickets')
                        .update({ assigned_to_user_id: userId })
                        .in('id', Array.from(selected));
                      if (error) throw error;
                      toast.success(`Reassigned ${selected.size} tickets`);
                      setSelected(new Set());
                      fetchTickets();
                    } catch (err) {
                      console.error(err);
                      toast.error('Bulk reassign failed');
                    }
                  }}
                />
              )}
              <Button size="sm" onClick={applyBulkAction}>Apply</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </CardContent>
          </Card>
        )}

        {/* SLA summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{filteredTickets.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">SLA Breached</p>
              <p className="text-2xl font-bold text-destructive">
                {filteredTickets.filter(t => t.sla_due_at && new Date(t.sla_due_at) < new Date() && !['resolved','closed'].includes(t.status)).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">At Risk (&lt;2h)</p>
              <p className="text-2xl font-bold text-amber-600">
                {filteredTickets.filter(t => {
                  if (!t.sla_due_at || ['resolved','closed'].includes(t.status)) return false;
                  const h = (new Date(t.sla_due_at).getTime() - Date.now()) / 3600000;
                  return h > 0 && h < 2;
                }).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-muted-foreground">Unassigned</p>
              <p className="text-2xl font-bold">{filteredTickets.filter(t => !t.assigned_to_user_id).length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Ticket table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left w-10">
                      <Checkbox checked={selected.size === filteredTickets.length && filteredTickets.length > 0} onCheckedChange={toggleAll} />
                    </th>
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Ticket</th>
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Client</th>
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">SLA</th>
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Assignee</th>
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Age</th>
                    <th className="p-3 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map(ticket => (
                    <tr key={ticket.id} className={`border-b hover:bg-muted/30 transition-colors ${selected.has(ticket.id) ? 'bg-primary/5' : ''}`}>
                      <td className="p-3">
                        <Checkbox checked={selected.has(ticket.id)} onCheckedChange={() => toggleSelect(ticket.id)} />
                      </td>
                      <td className="p-3">
                        <Link to={`/support/tickets/${ticket.id}`} className="font-medium hover:underline text-sm">{ticket.title}</Link>
                        {ticket.category && <p className="text-xs text-muted-foreground">{ticket.category}</p>}
                      </td>
                      <td className="p-3 text-sm">{ticket.organizations?.name}</td>
                      <td className="p-3">{getStatusBadge(ticket.status)}</td>
                      <td className="p-3">{getSLABadge(ticket.sla_due_at, ticket.status)}</td>
                      <td className="p-3">
                        {!isPreviewMode ? (
                          <AssigneeSelect
                            ticketId={ticket.id}
                            currentAssigneeId={ticket.assigned_to_user_id}
                            onAssigned={fetchTickets}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">{ticket.assigned_to_user_id ? 'Assigned' : 'Unassigned'}</span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {(() => {
                          const diffMs = Date.now() - new Date(ticket.created_at).getTime();
                          const diffH = Math.floor(diffMs / 3600000);
                          const diffD = Math.floor(diffH / 24);
                          if (diffD > 0) return `${diffD}d`;
                          return `${diffH}h`;
                        })()}
                      </td>
                      <td className="p-3">
                        <Link to={`/support/tickets/${ticket.id}`}><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
