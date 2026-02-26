import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Clock, Ticket, ChevronRight, CheckCircle2, Plus, Loader2 } from 'lucide-react';

interface HourAllocation {
  id: string;
  title: string | null;
  total_hours: number;
  used_hours: number;
  period_start: string;
  period_end: string;
}

interface TimeLog {
  id: string;
  hours: number;
  description: string | null;
  logged_at: string;
  ticket_id: string;
  ticket_title?: string;
  logger_name?: string;
}

interface TicketItem {
  id: string;
  title: string;
  status: string;
  sla_due_at: string | null;
  updated_at: string;
}

export default function ClientHoursPeriod() {
  const { allocationId } = useParams();
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const [allocation, setAllocation] = useState<HourAllocation | null>(null);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [projectTickets, setProjectTickets] = useState<TicketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ((user || isPreviewMode) && allocationId) fetchData();
  }, [user, isPreviewMode, allocationId]);

  useEffect(() => {
    if (user) {
      supabase.from('organization_members').select('organization_id').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        if (data) setOrgId(data.organization_id);
      });
    }
  }, [user]);

  const previewAllocations: Record<string, HourAllocation> = {
    'preview-1': { id: 'preview-1', title: 'Website Redesign', total_hours: 40, used_hours: 28.5, period_start: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0], period_end: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0] },
    'preview-2': { id: 'preview-2', title: 'Marketing Campaign', total_hours: 20, used_hours: 20, period_start: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0], period_end: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0] },
    'preview-3': { id: 'preview-3', title: 'API Integration', total_hours: 30, used_hours: 5, period_start: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0], period_end: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0] },
  };

  const previewTickets: Record<string, TicketItem[]> = {
    'preview-1': [
      { id: 't1', title: 'Website not loading on mobile', status: 'open', sla_due_at: new Date(Date.now() + 86400000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString() },
      { id: 't2', title: 'Update homepage hero section', status: 'in_progress', sla_due_at: null, updated_at: new Date(Date.now() - 7200000).toISOString() },
      { id: 't3', title: 'Fix navigation dropdown', status: 'closed', sla_due_at: null, updated_at: new Date(Date.now() - 86400000).toISOString() },
    ],
    'preview-2': [
      { id: 't4', title: 'Email campaign setup help', status: 'closed', sla_due_at: null, updated_at: new Date(Date.now() - 35 * 86400000).toISOString() },
      { id: 't5', title: 'Social media assets', status: 'closed', sla_due_at: null, updated_at: new Date(Date.now() - 40 * 86400000).toISOString() },
    ],
    'preview-3': [
      { id: 't6', title: 'Define API endpoints', status: 'open', sla_due_at: new Date(Date.now() + 5 * 86400000).toISOString(), updated_at: new Date(Date.now() - 3 * 86400000).toISOString() },
    ],
  };

  const previewLogs: Record<string, TimeLog[]> = {
    'preview-1': [
      { id: 'tl1', hours: 4.5, description: 'Responsive layout fixes for mobile breakpoints', logged_at: new Date(Date.now() - 2 * 86400000).toISOString(), ticket_id: 't1', ticket_title: 'Website not loading on mobile', logger_name: 'Sarah Chen' },
      { id: 'tl2', hours: 6.0, description: 'Hero section redesign and asset integration', logged_at: new Date(Date.now() - 4 * 86400000).toISOString(), ticket_id: 't2', ticket_title: 'Update homepage hero section', logger_name: 'Sarah Chen' },
      { id: 'tl3', hours: 3.0, description: 'Navigation dropdown implementation', logged_at: new Date(Date.now() - 6 * 86400000).toISOString(), ticket_id: 't3', ticket_title: 'Fix navigation dropdown', logger_name: 'Mike Johnson' },
      { id: 'tl4', hours: 8.0, description: 'Initial wireframes and design review', logged_at: new Date(Date.now() - 10 * 86400000).toISOString(), ticket_id: 't1', ticket_title: 'Website not loading on mobile', logger_name: 'Sarah Chen' },
      { id: 'tl5', hours: 7.0, description: 'Content migration and page setup', logged_at: new Date(Date.now() - 12 * 86400000).toISOString(), ticket_id: 't2', ticket_title: 'Update homepage hero section', logger_name: 'Sarah Chen' },
    ],
    'preview-2': [
      { id: 'tl6', hours: 10.0, description: 'Campaign strategy and email template design', logged_at: new Date(Date.now() - 45 * 86400000).toISOString(), ticket_id: 't4', ticket_title: 'Email campaign setup help', logger_name: 'Sarah Chen' },
      { id: 'tl7', hours: 10.0, description: 'Social media graphics and A/B testing', logged_at: new Date(Date.now() - 35 * 86400000).toISOString(), ticket_id: 't5', ticket_title: 'Social media assets', logger_name: 'Mike Johnson' },
    ],
    'preview-3': [
      { id: 'tl8', hours: 5.0, description: 'API specification and endpoint documentation', logged_at: new Date(Date.now() - 3 * 86400000).toISOString(), ticket_id: 't6', ticket_title: 'Define API endpoints', logger_name: 'Sarah Chen' },
    ],
  };

  async function fetchData() {
    try {
      if (isPreviewMode && allocationId && previewAllocations[allocationId]) {
        setAllocation(previewAllocations[allocationId]);
        setProjectTickets(previewTickets[allocationId] || []);
        setLogs(previewLogs[allocationId] || []);
        setIsLoading(false);
        return;
      }

      const { data: allocData } = await supabase
        .from('hour_allocations')
        .select('id, title, total_hours, used_hours, period_start, period_end')
        .eq('id', allocationId!)
        .maybeSingle();

      if (!allocData) {
        setIsLoading(false);
        return;
      }
      setAllocation(allocData as HourAllocation);

      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user?.id)
        .maybeSingle();
      const orgId = membership?.organization_id || null;

      if (orgId) {
        const { data: tickets } = await supabase
          .from('tickets')
          .select('id, title, status, sla_due_at, updated_at')
          .eq('organization_id', orgId);

        if (tickets) {
          setProjectTickets(tickets as TicketItem[]);
          const ticketIds = tickets.map(t => t.id);
          const titleMap = new Map(tickets.map(t => [t.id, t.title]));

          if (ticketIds.length > 0) {
            const { data: timeLogs } = await supabase
              .from('ticket_time_logs')
              .select('id, hours, description, logged_at, ticket_id, user_id')
              .in('ticket_id', ticketIds)
              .gte('logged_at', allocData.period_start)
              .lte('logged_at', allocData.period_end + 'T23:59:59')
              .order('logged_at', { ascending: false });

            if (timeLogs) {
              const userIds = [...new Set(timeLogs.map(l => l.user_id))];
              const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, full_name')
                .in('user_id', userIds);
              const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name || 'Staff']));

              setLogs(timeLogs.map(l => ({
                ...l,
                ticket_title: titleMap.get(l.ticket_id) || 'Unknown ticket',
                logger_name: nameMap.get(l.user_id) || 'Staff',
              })));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching period data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function createTask() {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    if (isPreviewMode) {
      await new Promise(r => setTimeout(r, 500));
      const newTicket: TicketItem = { id: `t-new-${Date.now()}`, title: newTitle, status: 'open', sla_due_at: null, updated_at: new Date().toISOString() };
      setProjectTickets(prev => [newTicket, ...prev]);
      toast({ title: 'Task created', description: 'New task has been added.' });
      setShowNewTask(false); setNewTitle(''); setNewDesc(''); setIsCreating(false);
      return;
    }
    if (!orgId || !user) { toast({ title: 'Error', description: 'Unable to create task.', variant: 'destructive' }); setIsCreating(false); return; }
    try {
      const { data, error } = await supabase.from('tickets').insert({
        organization_id: orgId,
        created_by_user_id: user.id,
        title: newTitle,
        description: newDesc || null,
        status: 'open',
      }).select('id, title, status, sla_due_at, updated_at').single();
      if (error) throw error;
      setProjectTickets(prev => [data as TicketItem, ...prev]);
      toast({ title: 'Task created', description: 'New task has been added.' });
      setShowNewTask(false); setNewTitle(''); setNewDesc('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create task', variant: 'destructive' });
    } finally { setIsCreating(false); }
  }

  const formatDateRange = (start: string, end: string) =>
    `${new Date(start).toLocaleDateString()} — ${new Date(end).toLocaleDateString()}`;

  const hoursPercent = allocation ? (allocation.used_hours / allocation.total_hours) * 100 : 0;

  const ticketStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      open: { variant: 'default', label: 'Open' },
      in_progress: { variant: 'default', label: 'Open' },
      waiting_on_client: { variant: 'outline', label: 'Waiting on You' },
      resolved: { variant: 'secondary', label: 'Done' },
      closed: { variant: 'secondary', label: 'Done' },
    };
    const { variant, label } = config[status] || { variant: 'default' as const, label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout role="client">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!allocation) {
    return (
      <DashboardLayout role="client">
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Project not found.</p>
          <Button asChild className="mt-4"><Link to="/client/hours">Back to Projects</Link></Button>
        </div>
      </DashboardLayout>
    );
  }

  const heading = allocation.title || formatDateRange(allocation.period_start, allocation.period_end);
  const openTasks = projectTickets.filter(t => ['open', 'in_progress', 'waiting_on_client'].includes(t.status));
  const completedTasks = projectTickets.filter(t => ['resolved', 'closed'].includes(t.status));

  return (
    <DashboardLayout role="client">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/client/hours"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{heading}</h1>
            {allocation.title && (
              <p className="text-muted-foreground">
                {formatDateRange(allocation.period_start, allocation.period_end)}
              </p>
            )}
          </div>
        </div>

        {/* Period summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Hours</span>
              </div>
              <p className="text-2xl font-bold">{allocation.used_hours.toFixed(1)} / {allocation.total_hours}h</p>
            </div>
            <Progress value={hoursPercent} className={`h-3 ${hoursPercent > 85 ? '[&>div]:bg-destructive' : ''}`} />
            <p className="text-xs text-muted-foreground mt-1">
              {(allocation.total_hours - allocation.used_hours).toFixed(1)}h remaining ({hoursPercent.toFixed(0)}% used)
            </p>
          </CardContent>
        </Card>

        {/* Open Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Open Tasks</CardTitle>
              <CardDescription>{openTasks.length} active task{openTasks.length !== 1 ? 's' : ''} in this project</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowNewTask(true)}><Plus className="h-4 w-4 mr-1" />New Task</Button>
          </CardHeader>
          <CardContent>
            {openTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No open tasks — all caught up!</p>
            ) : (
              <div className="space-y-2">
                {openTasks.map((ticket) => (
                  <Link
                    key={ticket.id}
                    to={`/client/tickets/${ticket.id}`}
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

        {/* Completed Tasks */}
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
                        to={`/client/tickets/${ticket.id}`}
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
                              <Badge variant="secondary" className="text-xs font-mono shrink-0 ml-2">{log.hours.toFixed(1)}h</Badge>
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

        <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Task</DialogTitle>
              <DialogDescription>Create a new task in this project.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-task-title">Title *</Label>
                <Input id="new-task-title" placeholder="Brief description of the task" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-task-desc">Description</Label>
                <Textarea id="new-task-desc" placeholder="Additional details (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={4} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewTask(false)}>Cancel</Button>
              <Button onClick={createTask} disabled={isCreating || !newTitle.trim()}>
                {isCreating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Task'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
