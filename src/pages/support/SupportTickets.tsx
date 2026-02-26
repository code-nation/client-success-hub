import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AssigneeSelect from '@/components/support/AssigneeSelect';
import {
  Ticket,
  Search,
  Clock,
  ChevronRight,
  Eye,
  Building2,
  Plus,
  Loader2,
  CalendarIcon,
  Paperclip,
  X,
  FileIcon,
  Activity,
  User,
} from 'lucide-react';

interface AssignedUser {
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface TicketWithOrg {
  id: string;
  title: string;
  status: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  sla_due_at: string | null;
  organization_id: string;
  assigned_to_user_id: string | null;
  organizations: { name: string } | null;
  assigned_user?: AssignedUser | null;
}

interface StaffProfile {
  user_id: string;
  full_name: string | null;
  email: string;
}

const mockTickets: TicketWithOrg[] = [
  { id: '1', title: 'Website not loading properly on mobile', status: 'open', category: null, created_at: new Date(Date.now() - 2 * 3600000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString(), sla_due_at: new Date(Date.now() + 86400000).toISOString(), organization_id: '1', assigned_to_user_id: null, organizations: { name: 'Acme Corp' }, assigned_user: null },
  { id: '2', title: 'Need help with email campaign setup', status: 'open', category: null, created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 7200000).toISOString(), sla_due_at: null, organization_id: '2', assigned_to_user_id: 'current-user', organizations: { name: 'TechStart Inc' }, assigned_user: { full_name: 'Sarah Chen', avatar_url: null, email: 'sarah@agency.com' } },
  { id: '3', title: 'SEO optimization questions', status: 'waiting_on_client', category: null, created_at: new Date(Date.now() - 3 * 86400000).toISOString(), updated_at: new Date(Date.now() - 43200000).toISOString(), sla_due_at: null, organization_id: '3', assigned_to_user_id: 'current-user', organizations: { name: 'Global Services' }, assigned_user: { full_name: 'Sarah Chen', avatar_url: null, email: 'sarah@agency.com' } },
  { id: '4', title: 'Monthly report request', status: 'closed', category: null, created_at: new Date(Date.now() - 7 * 86400000).toISOString(), updated_at: new Date(Date.now() - 2 * 86400000).toISOString(), sla_due_at: null, organization_id: '1', assigned_to_user_id: 'other-user', organizations: { name: 'Acme Corp' }, assigned_user: { full_name: 'Mike Johnson', avatar_url: null, email: 'mike@agency.com' } },
];

export default function SupportTickets() {
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<TicketWithOrg[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [clientFilter] = useState<string>(searchParams.get('client') || '');
  const [sortOrder, setSortOrder] = useState<string>('newest');
  const [showActivity, setShowActivity] = useState(false);

  // Staff profiles for employee filter
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);


  // New ticket on behalf of client
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [newTicket, setNewTicket] = useState({ org_id: '', title: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [newTicketDueDate, setNewTicketDueDate] = useState<Date | undefined>(undefined);
  const [newTicketAttachments, setNewTicketAttachments] = useState<File[]>([]);
  const newTicketFileRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_FILES = 5;

  useEffect(() => {
    if (isPreviewMode) {
      setTickets(mockTickets);
      setStaffProfiles([
        { user_id: 'current-user', full_name: 'Sarah Chen', email: 'sarah@agency.com' },
        { user_id: 'other-user', full_name: 'Mike Johnson', email: 'mike@agency.com' },
      ]);
      setIsLoading(false);
    } else if (user) {
      fetchTickets();
      fetchStaffProfiles();
    }
  }, [user, isPreviewMode]);

  useEffect(() => {
    if (showNewTicket && !isPreviewMode) {
      supabase.from('organizations').select('id, name').order('name').then(({ data }) => {
        if (data) setOrgs(data);
      });
    }
  }, [showNewTicket, isPreviewMode]);

  async function fetchStaffProfiles() {
    const { data: roles } = await supabase.from('user_roles').select('user_id').in('role', ['support', 'admin', 'ops']);
    if (roles && roles.length > 0) {
      const userIds = [...new Set(roles.map(r => r.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds);
      if (profiles) setStaffProfiles(profiles as StaffProfile[]);
    }
  }

  function handleNewTicketFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const valid: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name} exceeds 10MB limit`); continue; }
      if (newTicketAttachments.length + valid.length >= MAX_FILES) { toast.error(`Maximum ${MAX_FILES} files`); break; }
      valid.push(file);
    }
    setNewTicketAttachments(prev => [...prev, ...valid]);
    if (newTicketFileRef.current) newTicketFileRef.current.value = '';
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async function handleCreateTicket() {
    if (!newTicket.org_id || !newTicket.title || !newTicket.description) { toast.error('Please fill required fields'); return; }
    if (isPreviewMode) { toast.success('Preview: Ticket creation simulated'); setShowNewTicket(false); return; }
    setIsCreating(true);
    try {
      const { data, error } = await supabase.from('tickets').insert({
        organization_id: newTicket.org_id, created_by_user_id: user!.id, title: newTicket.title,
        description: newTicket.description, status: 'open', assigned_to_user_id: user!.id,
        sla_due_at: newTicketDueDate ? newTicketDueDate.toISOString() : null,
      }).select('id').single();
      if (error) throw error;
      if (newTicketAttachments.length > 0 && data) {
        for (const file of newTicketAttachments) {
          const filePath = `${user!.id}/${data.id}/${Date.now()}-${file.name}`;
          const { error: upErr } = await supabase.storage.from('ticket-attachments').upload(filePath, file);
          if (!upErr) { await supabase.from('ticket_attachments').insert({ ticket_id: data.id, file_name: file.name, file_path: filePath, file_size: file.size, content_type: file.type, uploaded_by_user_id: user!.id }); }
        }
      }
      toast.success('Ticket created');
      setShowNewTicket(false);
      setNewTicket({ org_id: '', title: '', description: '' });
      setNewTicketDueDate(undefined);
      setNewTicketAttachments([]);
      fetchTickets();
    } catch (err: any) { toast.error(err.message || 'Failed to create ticket'); } finally { setIsCreating(false); }
  }

  async function fetchTickets() {
    try {
      const { data, error } = await supabase.from('tickets')
        .select(`id, title, status, category, created_at, updated_at, sla_due_at, organization_id, assigned_to_user_id, organizations (name)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTickets((data as unknown as TicketWithOrg[]) || []);
    } catch (error) { console.error('Error fetching tickets:', error); toast.error('Failed to load tickets'); } finally { setIsLoading(false); }
  }


  const filteredTickets = tickets
    .filter(ticket => {
      const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) || ticket.organizations?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      let matchesEmployee = true;
      if (employeeFilter === 'unassigned') matchesEmployee = !ticket.assigned_to_user_id;
      else if (employeeFilter !== 'all') matchesEmployee = ticket.assigned_to_user_id === employeeFilter;
      const matchesClient = !clientFilter || ticket.organization_id === clientFilter;
      return matchesSearch && matchesStatus && matchesEmployee && matchesClient;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

      // Due date sorting: unassigned (no due date) first, then overdue, then soonest/latest
      const now = Date.now();
      const aDue = a.sla_due_at ? new Date(a.sla_due_at).getTime() : null;
      const bDue = b.sla_due_at ? new Date(b.sla_due_at).getTime() : null;

      // No due date = top
      if (!aDue && bDue) return -1;
      if (aDue && !bDue) return 1;
      if (!aDue && !bDue) return 0;

      const aOverdue = aDue! < now;
      const bOverdue = bDue! < now;

      // Overdue items come before non-overdue
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Both overdue or both not: sort by due date
      if (sortOrder === 'due_soonest') return aDue! - bDue!;
      return bDue! - aDue!; // due_latest
    });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      waiting_on_client: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      resolved: 'bg-muted text-muted-foreground',
      closed: 'bg-muted text-muted-foreground',
    };
    const labels: Record<string, string> = {
      open: 'Open', in_progress: 'Open', waiting_on_client: 'Waiting on Client', resolved: 'Closed', closed: 'Closed',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || ''}`}>{labels[status] || status}</span>;
  };

  const getTimeAgo = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  return (
    <DashboardLayout role="support">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ticket Queue</h1>
            <p className="text-muted-foreground">Manage and respond to support tickets</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={showActivity} onCheckedChange={setShowActivity} id="activity-toggle" />
              <Label htmlFor="activity-toggle" className="text-sm flex items-center gap-1 cursor-pointer">
                <Activity className="h-3.5 w-3.5" /> Activity
              </Label>
            </div>
            <Dialog open={showNewTicket} onOpenChange={setShowNewTicket}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />New Ticket</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Ticket on Behalf of Client</DialogTitle>
                  <DialogDescription>This ticket will be created and auto-assigned to you.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Client Organisation *</Label>
                    <Select value={newTicket.org_id} onValueChange={(v) => setNewTicket({ ...newTicket, org_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                      <SelectContent>
                        {isPreviewMode
                          ? [{ id: '1', name: 'Acme Corp' }, { id: '2', name: 'TechStart Inc' }].map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)
                          : orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Subject *</Label><Input placeholder="Brief description" value={newTicket.title} onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Description *</Label><Textarea placeholder="Provide details..." rows={4} value={newTicket.description} onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>Due Date (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newTicketDueDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />{newTicketDueDate ? format(newTicketDueDate, "PPP") : "Select a due date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={newTicketDueDate} onSelect={setNewTicketDueDate} disabled={(date) => date < new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Attachments (Optional)</Label>
                    <div className="border border-dashed border-border rounded-lg p-3">
                      <input ref={newTicketFileRef} type="file" multiple onChange={handleNewTicketFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" />
                      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => newTicketFileRef.current?.click()} disabled={newTicketAttachments.length >= MAX_FILES}>
                        <Paperclip className="h-4 w-4 mr-2" />{newTicketAttachments.length >= MAX_FILES ? `Max ${MAX_FILES}` : 'Add attachments'}
                      </Button>
                    </div>
                    {newTicketAttachments.length > 0 && (
                      <div className="space-y-1">
                        {newTicketAttachments.map((file, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                            <div className="flex items-center gap-2 min-w-0"><FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate">{file.name}</span><span className="text-xs text-muted-foreground shrink-0">({formatFileSize(file.size)})</span></div>
                            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => setNewTicketAttachments(prev => prev.filter((_, idx) => idx !== i))}><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setShowNewTicket(false)}>Cancel</Button>
                    <Button onClick={handleCreateTicket} disabled={isCreating}>{isCreating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Ticket'}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isPreviewMode && (
          <Alert className="border-amber-500/50 bg-amber-500/10"><Eye className="h-4 w-4" /><AlertDescription><strong>Preview Mode:</strong> Sample data shown.</AlertDescription></Alert>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search tickets or clients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tickets</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {staffProfiles.map(sp => (
                    <SelectItem key={sp.user_id} value={sp.user_id}>{sp.full_name || sp.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="waiting_on_client">Waiting on Client</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-[180px]"><Clock className="h-4 w-4 mr-2" /><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="due_soonest">Due Soonest</SelectItem>
                  <SelectItem value="due_latest">Due Latest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>


        {/* Activity Stream */}
        {showActivity && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Activity Stream</CardTitle>
              <CardDescription>Recent activity across all tickets</CardDescription>
            </CardHeader>
            <CardContent>
              {isPreviewMode ? (
                <div className="space-y-3">
                  {[
                    { action: 'replied to', ticket: 'Website not loading', user: 'Sarah Chen', time: '2h ago' },
                    { action: 'changed status to Waiting on Client on', ticket: 'SEO optimization questions', user: 'Sarah Chen', time: '5h ago' },
                    { action: 'was assigned to', ticket: 'Email campaign setup', user: 'Mike Johnson', time: '1d ago' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm p-2 rounded-md bg-muted/50">
                      <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <span className="font-medium">{item.user}</span>{' '}
                        <span className="text-muted-foreground">{item.action}</span>{' '}
                        <span className="font-medium">{item.ticket}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Activity stream shows recent comments, status changes, and assignments across tickets.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Ticket List */}
        <Card>
          <CardHeader>
            <CardTitle>{filteredTickets.length} {filteredTickets.length === 1 ? 'Ticket' : 'Tickets'}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No tickets match your filters</p></div>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                    <Link to={`/support/tickets/${ticket.id}`} className="flex-1 space-y-1">
                      <p className="font-medium">{ticket.title}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Link to={`/ops/clients/${ticket.organization_id}`} className="flex items-center gap-1 hover:text-primary hover:underline transition-colors" onClick={(e) => e.stopPropagation()}>
                          <Building2 className="h-3 w-3" />{ticket.organizations?.name}
                        </Link>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{getTimeAgo(ticket.created_at)}</span>
                        {ticket.sla_due_at && (() => {
                          const due = new Date(ticket.sla_due_at);
                          const isOverdue = due < new Date();
                          return (
                            <span className={cn("flex items-center gap-1 font-medium", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                              <CalendarIcon className="h-3 w-3" />{isOverdue ? 'Overdue · ' : 'Due '}{format(due, 'MMM d')}
                            </span>
                          );
                        })()}
                      </div>
                    </Link>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(ticket.status)}
                      <div onClick={(e) => e.preventDefault()}>
                        <AssigneeSelect
                          ticketId={ticket.id}
                          currentAssigneeId={ticket.assigned_to_user_id}
                          currentAssignee={ticket.assigned_user}
                          isPreviewMode={isPreviewMode}
                          compact
                          onAssigned={(userId, selectedUser) => {
                            setTickets(tickets.map(t => t.id === ticket.id ? { ...t, assigned_to_user_id: userId, assigned_user: selectedUser ? { full_name: selectedUser.full_name, avatar_url: selectedUser.avatar_url, email: selectedUser.email } : null } : t));
                          }}
                        />
                      </div>
                      <Link to={`/support/tickets/${ticket.id}`}><ChevronRight className="h-5 w-5 text-muted-foreground" /></Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
