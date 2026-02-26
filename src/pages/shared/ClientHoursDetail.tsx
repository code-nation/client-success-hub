import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Eye, Pencil, Ticket, Save, Loader2, FolderKanban, ChevronRight, CheckCircle2 } from 'lucide-react';

interface TimeLog {
  id: string;
  hours: number;
  description: string | null;
  logged_at: string;
  ticket_id: string;
  user_id: string;
  ticket_title?: string;
  logger_name?: string;
}

interface Allocation {
  id: string;
  total_hours: number;
  used_hours: number;
  period_start: string;
  period_end: string;
  agreed_hourly_rate: number | null;
  notes: string | null;
  title: string | null;
}

interface TicketItem {
  id: string;
  title: string;
  status: string;
  sla_due_at: string | null;
  updated_at: string;
}

const mockLogs: TimeLog[] = [
  { id: '1', hours: 2.5, description: 'Frontend debugging and fixes', logged_at: new Date(Date.now() - 2 * 86400000).toISOString(), ticket_id: 't1', user_id: 'u1', ticket_title: 'Website not loading on mobile', logger_name: 'Sarah Chen' },
  { id: '2', hours: 1.0, description: 'Email template setup', logged_at: new Date(Date.now() - 3 * 86400000).toISOString(), ticket_id: 't2', user_id: 'u1', ticket_title: 'Email campaign setup', logger_name: 'Sarah Chen' },
  { id: '3', hours: 3.0, description: 'SEO audit and recommendations', logged_at: new Date(Date.now() - 5 * 86400000).toISOString(), ticket_id: 't3', user_id: 'u2', ticket_title: 'SEO optimization', logger_name: 'Mike Johnson' },
  { id: '4', hours: 0.5, description: 'Quick follow-up call', logged_at: new Date(Date.now() - 6 * 86400000).toISOString(), ticket_id: 't1', user_id: 'u1', ticket_title: 'Website not loading on mobile', logger_name: 'Sarah Chen' },
];

const mockAllocation: Allocation = {
  id: '1', total_hours: 40, used_hours: 28,
  period_start: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
  period_end: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
  agreed_hourly_rate: 150, notes: null, title: 'Website Redesign',
};

const mockTickets: TicketItem[] = [
  { id: 't1', title: 'Website not loading on mobile', status: 'open', sla_due_at: new Date(Date.now() + 86400000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 't2', title: 'Email campaign setup', status: 'waiting_on_client', sla_due_at: null, updated_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 't3', title: 'SEO optimization', status: 'closed', sla_due_at: null, updated_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 't4', title: 'Social media assets for Q1', status: 'open', sla_due_at: new Date(Date.now() + 3 * 86400000).toISOString(), updated_at: new Date(Date.now() - 43200000).toISOString() },
  { id: 't5', title: 'Analytics dashboard review', status: 'in_progress', sla_due_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 7200000).toISOString() },
];

