import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { mockClientRows } from '@/lib/mockData';
import { Search, Eye, Users, Clock, Building2, Edit, Plus, Minus, UserPlus } from 'lucide-react';

interface ClientRow {
  id: string;
  name: string;
  account_status: string;
  website: string | null;
  totalHours: number;
  usedHours: number;
  openTickets: number;
  memberCount: number;
}

const mockClients: ClientRow[] = mockClientRows;

export default function AdminClients() {
  const { isPreviewMode } = usePreviewMode();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Quick action dialogs
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [hourAdjustment, setHourAdjustment] = useState('0');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  // New client dialog
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '', primary_contact_name: '', primary_contact_email: '', primary_contact_phone: '', website: '',
  });
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  useEffect(() => {
    if (isPreviewMode) { setClients(mockClients); setIsLoading(false); } else { fetchClients(); }
  }, [isPreviewMode]);

  async function fetchClients() {
    try {
      const { data: orgs } = await supabase.from('organizations').select('id, name, account_status, website');
      if (!orgs) { setIsLoading(false); return; }
      const today = new Date().toISOString().split('T')[0];
      const clientRows: ClientRow[] = [];
      for (const org of orgs) {
        const [{ data: alloc }, { count: tickets }, { count: members }] = await Promise.all([
          supabase.from('hour_allocations').select('total_hours, used_hours').eq('organization_id', org.id).lte('period_start', today).gte('period_end', today).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('organization_id', org.id).in('status', ['open', 'in_progress', 'waiting_on_client']),
          supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', org.id),
        ]);
        clientRows.push({ id: org.id, name: org.name, account_status: org.account_status, website: org.website, totalHours: Number(alloc?.total_hours) || 0, usedHours: Number(alloc?.used_hours) || 0, openTickets: tickets || 0, memberCount: members || 0 });
      }
      setClients(clientRows);
    } catch (err) { console.error(err); toast.error('Failed to load clients'); } finally { setIsLoading(false); }
  }

  async function updateAccountStatus() {
    if (!selectedClient || !newStatus) return;
    if (isPreviewMode) { setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, account_status: newStatus } : c)); toast.success('Status updated'); setStatusDialogOpen(false); return; }
    try {
      const { error } = await supabase.from('organizations').update({ account_status: newStatus as any }).eq('id', selectedClient.id);
      if (error) throw error;
      toast.success('Status updated');
      setStatusDialogOpen(false);
      fetchClients();
    } catch { toast.error('Failed to update status'); }
  }

  async function adjustHours() {
    if (!selectedClient) return;
    const adj = parseFloat(hourAdjustment);
    if (isNaN(adj) || adj === 0) return;
    if (isPreviewMode) { setClients(prev => prev.map(c => c.id === selectedClient.id ? { ...c, totalHours: c.totalHours + adj } : c)); toast.success('Hours adjusted'); setAdjustDialogOpen(false); return; }
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: alloc } = await supabase.from('hour_allocations').select('id, total_hours').eq('organization_id', selectedClient.id).lte('period_start', today).gte('period_end', today).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!alloc) { toast.error('No active allocation found'); return; }
      const { error } = await supabase.from('hour_allocations').update({ total_hours: Number(alloc.total_hours) + adj }).eq('id', alloc.id);
      if (error) throw error;
      toast.success('Hours adjusted');
      setAdjustDialogOpen(false);
      fetchClients();
    } catch { toast.error('Failed to adjust hours'); }
  }

  async function createClient() {
    if (!newClientData.name.trim()) { toast.error('Client name is required'); return; }
    if (isPreviewMode) { toast.success('Preview: Client creation simulated'); setNewClientOpen(false); return; }
    setIsCreatingClient(true);
    try {
      const { error } = await supabase.from('organizations').insert({
        name: newClientData.name,
        primary_contact_name: newClientData.primary_contact_name || null,
        primary_contact_email: newClientData.primary_contact_email || null,
        primary_contact_phone: newClientData.primary_contact_phone || null,
        website: newClientData.website || null,
      });
      if (error) throw error;
      toast.success('Client created');
      setNewClientOpen(false);
      setNewClientData({ name: '', primary_contact_name: '', primary_contact_email: '', primary_contact_phone: '', website: '' });
      fetchClients();
    } catch (err: any) { toast.error(err.message || 'Failed to create client'); } finally { setIsCreatingClient(false); }
  }

  const statusBadge = (s: string) => {
    const v: Record<string, 'default' | 'destructive' | 'outline'> = { active: 'default', overdue: 'destructive' };
    const labels: Record<string, string> = { active: 'Active', overdue: 'Overdue' };
    return <Badge variant={v[s] || 'outline'}>{labels[s] || s}</Badge>;
  };

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.account_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <DashboardLayout role="ops">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Client Management</h1>
            <p className="text-muted-foreground">Manage client accounts, hours, and statuses</p>
          </div>
          <Button onClick={() => setNewClientOpen(true)}><UserPlus className="h-4 w-4 mr-2" />Add New Client</Button>
        </div>

        {isPreviewMode && <Alert className="border-amber-500/50 bg-amber-500/10"><Eye className="h-4 w-4" /><AlertDescription><strong>Preview Mode:</strong> Sample data shown.</AlertDescription></Alert>}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search clients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Client list */}
        <div className="space-y-3">
          {filtered.map(client => {
            const usagePct = client.totalHours > 0 ? (client.usedHours / client.totalHours) * 100 : 0;
            return (
              <Card key={client.id} className={client.account_status === 'overdue' ? 'border-destructive/50' : ''}>
                <CardContent className="py-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <Link to={`/ops/clients/${client.id}`} className="font-semibold hover:text-primary hover:underline transition-colors">{client.name}</Link>
                        {statusBadge(client.account_status)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {client.website && <span>{client.website}</span>}
                        <span>{client.memberCount} member{client.memberCount !== 1 ? 's' : ''}</span>
                        <span>{client.openTickets} open ticket{client.openTickets !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="w-48">
                      <div className="flex justify-between text-xs mb-1"><span>{client.usedHours.toFixed(1)}h used</span><span>{client.totalHours}h total</span></div>
                      <Progress value={usagePct} className={`h-2 ${usagePct > 90 ? '[&>div]:bg-destructive' : ''}`} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedClient(client); setHourAdjustment('0'); setAdjustDialogOpen(true); }}><Clock className="h-3 w-3 mr-1" />Hours</Button>
                      <Button variant="outline" size="sm" onClick={() => { setSelectedClient(client); setNewStatus(client.account_status); setStatusDialogOpen(true); }}><Edit className="h-3 w-3 mr-1" />Status</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No clients match your filters</p></div>}
        </div>

        {/* Hour adjustment dialog */}
        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Adjust Hours — {selectedClient?.name}</DialogTitle><DialogDescription>Add or remove hours from the current allocation period.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">Current:</span><span className="font-semibold">{selectedClient?.usedHours.toFixed(1)} / {selectedClient?.totalHours}h</span></div>
              <div className="space-y-2">
                <Label>Adjustment (hours)</Label>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setHourAdjustment(String(parseFloat(hourAdjustment) - 1))}><Minus className="h-3 w-3" /></Button>
                  <Input type="number" value={hourAdjustment} onChange={e => setHourAdjustment(e.target.value)} className="w-24 text-center" />
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setHourAdjustment(String(parseFloat(hourAdjustment) + 1))}><Plus className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancel</Button><Button onClick={adjustHours}>Apply</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Status dialog */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Account Status — {selectedClient?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button><Button onClick={updateAccountStatus}>Update</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New client dialog */}
        <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add New Client</DialogTitle><DialogDescription>Create a new client organisation.</DialogDescription></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2"><Label>Client Name *</Label><Input value={newClientData.name} onChange={e => setNewClientData({ ...newClientData, name: e.target.value })} placeholder="Acme Corp" /></div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2"><Label>Contact Name</Label><Input value={newClientData.primary_contact_name} onChange={e => setNewClientData({ ...newClientData, primary_contact_name: e.target.value })} placeholder="Jane Doe" /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={newClientData.primary_contact_email} onChange={e => setNewClientData({ ...newClientData, primary_contact_email: e.target.value })} placeholder="jane@acme.com" /></div>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2"><Label>Phone</Label><Input value={newClientData.primary_contact_phone} onChange={e => setNewClientData({ ...newClientData, primary_contact_phone: e.target.value })} placeholder="+1 555-0123" /></div>
                <div className="space-y-2"><Label>Website</Label><Input value={newClientData.website} onChange={e => setNewClientData({ ...newClientData, website: e.target.value })} placeholder="https://acme.com" /></div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setNewClientOpen(false)}>Cancel</Button><Button onClick={createClient} disabled={isCreatingClient}>{isCreatingClient ? 'Creating...' : 'Create Client'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
