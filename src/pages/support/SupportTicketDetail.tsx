import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AssigneeSelect from '@/components/support/AssigneeSelect';
import {
  ArrowLeft, Send, Eye, User, MessageSquare, CalendarIcon, X, Clock, Plus, Pencil, Check as CheckIcon, FolderOpen,
} from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  sla_due_at: string | null;
  organization_id: string;
  assigned_to_user_id: string | null;
  created_by_user_id: string;
  organizations: { name: string } | null;
}

interface Message {
  id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  user_id: string;
  profiles?: { full_name: string | null; email: string } | null;
}

interface TimeLog {
  id: string;
  hours: number;
  description: string | null;
  logged_at: string;
  user_id: string;
  logger_name?: string;
}

const mockTicket: Ticket = {
  id: '1', title: 'Website not loading properly on mobile',
  description: 'The homepage is not rendering correctly on iOS devices.',
  status: 'open', created_at: new Date(Date.now() - 7200000).toISOString(),
  updated_at: new Date(Date.now() - 1800000).toISOString(),
  sla_due_at: new Date(Date.now() + 86400000).toISOString(),
  organization_id: '1', assigned_to_user_id: 'current-user',
  created_by_user_id: 'client-user', organizations: { name: 'Acme Corp' },
};

const mockMessages: Message[] = [
  { id: '1', message: 'The website isn\'t displaying correctly on my iPhone.', is_internal: false, created_at: new Date(Date.now() - 7200000).toISOString(), user_id: 'client-user', profiles: { full_name: 'John Client', email: 'john@acme.com' } },
  { id: '2', message: 'Thanks for reporting this! Looking into it now.', is_internal: false, created_at: new Date(Date.now() - 3600000).toISOString(), user_id: 'current-user', profiles: { full_name: 'Support Agent', email: 'agent@company.com' } },
];

const mockTimeLogs: TimeLog[] = [
  { id: 'tl1', hours: 1.5, description: 'Investigated mobile rendering issue', logged_at: new Date(Date.now() - 3600000).toISOString(), user_id: 'current-user', logger_name: 'Support Agent' },
  { id: 'tl2', hours: 0.5, description: 'Initial triage and reproduction', logged_at: new Date(Date.now() - 7200000).toISOString(), user_id: 'current-user', logger_name: 'Support Agent' },
];