export default function ClientHoursDetail() {
  const { orgId, allocationId } = useParams();
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();

  const [orgName, setOrgName] = useState('');
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [projectTickets, setProjectTickets] = useState<TicketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit time log state
  const [editLog, setEditLog] = useState<TimeLog | null>(null);
  const [editHours, setEditHours] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Edit allocation total hours state
  const [isEditingAlloc, setIsEditingAlloc] = useState(false);
  const [allocTotalHours, setAllocTotalHours] = useState('');
  const [isSavingAlloc, setIsSavingAlloc] = useState(false);

  const isScopedToProject = !!allocationId;

  useEffect(() => {
    if (isPreviewMode) {
      setOrgName('Acme Corp');
      setLogs(mockLogs);
      setAllocation(mockAllocation);
      setProjectTickets(mockTickets);
      setIsLoading(false);
    } else if (orgId) {
      fetchData();
    }
  }, [orgId, allocationId, isPreviewMode]);

  async function fetchData() {
    try {
      const [orgRes, allocRes] = await Promise.all([
        supabase.from('organizations').select('name').eq('id', orgId!).maybeSingle(),
        isScopedToProject
          ? supabase.from('hour_allocations').select('*').eq('id', allocationId!).maybeSingle()
          : supabase.from('hour_allocations').select('*').eq('organization_id', orgId!).order('period_start', { ascending: false }).limit(1),
      ]);

      if (orgRes.data) setOrgName(orgRes.data.name);

      const allocData = isScopedToProject ? allocRes.data : allocRes.data?.[0] ?? allocRes.data;
      if (allocData) setAllocation(allocData as unknown as Allocation);

      // Fetch all tickets for this org (we'll filter time logs by period if scoped)
      const { data: tickets } = await supabase
        .from('tickets')
        .select('id, title, status, sla_due_at, updated_at')
        .eq('organization_id', orgId!);

      if (tickets && tickets.length > 0) {
        const ticketIds = tickets.map(t => t.id);
        const titleMap = new Map(tickets.map(t => [t.id, t.title]));
        const statusMap = new Map(tickets.map(t => [t.id, t.status]));
        const ticketMap = new Map(tickets.map(t => [t.id, t]));

        let query = supabase
          .from('ticket_time_logs')
          .select('*')
          .in('ticket_id', ticketIds)
          .order('logged_at', { ascending: false });

        // If scoped to a project, filter time logs within the allocation period
        if (isScopedToProject && allocData) {
          const alloc = allocData as unknown as Allocation;
          query = query.gte('logged_at', alloc.period_start).lte('logged_at', alloc.period_end + 'T23:59:59Z');
        }

        const { data: timeLogs } = await query;

        if (timeLogs) {
          const userIds = [...new Set(timeLogs.map(l => l.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);
          const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name || p.user_id]));

          setLogs(timeLogs.map(l => ({
            ...l,
            ticket_title: titleMap.get(l.ticket_id) || 'Unknown ticket',
            logger_name: nameMap.get(l.user_id) || 'Unknown',
          })));

          // Set project tickets — all org tickets (not just ones with logs)
          if (isScopedToProject) {
            setProjectTickets(tickets.map(t => ({
              id: t.id,
              title: t.title,
              status: t.status,
              sla_due_at: t.sla_due_at,
              updated_at: t.updated_at,
            })));
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load hours data');
    } finally {
      setIsLoading(false);
    }
  }

  function openEdit(log: TimeLog) {
    setEditLog(log);
    setEditHours(log.hours.toString());
    setEditDesc(log.description || '');
  }

  async function saveEdit() {
    if (!editLog) return;
    const newHours = parseFloat(editHours);
    if (isNaN(newHours) || newHours <= 0) { toast.error('Please enter valid hours'); return; }
    if (isPreviewMode) {
      setLogs(prev => prev.map(l => l.id === editLog.id ? { ...l, hours: newHours, description: editDesc || null } : l));
      setEditLog(null);
      toast.success('Time log updated (preview)');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('ticket_time_logs').update({ hours: newHours, description: editDesc || null }).eq('id', editLog.id);
      if (error) throw error;
      toast.success('Time log updated');
      setEditLog(null);
      fetchData();
    } catch (err: any) { toast.error(err.message || 'Failed to update'); } finally { setIsSaving(false); }
  }

  async function saveAllocTotalHours() {
    if (!allocation) return;
    const newTotal = parseFloat(allocTotalHours);
    if (isNaN(newTotal) || newTotal <= 0) { toast.error('Please enter valid hours'); return; }
    if (isPreviewMode) {
      setAllocation({ ...allocation, total_hours: newTotal });
      setIsEditingAlloc(false);
      toast.success('Total hours updated (preview)');
      return;
    }
    setIsSavingAlloc(true);
    try {
      const { error } = await supabase.from('hour_allocations').update({ total_hours: newTotal }).eq('id', allocation.id);
      if (error) throw error;
      setAllocation({ ...allocation, total_hours: newTotal });
      setIsEditingAlloc(false);
      toast.success('Total hours updated');
    } catch { toast.error('Failed to update total hours'); } finally { setIsSavingAlloc(false); }
  }

  const totalLogged = logs.reduce((s, l) => s + l.hours, 0);
  const hoursPercent = allocation ? (allocation.used_hours / allocation.total_hours) * 100 : 0;
  const backPath = `/ops/clients/${orgId}?section=projects`;

  const ticketStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      open: { variant: 'default', label: 'Open' },
      in_progress: { variant: 'default', label: 'Open' },
      waiting_on_client: { variant: 'outline', label: 'Waiting on Client' },
      resolved: { variant: 'secondary', label: 'Closed' },
      closed: { variant: 'secondary', label: 'Closed' },
    };
    const { variant, label } = config[status] || { variant: 'default' as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout role="ops">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="ops">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to={backPath}><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              {isScopedToProject ? <FolderKanban className="h-5 w-5 text-muted-foreground" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
              <h1 className="text-2xl font-bold">{isScopedToProject && allocation?.title ? allocation.title : 'Hours & Time Logs'}</h1>
            </div>
            <p className="text-muted-foreground">{orgName}</p>
          </div>
        </div>

        {isPreviewMode && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <Eye className="h-4 w-4" />
            <AlertDescription><strong>Preview Mode:</strong> Sample data shown.</AlertDescription>
          </Alert>
        )}

        {/* Allocation summary */}
        {allocation && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">{isScopedToProject ? 'Project Period' : 'Current Period'}</p>
                  <p className="font-medium">
                    {new Date(allocation.period_start).toLocaleDateString()} — {new Date(allocation.period_end).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-2xl font-bold">{allocation.used_hours.toFixed(1)} / {allocation.total_hours}h</p>
                    {allocation.agreed_hourly_rate && (
                      <p className="text-sm text-muted-foreground">${allocation.agreed_hourly_rate}/hr</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setAllocTotalHours(allocation.total_hours.toString()); setIsEditingAlloc(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Progress value={hoursPercent} className={`h-3 ${hoursPercent > 85 ? '[&>div]:bg-destructive' : ''}`} />
              <p className="text-xs text-muted-foreground mt-1">
                {(allocation.total_hours - allocation.used_hours).toFixed(1)}h remaining ({hoursPercent.toFixed(0)}% used)
              </p>
            </CardContent>
          </Card>
        )}

        {/* Open Tasks */}
        {isScopedToProject && (() => {
          const openTasks = projectTickets.filter(t => ['open', 'in_progress', 'waiting_on_client'].includes(t.status));
          const completedTasks = projectTickets.filter(t => ['resolved', 'closed'].includes(t.status));
          return (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Open Tasks</CardTitle>
                  <CardDescription>{openTasks.length} active task{openTasks.length !== 1 ? 's' : ''} in this project</CardDescription>
                </CardHeader>
                <CardContent>
                  {openTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No open tasks — all caught up!</p>
                  ) : (
                    <div className="space-y-2">
                      {openTasks.map((ticket) => (
                        <Link
                          key={ticket.id}
                          to={`/support/tickets/${ticket.id}`}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Ticket className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <span className="text-sm font-medium truncate block">{ticket.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {ticket.sla_due_at ? (
                                  new Date(ticket.sla_due_at) < new Date()
                                    ? <span className="text-destructive font-medium">Overdue — was due {new Date(ticket.sla_due_at).toLocaleDateString()}</span>
                                    : <>Due {new Date(ticket.sla_due_at).toLocaleDateString()}</>
                                ) : 'No due date'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4 shrink-0">
                            {ticketStatusBadge(ticket.status)}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {completedTasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      Completed Tasks
                    </CardTitle>
                    <CardDescription>{completedTasks.length} completed task{completedTasks.length !== 1 ? 's' : ''}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {completedTasks.map((ticket) => {
                        const taskLogs = logs.filter(l => l.ticket_id === ticket.id);
                        return (
                          <div key={ticket.id} className="border rounded-lg overflow-hidden opacity-75">
                            <Link
                              to={`/support/tickets/${ticket.id}`}
                              className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Ticket className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium truncate">{ticket.title}</span>
                              </div>
                              <div className="flex items-center gap-2 ml-4 shrink-0">
                                {ticketStatusBadge(ticket.status)}
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </Link>
                            {taskLogs.length > 0 && (
                              <div className="border-t bg-muted/30 px-3 py-2 space-y-1">
                                {taskLogs.map((log) => (
                                  <div key={log.id} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <span className="text-muted-foreground truncate">{log.description || 'No description'}</span>
                                      <span className="text-muted-foreground shrink-0">· {log.logger_name} · {new Date(log.logged_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                      <Badge variant="secondary" className="text-xs font-mono">{log.hours.toFixed(1)}h</Badge>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(log)}>
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          );
        })()}

        {/* Edit time log dialog */}
        <Dialog open={!!editLog} onOpenChange={(open) => !open && setEditLog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Edit Time Log</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Hours</Label>
                <Input type="number" step="0.25" min="0.25" value={editHours} onChange={(e) => setEditHours(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} placeholder="What was done..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditLog(null)}>Cancel</Button>
                <Button onClick={saveEdit} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit allocation total hours dialog */}
        <Dialog open={isEditingAlloc} onOpenChange={(open) => !open && setIsEditingAlloc(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Update Total Hours</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Total Hours Available</Label>
                <Input type="number" step="1" min="1" value={allocTotalHours} onChange={(e) => setAllocTotalHours(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditingAlloc(false)}>Cancel</Button>
                <Button onClick={saveAllocTotalHours} disabled={isSavingAlloc}>
                  {isSavingAlloc ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