export default function SupportTicketDetail() {
  const { ticketId } = useParams();
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [projectLink, setProjectLink] = useState<{ id: string; title: string | null } | null>(null);

  // Time log form state
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
  const [logHours, setLogHours] = useState('');
  const [logDescription, setLogDescription] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);

  // Inline edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  useEffect(() => {
    if (isPreviewMode) {
      setTicket(mockTicket);
      setMessages(mockMessages);
      setTimeLogs(mockTimeLogs);
      setProjectLink({ id: 'preview-1', title: 'Website Redesign' });
      setIsLoading(false);
    } else if (ticketId) {
      fetchTicketData();
    }
  }, [ticketId, isPreviewMode]);

  async function fetchTicketData() {
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(`id, title, description, status, created_at, updated_at, sla_due_at, organization_id, assigned_to_user_id, created_by_user_id, organizations (name)`)
        .eq('id', ticketId)
        .maybeSingle();
      if (ticketError) throw ticketError;
      if (ticketData) {
        setTicket(ticketData as unknown as Ticket);
        // Fetch active project for this org
        const today = new Date().toISOString().split('T')[0];
        const { data: alloc } = await supabase
          .from('hour_allocations')
          .select('id, title')
          .eq('organization_id', ticketData.organization_id)
          .lte('period_start', today)
          .gte('period_end', today)
          .limit(1)
          .maybeSingle();
        if (alloc) setProjectLink({ id: alloc.id, title: alloc.title });
      }

      const { data: messagesData } = await supabase
        .from('ticket_messages')
        .select(`id, message, is_internal, created_at, user_id, profiles (full_name, email)`)
        .eq('ticket_id', ticketId)
        .eq('is_internal', false)
        .order('created_at', { ascending: true });
      if (messagesData) setMessages(messagesData as unknown as Message[]);

      // Fetch time logs
      const { data: logsData } = await supabase
        .from('ticket_time_logs')
        .select('id, hours, description, logged_at, user_id')
        .eq('ticket_id', ticketId!)
        .order('logged_at', { ascending: false });

      if (logsData && logsData.length > 0) {
        const userIds = [...new Set(logsData.map(l => l.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name || 'Staff']));
        setTimeLogs(logsData.map(l => ({ ...l, logger_name: nameMap.get(l.user_id) || 'Staff' })));
      } else {
        setTimeLogs([]);
      }
    } catch (error) { console.error('Error:', error); toast.error('Failed to load ticket'); } finally { setIsLoading(false); }
  }

  async function sendMessage() {
    if (!newMessage.trim()) return;
    if (isPreviewMode) {
      setMessages([...messages, { id: Date.now().toString(), message: newMessage, is_internal: false, created_at: new Date().toISOString(), user_id: 'current-user', profiles: { full_name: 'Support Agent', email: 'agent@company.com' } }]);
      setNewMessage('');
      toast.success('Reply sent');
      return;
    }
    setIsSending(true);
    try {
      const { error } = await supabase.from('ticket_messages').insert({ ticket_id: ticketId, message: newMessage, is_internal: false, user_id: user?.id });
      if (error) throw error;
      setNewMessage('');
      toast.success('Reply sent');
      fetchTicketData();
    } catch (error) { toast.error('Failed to send message'); } finally { setIsSending(false); }
  }

  async function updateStatus(newStatus: string) {
    if (isPreviewMode) { setTicket(ticket ? { ...ticket, status: newStatus } : null); toast.success('Status updated'); return; }
    try {
      const { error } = await supabase.from('tickets').update({ status: newStatus as any }).eq('id', ticketId);
      if (error) throw error;
      toast.success('Status updated');
      fetchTicketData();
    } catch (error) { toast.error('Failed to update status'); }
  }

  async function saveTitle() {
    if (!editTitle.trim() || !ticket) return;
    if (isPreviewMode) { setTicket({ ...ticket, title: editTitle.trim() }); setIsEditingTitle(false); return; }
    try {
      const { error } = await supabase.from('tickets').update({ title: editTitle.trim() }).eq('id', ticket.id);
      if (error) throw error;
      setTicket({ ...ticket, title: editTitle.trim() });
      setIsEditingTitle(false);
    } catch { toast.error('Failed to update title'); }
  }

  async function saveDescription() {
    if (!ticket) return;
    const desc = editDesc.trim() || null;
    if (isPreviewMode) { setTicket({ ...ticket, description: desc }); setIsEditingDesc(false); return; }
    try {
      const { error } = await supabase.from('tickets').update({ description: desc }).eq('id', ticket.id);
      if (error) throw error;
      setTicket({ ...ticket, description: desc });
      setIsEditingDesc(false);
    } catch { toast.error('Failed to update description'); }
  }

  async function updateDueDate(date: Date | undefined) {
    const isoDate = date ? date.toISOString() : null;
    if (isPreviewMode) { setTicket(ticket ? { ...ticket, sla_due_at: isoDate } : null); toast.success(date ? 'Due date updated' : 'Due date removed'); return; }
    try {
      const { error } = await supabase.from('tickets').update({ sla_due_at: isoDate }).eq('id', ticketId);
      if (error) throw error;
      setTicket(ticket ? { ...ticket, sla_due_at: isoDate } : null);
      toast.success(date ? 'Due date updated' : 'Due date removed');
    } catch { toast.error('Failed to update due date'); }
  }

  function openAddLog() {
    setEditingLog(null);
    setLogHours('');
    setLogDescription('');
    setShowLogDialog(true);
  }

  function openEditLog(log: TimeLog) {
    setEditingLog(log);
    setLogHours(log.hours.toString());
    setLogDescription(log.description || '');
    setShowLogDialog(true);
  }

  async function saveTimeLog() {
    const hours = parseFloat(logHours);
    if (isNaN(hours) || hours <= 0) { toast.error('Enter valid hours'); return; }

    if (isPreviewMode) {
      if (editingLog) {
        setTimeLogs(timeLogs.map(l => l.id === editingLog.id ? { ...l, hours, description: logDescription || null } : l));
      } else {
        setTimeLogs([{ id: Date.now().toString(), hours, description: logDescription || null, logged_at: new Date().toISOString(), user_id: 'current-user', logger_name: 'Support Agent' }, ...timeLogs]);
      }
      setShowLogDialog(false);
      toast.success(editingLog ? 'Time entry updated' : 'Time logged');
      return;
    }

    setIsSavingLog(true);
    try {
      if (editingLog) {
        const { error } = await supabase.from('ticket_time_logs').update({ hours, description: logDescription || null }).eq('id', editingLog.id);
        if (error) throw error;
        toast.success('Time entry updated');
      } else {
        const { error } = await supabase.from('ticket_time_logs').insert({ ticket_id: ticketId!, hours, description: logDescription || null, user_id: user?.id! });
        if (error) throw error;
        toast.success('Time logged');
      }
      setShowLogDialog(false);
      fetchTicketData();
    } catch { toast.error('Failed to save time entry'); } finally { setIsSavingLog(false); }
  }

  const totalHours = timeLogs.reduce((sum, l) => sum + l.hours, 0);

  if (isLoading) {
    return <DashboardLayout role="support"><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div></DashboardLayout>;
  }

  if (!ticket) {
    return <DashboardLayout role="support"><div className="p-6 text-center"><p className="text-muted-foreground">Ticket not found</p><Button asChild className="mt-4"><Link to="/support/tickets">Back to Tickets</Link></Button></div></DashboardLayout>;
  }

  return (
    <DashboardLayout role="support">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button asChild variant="ghost" size="icon"><Link to="/support/tickets"><ArrowLeft className="h-5 w-5" /></Link></Button>
          {projectLink && (
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/client/hours/${projectLink.id}`}>
                <FolderOpen className="h-4 w-4 mr-1" />{projectLink.title || 'View Project'}
              </Link>
            </Button>
          )}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-lg font-bold" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setIsEditingTitle(false); }} />
                <Button size="icon" variant="ghost" onClick={saveTitle}><CheckIcon className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(false)}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-xl font-bold">{ticket.title}</h1>
                <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditTitle(ticket.title); setIsEditingTitle(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              <Link to={`/ops/clients/${ticket.organization_id}`} className="hover:text-primary hover:underline transition-colors">{ticket.organizations?.name}</Link>
              {' '}• Created {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal gap-2", !ticket.sla_due_at && "text-muted-foreground", ticket.sla_due_at && new Date(ticket.sla_due_at) < new Date() && "border-destructive text-destructive")}>
                  <CalendarIcon className="h-3.5 w-3.5" />{ticket.sla_due_at ? format(new Date(ticket.sla_due_at), 'MMM d, yyyy') : 'Set due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={ticket.sla_due_at ? new Date(ticket.sla_due_at) : undefined} onSelect={(date) => updateDueDate(date)} initialFocus className={cn("p-3 pointer-events-auto")} />
                {ticket.sla_due_at && <div className="p-2 border-t"><Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => updateDueDate(undefined)}><X className="h-3 w-3 mr-1" /> Remove due date</Button></div>}
              </PopoverContent>
            </Popover>
            <AssigneeSelect ticketId={ticket.id} currentAssigneeId={ticket.assigned_to_user_id} isPreviewMode={isPreviewMode} onAssigned={(userId) => { setTicket(ticket ? { ...ticket, assigned_to_user_id: userId } : null); }} />
            <Select value={ticket.status} onValueChange={(value) => updateStatus(value)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="waiting_on_client">Waiting on Client</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isPreviewMode && <Alert className="border-amber-500/50 bg-amber-500/10 mb-6"><Eye className="h-4 w-4" /><AlertDescription><strong>Preview Mode:</strong> Changes are simulated.</AlertDescription></Alert>}

        <div className="space-y-6 max-w-4xl">
          {/* Description */}
          {isEditingDesc ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} autoFocus />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveDescription}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingDesc(false)}>Cancel</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="group cursor-pointer" onClick={() => { setEditDesc(ticket.description || ''); setIsEditingDesc(true); }}>
              <CardHeader><CardTitle className="text-base flex items-center gap-2">Description <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{ticket.description || <span className="text-muted-foreground italic">No description — click to add one</span>}</p>
              </CardContent>
            </Card>
          )}

          {/* Time Tracking */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Clock className="h-5 w-5" />Time Logged</CardTitle>
                  <CardDescription>{timeLogs.length} {timeLogs.length === 1 ? 'entry' : 'entries'} · {totalHours.toFixed(1)}h total</CardDescription>
                </div>
                <Button size="sm" onClick={openAddLog}><Plus className="h-4 w-4 mr-1" />Log Time</Button>
              </div>
            </CardHeader>
            <CardContent>
              {timeLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No time logged yet.</p>
              ) : (
                <div className="space-y-2">
                  {timeLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{log.description || 'No description'}</p>
                        <p className="text-xs text-muted-foreground">{log.logger_name} · {new Date(log.logged_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <Badge variant="secondary" className="font-mono">{log.hours.toFixed(1)}h</Badge>
                        {log.user_id === (user?.id || 'current-user') && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditLog(log)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-5 w-5" />Conversation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No messages yet</p>
                ) : messages.map((msg) => (
                  <div key={msg.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2"><User className="h-4 w-4" /><span className="font-medium text-sm">{msg.profiles?.full_name || 'Unknown'}</span></div>
                      <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-3">
                <Label>Reply</Label>
                <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your reply..." rows={3} />
                <div className="flex justify-end">
                  <Button onClick={sendMessage} disabled={isSending || !newMessage.trim()}><Send className="h-4 w-4 mr-2" />Send Reply</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Log Time Dialog */}
        <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLog ? 'Edit Time Entry' : 'Log Time'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Hours</Label>
                <Input type="number" step="0.1" min="0.1" value={logHours} onChange={(e) => setLogHours(e.target.value)} placeholder="e.g. 1.5" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={logDescription} onChange={(e) => setLogDescription(e.target.value)} placeholder="What did you work on?" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLogDialog(false)}>Cancel</Button>
              <Button onClick={saveTimeLog} disabled={isSavingLog || !logHours}>{editingLog ? 'Update' : 'Log Time'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
