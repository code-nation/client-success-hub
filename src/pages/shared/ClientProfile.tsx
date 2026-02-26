import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { mockOrganizations, mockHourAllocations, mockTickets as allMockTickets } from '@/lib/mockData';
import {
  ArrowLeft,
  Building2,
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  Eye,
  Globe,
  Mail,
  Phone,
  Plus,
  Save,
  Ticket,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pencil,
  Loader2,
  ChevronRight,
  FolderKanban,
  Filter,
  UserPlus,
  Trash2,
} from 'lucide-react';

type Section = 'overview' | 'projects' | 'tickets' | 'subscriptions';

interface OrgDetails {
  id: string;
  name: string;
  account_status: string;
  website: string | null;
  notes: string | null;
  payment_overdue_since: string | null;
  billing_email: string | null;
  billing_address: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  stripe_customer_id: string | null;
}

interface HourAllocation {
  id: string;
  total_hours: number;
  used_hours: number;
  period_start: string;
  period_end: string;
  agreed_hourly_rate: number | null;
  title: string | null;
  notes: string | null;
}

interface TicketItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface StripeSubscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  items: Array<{
    price_amount: number | null;
    price_currency: string;
    price_interval: string | null;
    product_name: string | null;
  }>;
}

interface StripeInvoice {
  id: string;
  number: string | null;
  status: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  created: string;
  due_date: string | null;
  hosted_invoice_url: string | null;
}

// Mock data
// Build mock data per org from centralized data
function getMockOrgData(id: string) {
  const org = mockOrganizations.find(o => o.id === id) ?? mockOrganizations[0];
  return {
    org: {
      id: org.id, name: org.name, account_status: org.account_status, website: org.website,
      notes: org.notes, payment_overdue_since: org.payment_overdue_since,
      billing_email: org.billing_email, billing_address: org.billing_address,
      primary_contact_name: org.primary_contact_name, primary_contact_email: org.primary_contact_email,
      primary_contact_phone: org.primary_contact_phone, stripe_customer_id: org.stripe_customer_id,
    } as OrgDetails,
    allocations: mockHourAllocations
      .filter(a => a.organization_id === org.id)
      .map(a => ({ id: a.id, total_hours: a.total_hours, used_hours: a.used_hours, period_start: a.period_start, period_end: a.period_end, agreed_hourly_rate: a.agreed_hourly_rate, title: a.title, notes: a.notes })) as HourAllocation[],
    tickets: allMockTickets
      .filter(t => t.organization_id === org.id)
      .map(t => ({ id: t.id, title: t.title, status: t.status, created_at: t.created_at, updated_at: t.updated_at })) as TicketItem[],
    subscriptions: [{
      id: `sub_${org.id}`, status: 'active',
      current_period_start: new Date(Date.now() - 10 * 86400000).toISOString(),
      current_period_end: new Date(Date.now() + 20 * 86400000).toISOString(),
      cancel_at_period_end: false,
      items: [{ price_amount: 299900, price_currency: 'usd', price_interval: 'month', product_name: 'Retainer — Pro Plan' }],
    }] as StripeSubscription[],
    invoices: [
      { id: `inv_${org.id}_1`, number: `INV-${String(40 + parseInt(org.id)).padStart(4, '0')}`, status: 'paid', amount_due: 299900, amount_paid: 299900, currency: 'usd', created: new Date(Date.now() - 10 * 86400000).toISOString(), due_date: null, hosted_invoice_url: '#' },
      { id: `inv_${org.id}_2`, number: `INV-${String(39 + parseInt(org.id)).padStart(4, '0')}`, status: 'paid', amount_due: 299900, amount_paid: 299900, currency: 'usd', created: new Date(Date.now() - 40 * 86400000).toISOString(), due_date: null, hosted_invoice_url: '#' },
    ] as StripeInvoice[],
  };
}

interface ClientProfileProps {
  role: 'support' | 'admin' | 'ops';
}

export default function ClientProfile({ role }: ClientProfileProps) {
  const { orgId } = useParams();
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeSection = (searchParams.get('section') as Section) || 'overview';
  const setActiveSection = (s: Section) => setSearchParams({ section: s });

  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [allocations, setAllocations] = useState<HourAllocation[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<StripeSubscription[]>([]);
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
  const [hasStripe, setHasStripe] = useState(false);
  const [ticketStats, setTicketStats] = useState({ total: 0, open: 0, closed: 0 });
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Team members
  const [members, setMembers] = useState<{ id: string; user_id: string; email: string; full_name: string | null; is_primary_contact: boolean | null }[]>([]);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);


  // New project form
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', total_hours: '', hourly_rate: '', period_start: '', period_end: '' });
  const [isSavingNewProject, setIsSavingNewProject] = useState(false);

  // Edit client details
  const [showEditClient, setShowEditClient] = useState(false);
  const [editClient, setEditClient] = useState({ name: '', website: '', primary_contact_name: '', primary_contact_email: '', primary_contact_phone: '', billing_email: '', billing_address: '', notes: '', account_status: '' });
  const [isSavingClient, setIsSavingClient] = useState(false);

  // Edit project details
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [editProject, setEditProject] = useState({ title: '', total_hours: '', hourly_rate: '', period_start: '', period_end: '', notes: '' });
  const [isSavingProject, setIsSavingProject] = useState(false);

  useEffect(() => {
    if (isPreviewMode) {
      const data = getMockOrgData(orgId ?? '1');
      setOrg(data.org);
      setAllocations(data.allocations);
      setTickets(data.tickets);
      setSubscriptions(data.subscriptions);
      setInvoices(data.invoices);
      setHasStripe(true);
      const openCount = data.tickets.filter(t => ['open', 'in_progress', 'waiting_on_client'].includes(t.status)).length;
      const closedCount = data.tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;
      setTicketStats({ total: data.tickets.length, open: openCount, closed: closedCount });
      setMembers([
        { id: 'm1', user_id: 'client-u1', email: data.org.primary_contact_email ?? 'contact@client.com', full_name: data.org.primary_contact_name, is_primary_contact: true },
        { id: 'm2', user_id: 'client-u2', email: `accounts@${data.org.website?.replace('https://', '') ?? 'client.com'}`, full_name: null, is_primary_contact: false },
      ]);
      setIsLoading(false);
    } else if (orgId) {
      fetchAll();
    }
  }, [orgId, isPreviewMode]);

  async function fetchAll() {
    try {
      const [orgRes, allocRes, ticketRes, membersRes] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', orgId!).maybeSingle(),
        supabase.from('hour_allocations').select('*').eq('organization_id', orgId!).order('period_start', { ascending: false }).limit(10),
        supabase.from('tickets').select('id, title, status, created_at, updated_at').eq('organization_id', orgId!).order('created_at', { ascending: false }),
        supabase.from('organization_members').select('id, user_id, is_primary_contact').eq('organization_id', orgId!),
      ]);

      if (orgRes.data) {
        setOrg(orgRes.data as unknown as OrgDetails);
      }
      if (allocRes.data) setAllocations(allocRes.data as unknown as HourAllocation[]);
      if (ticketRes.data) {
        const all = ticketRes.data as unknown as TicketItem[];
        setTickets(all);
        setTicketStats({
          total: all.length,
          open: all.filter(t => ['open', 'in_progress'].includes(t.status)).length,
          closed: all.filter(t => ['resolved', 'closed'].includes(t.status)).length,
        });
      }

      // Fetch member profiles
      if (membersRes.data && membersRes.data.length > 0) {
        const userIds = membersRes.data.map(m => m.user_id);
        const { data: profiles } = await supabase.from('profiles').select('user_id, email, full_name').in('user_id', userIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        setMembers(membersRes.data.map(m => {
          const p = profileMap.get(m.user_id);
          return { id: m.id, user_id: m.user_id, email: p?.email || '', full_name: p?.full_name || null, is_primary_contact: m.is_primary_contact };
        }));
      }

      // Fetch Stripe billing data
      try {
        const { data: billingData } = await supabase.functions.invoke('client-billing', {
          body: { organization_id: orgId },
        });
        if (billingData) {
          setSubscriptions(billingData.subscriptions || []);
          setInvoices(billingData.invoices || []);
          setHasStripe(billingData.has_stripe || false);
        }
      } catch {
        console.log('Billing data unavailable');
      }
    } catch (err) {
      console.error('Error fetching client profile:', err);
      toast.error('Failed to load client profile');
    } finally {
      setIsLoading(false);
    }
  }

  async function addMember() {
    if (!addMemberEmail.trim() || !org) return;
    if (isPreviewMode) {
      setMembers(prev => [...prev, { id: `m-${Date.now()}`, user_id: `u-${Date.now()}`, email: addMemberEmail.trim(), full_name: null, is_primary_contact: false }]);
      setAddMemberEmail('');
      toast.success('Member added');
      return;
    }
    setIsAddingMember(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('user_id, email, full_name').eq('email', addMemberEmail.trim()).maybeSingle();
      if (!profile) { toast.error('No user found with that email. They must sign up first.'); setIsAddingMember(false); return; }
      const existing = members.find(m => m.user_id === profile.user_id);
      if (existing) { toast.error('User is already a member of this organisation.'); setIsAddingMember(false); return; }
      const { data: inserted, error } = await supabase.from('organization_members').insert({ organization_id: org.id, user_id: profile.user_id }).select('id, user_id, is_primary_contact').single();
      if (error) throw error;
      await supabase.from('user_roles').upsert({ user_id: profile.user_id, role: 'client' as any }, { onConflict: 'user_id,role' }).select();
      setMembers(prev => [...prev, { id: inserted.id, user_id: inserted.user_id, email: profile.email, full_name: profile.full_name, is_primary_contact: inserted.is_primary_contact }]);
      setAddMemberEmail('');
      toast.success('Member added');
    } catch (err: any) { toast.error(err.message || 'Failed to add member'); } finally { setIsAddingMember(false); }
  }

  async function removeMember(memberId: string) {
    if (isPreviewMode) { setMembers(prev => prev.filter(m => m.id !== memberId)); toast.success('Member removed'); return; }
    try {
      const { error } = await supabase.from('organization_members').delete().eq('id', memberId);
      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Member removed');
    } catch { toast.error('Failed to remove member'); }
  }

  async function createProject() {
    if (!org) return;
    const hours = parseFloat(newProject.total_hours);
    if (!newProject.title.trim() || isNaN(hours) || hours <= 0 || !newProject.period_start || !newProject.period_end) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (isPreviewMode) {
      const fakeAlloc: HourAllocation = {
        id: crypto.randomUUID(),
        title: newProject.title,
        total_hours: hours,
        used_hours: 0,
        period_start: newProject.period_start,
        period_end: newProject.period_end,
        agreed_hourly_rate: newProject.hourly_rate ? parseFloat(newProject.hourly_rate) : null,
        notes: null,
      };
      setAllocations(prev => [fakeAlloc, ...prev]);
      setShowNewProject(false);
      setNewProject({ title: '', total_hours: '', hourly_rate: '', period_start: '', period_end: '' });
      toast.success('Project created (preview)');
      return;
    }
    setIsSavingNewProject(true);
    try {
      const { data, error } = await supabase.from('hour_allocations').insert({
        organization_id: org.id,
        title: newProject.title.trim(),
        total_hours: hours,
        agreed_hourly_rate: newProject.hourly_rate ? parseFloat(newProject.hourly_rate) : null,
        period_start: newProject.period_start,
        period_end: newProject.period_end,
      }).select().single();
      if (error) throw error;
      setAllocations(prev => [data as unknown as HourAllocation, ...prev]);
      setShowNewProject(false);
      setNewProject({ title: '', total_hours: '', hourly_rate: '', period_start: '', period_end: '' });
      toast.success('Project created');
    } catch { toast.error('Failed to create project'); }
    finally { setIsSavingNewProject(false); }
  }

  const currentAlloc = allocations[0];

  function openEditClient() {
    if (!org) return;
    setEditClient({
      name: org.name || '', website: org.website || '', primary_contact_name: org.primary_contact_name || '',
      primary_contact_email: org.primary_contact_email || '', primary_contact_phone: org.primary_contact_phone || '',
      billing_email: org.billing_email || '', billing_address: org.billing_address || '', notes: org.notes || '',
      account_status: org.account_status || 'active',
    });
    setShowEditClient(true);
  }

  async function saveClientDetails() {
    if (!org) return;
    if (!editClient.name.trim()) { toast.error('Name is required'); return; }
    if (isPreviewMode) {
      setOrg({ ...org, ...editClient });
      setShowEditClient(false);
      toast.success('Client updated (preview)');
      return;
    }
    setIsSavingClient(true);
    try {
      const { error } = await supabase.from('organizations').update({
        name: editClient.name.trim(),
        website: editClient.website.trim() || null,
        primary_contact_name: editClient.primary_contact_name.trim() || null,
        primary_contact_email: editClient.primary_contact_email.trim() || null,
        primary_contact_phone: editClient.primary_contact_phone.trim() || null,
        billing_email: editClient.billing_email.trim() || null,
        billing_address: editClient.billing_address.trim() || null,
        notes: editClient.notes.trim() || null,
        account_status: editClient.account_status as any,
      }).eq('id', org.id);
      if (error) throw error;
      setOrg({ ...org, ...editClient });
      setShowEditClient(false);
      toast.success('Client updated');
    } catch { toast.error('Failed to update client'); }
    finally { setIsSavingClient(false); }
  }

  function openEditProject(alloc: HourAllocation) {
    setEditProject({
      title: alloc.title || '', total_hours: alloc.total_hours.toString(),
      hourly_rate: alloc.agreed_hourly_rate?.toString() || '', period_start: alloc.period_start,
      period_end: alloc.period_end, notes: alloc.notes || '',
    });
    setEditProjectId(alloc.id);
  }

  async function saveProjectDetails() {
    if (!editProjectId) return;
    const hours = parseFloat(editProject.total_hours);
    if (!editProject.title.trim() || isNaN(hours) || hours <= 0 || !editProject.period_start || !editProject.period_end) {
      toast.error('Please fill in all required fields'); return;
    }
    if (isPreviewMode) {
      setAllocations(prev => prev.map(a => a.id === editProjectId ? {
        ...a, title: editProject.title, total_hours: hours,
        agreed_hourly_rate: editProject.hourly_rate ? parseFloat(editProject.hourly_rate) : null,
        period_start: editProject.period_start, period_end: editProject.period_end,
        notes: editProject.notes || null,
      } : a));
      setEditProjectId(null);
      toast.success('Project updated (preview)');
      return;
    }
    setIsSavingProject(true);
    try {
      const { error } = await supabase.from('hour_allocations').update({
        title: editProject.title.trim(), total_hours: hours,
        agreed_hourly_rate: editProject.hourly_rate ? parseFloat(editProject.hourly_rate) : null,
        period_start: editProject.period_start, period_end: editProject.period_end,
        notes: editProject.notes.trim() || null,
      }).eq('id', editProjectId);
      if (error) throw error;
      setAllocations(prev => prev.map(a => a.id === editProjectId ? {
        ...a, title: editProject.title, total_hours: hours,
        agreed_hourly_rate: editProject.hourly_rate ? parseFloat(editProject.hourly_rate) : null,
        period_start: editProject.period_start, period_end: editProject.period_end,
        notes: editProject.notes || null,
      } : a));
      setEditProjectId(null);
      toast.success('Project updated');
    } catch { toast.error('Failed to update project'); }
    finally { setIsSavingProject(false); }
  }
  const hoursPercent = currentAlloc ? (currentAlloc.used_hours / currentAlloc.total_hours) * 100 : 0;
  const backPath = role === 'admin' ? '/admin/clients' : role === 'ops' ? '/ops' : '/support';

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);

  const statusBadge = (s: string) => {
    const v: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default', overdue: 'destructive',
    };
    return <Badge variant={v[s] || 'outline'}>{s}</Badge>;
  };

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

  const subStatusBadge = (s: string) => {
    const colors: Record<string, string> = { active: 'bg-green-100 text-green-800', canceled: 'bg-red-100 text-red-800', past_due: 'bg-amber-100 text-amber-800', trialing: 'bg-blue-100 text-blue-800' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] || 'bg-muted text-muted-foreground'}`}>{s.replace(/_/g, ' ')}</span>;
  };

  const navItems: { key: Section; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Building2 className="h-4 w-4" /> },
    { key: 'projects', label: 'Projects', icon: <FolderKanban className="h-4 w-4" /> },
    { key: 'tickets', label: 'Tickets', icon: <Ticket className="h-4 w-4" /> },
    { key: 'subscriptions', label: 'Subscriptions', icon: <CreditCard className="h-4 w-4" /> },
  ];

  if (isLoading) {
    return (
      <DashboardLayout role={role}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!org) {
    return (
      <DashboardLayout role={role}>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Client not found</p>
          <Button asChild className="mt-4"><Link to={backPath}>Go Back</Link></Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={role}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon"><Link to={backPath}><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-bold">{org.name}</h1>
              {statusBadge(org.account_status)}
            </div>
            {org.website && (
              <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 mt-1">
                <Globe className="h-3 w-3" /> {org.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>

        {isPreviewMode && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <Eye className="h-4 w-4" />
            <AlertDescription><strong>Preview Mode:</strong> Sample data shown.</AlertDescription>
          </Alert>
        )}

        {org.payment_overdue_since && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Payment overdue since {new Date(org.payment_overdue_since).toLocaleDateString()}</AlertDescription>
          </Alert>
        )}

        {/* Section Navigation */}
        <div className="flex gap-2 border-b pb-0">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeSection === item.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW SECTION */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveSection('projects')}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1"><Clock className="h-4 w-4" /><span className="text-sm">Current Project</span></div>
                  {currentAlloc ? (
                    <>
                      <p className="font-semibold">{currentAlloc.title || 'Untitled Project'}</p>
                      <Progress value={hoursPercent} className={`mt-2 h-2 ${hoursPercent > 85 ? '[&>div]:bg-destructive' : ''}`} />
                      <p className="text-xs text-muted-foreground mt-1">{currentAlloc.used_hours.toFixed(1)} / {currentAlloc.total_hours}h used</p>
                    </>
                  ) : <p className="text-muted-foreground text-sm">No active project</p>}
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveSection('tickets')}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1"><Ticket className="h-4 w-4" /><span className="text-sm">Tickets</span></div>
                  <p className="text-2xl font-bold">{ticketStats.open} <span className="text-sm font-normal text-muted-foreground">open</span></p>
                  <p className="text-xs text-muted-foreground">{ticketStats.closed} closed / {ticketStats.total} total</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveSection('subscriptions')}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1"><CreditCard className="h-4 w-4" /><span className="text-sm">Subscription</span></div>
                  {subscriptions.length > 0 ? (
                    <>
                      <p className="font-semibold">{subscriptions[0].items[0]?.product_name || 'Active Plan'}</p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">{subscriptions[0].status.replace(/_/g, ' ')}</p>
                    </>
                  ) : <p className="text-muted-foreground text-sm">No active subscription</p>}
                </CardContent>
              </Card>
            </div>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Client Details</CardTitle>
                  <Button variant="ghost" size="sm" onClick={openEditClient}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {org.primary_contact_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{org.primary_contact_name}</span>
                    </div>
                  )}
                  {org.primary_contact_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${org.primary_contact_email}`} className="text-primary hover:underline">{org.primary_contact_email}</a>
                    </div>
                  )}
                  {org.primary_contact_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{org.primary_contact_phone}</span>
                    </div>
                  )}
                  {org.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{org.website.replace(/^https?:\/\//, '')}</a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Team Members</CardTitle>
                <CardDescription>Users with access to this client account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {members.length > 0 && (
                  <div className="space-y-2">
                    {members.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-2 rounded-lg border">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {member.full_name ? member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : member.email[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{member.full_name || member.email}</p>
                            {member.full_name && <p className="text-xs text-muted-foreground truncate">{member.email}</p>}
                          </div>
                          {member.is_primary_contact && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeMember(member.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={addMemberEmail}
                    onChange={e => setAddMemberEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMember(); } }}
                    className="flex-1"
                  />
                  <Button onClick={addMember} disabled={isAddingMember || !addMemberEmail.trim()} size="sm">
                    {isAddingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-1" />Add</>}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Add existing users by email address. They must have an account first.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* PROJECTS SECTION (merged hours + billing context) */}
        {activeSection === 'projects' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowNewProject(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>
            {allocations.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No projects found.</CardContent></Card>
            ) : (
              allocations.map((alloc, i) => {
                const pct = (alloc.used_hours / alloc.total_hours) * 100;
                const isCurrent = i === 0;
                const projectDetailPath = `/${role === 'admin' ? 'ops' : role}/clients/${org.id}/projects/${alloc.id}`;
                return (
                  <Link key={alloc.id} to={projectDetailPath} className="block">
                    <Card className={`hover:bg-muted/50 transition-colors cursor-pointer ${isCurrent ? 'border-primary/30' : ''}`}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FolderKanban className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{alloc.title || 'Untitled Project'}</span>
                            {isCurrent && <Badge>Current</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            {alloc.agreed_hourly_rate && <span className="text-sm text-muted-foreground">${alloc.agreed_hourly_rate}/hr</span>}
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditProject(alloc); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <Progress value={pct} className={`h-2 ${pct > 90 ? '[&>div]:bg-destructive' : ''}`} />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          <span>{alloc.used_hours.toFixed(1)} / {alloc.total_hours}h used ({pct.toFixed(0)}%)</span>
                          <span>{new Date(alloc.period_start).toLocaleDateString()} — {new Date(alloc.period_end).toLocaleDateString()}</span>
                        </div>
                        {alloc.agreed_hourly_rate && (
                          <p className="text-xs text-muted-foreground mt-1">Billable value: {formatCurrency(alloc.used_hours * alloc.agreed_hourly_rate * 100, 'usd')}</p>
                        )}
                        {alloc.notes && <p className="text-xs text-muted-foreground mt-2 italic">{alloc.notes}</p>}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}

            {/* Edit project dialog */}
            <Dialog open={!!editProjectId} onOpenChange={(open) => !open && setEditProjectId(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Project Title *</Label>
                    <Input value={editProject.title} onChange={(e) => setEditProject({ ...editProject, title: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Total Hours *</Label>
                      <Input type="number" min="1" step="1" value={editProject.total_hours} onChange={(e) => setEditProject({ ...editProject, total_hours: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Hourly Rate</Label>
                      <Input type="number" min="0" step="0.01" value={editProject.hourly_rate} onChange={(e) => setEditProject({ ...editProject, hourly_rate: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Input type="date" value={editProject.period_start} onChange={(e) => setEditProject({ ...editProject, period_start: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date *</Label>
                      <Input type="date" value={editProject.period_end} onChange={(e) => setEditProject({ ...editProject, period_end: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={editProject.notes} onChange={(e) => setEditProject({ ...editProject, notes: e.target.value })} rows={3} placeholder="Optional project notes..." />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditProjectId(null)}>Cancel</Button>
                    <Button onClick={saveProjectDetails} disabled={isSavingProject}>
                      {isSavingProject ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* New Project dialog */}
            <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Create New Project</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Project Title *</Label>
                    <Input value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} placeholder="e.g. Website Redesign" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Total Hours *</Label>
                      <Input type="number" min="1" step="1" value={newProject.total_hours} onChange={(e) => setNewProject({ ...newProject, total_hours: e.target.value })} placeholder="40" />
                    </div>
                    <div className="space-y-2">
                      <Label>Hourly Rate</Label>
                      <Input type="number" min="0" step="0.01" value={newProject.hourly_rate} onChange={(e) => setNewProject({ ...newProject, hourly_rate: e.target.value })} placeholder="150" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Input type="date" value={newProject.period_start} onChange={(e) => setNewProject({ ...newProject, period_start: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date *</Label>
                      <Input type="date" value={newProject.period_end} onChange={(e) => setNewProject({ ...newProject, period_end: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowNewProject(false)}>Cancel</Button>
                    <Button onClick={createProject} disabled={isSavingNewProject}>
                      {isSavingNewProject ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                      Create Project
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* TICKETS SECTION */}
        {activeSection === 'tickets' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Client Tickets</CardTitle>
                    <CardDescription>
                      {(() => {
                        const filtered = ticketStatusFilter === 'all' ? tickets
                          : ticketStatusFilter === 'open' ? tickets.filter(t => ['open', 'in_progress'].includes(t.status))
                          : ticketStatusFilter === 'waiting_on_client' ? tickets.filter(t => t.status === 'waiting_on_client')
                          : tickets.filter(t => ['resolved', 'closed'].includes(t.status));
                        return `${filtered.length} ticket${filtered.length !== 1 ? 's' : ''}`;
                      })()}
                    </CardDescription>
                  </div>
                  <Select value={ticketStatusFilter} onValueChange={setTicketStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="waiting_on_client">Waiting on Client</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const filteredTickets = ticketStatusFilter === 'all' ? tickets
                    : ticketStatusFilter === 'open' ? tickets.filter(t => ['open', 'in_progress'].includes(t.status))
                    : ticketStatusFilter === 'waiting_on_client' ? tickets.filter(t => t.status === 'waiting_on_client')
                    : tickets.filter(t => ['resolved', 'closed'].includes(t.status));
                  return filteredTickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No tickets found.</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredTickets.map((ticket) => (
                        <Link
                          key={ticket.id}
                          to={`/support/tickets/${ticket.id}`}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{ticket.title}</p>
                            <p className="text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {ticketStatusBadge(ticket.status)}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        )}

        {/* SUBSCRIPTIONS SECTION */}
        {activeSection === 'subscriptions' && (
          <div className="space-y-4">
            {/* Subscriptions */}
            <Card>
              <CardHeader><CardTitle className="text-base">Subscriptions</CardTitle></CardHeader>
              <CardContent>
                {subscriptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{hasStripe ? 'No subscriptions found.' : 'No billing account linked.'}</p>
                ) : (
                  <div className="space-y-3">
                    {subscriptions.map((sub) => (
                      <div key={sub.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{sub.items[0]?.product_name || 'Subscription'}</span>
                            {subStatusBadge(sub.status)}
                          </div>
                          {sub.cancel_at_period_end && <Badge variant="outline" className="text-amber-600">Cancels at period end</Badge>}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div><span className="text-muted-foreground">Price</span><p className="font-medium">{sub.items[0]?.price_amount ? formatCurrency(sub.items[0].price_amount, sub.items[0].price_currency) : 'N/A'}/{sub.items[0]?.price_interval || 'N/A'}</p></div>
                          <div><span className="text-muted-foreground">Period Start</span><p>{new Date(sub.current_period_start).toLocaleDateString()}</p></div>
                          <div><span className="text-muted-foreground">Period End</span><p>{new Date(sub.current_period_end).toLocaleDateString()}</p></div>
                          <div><span className="text-muted-foreground">Status</span><p className="capitalize">{sub.status.replace(/_/g, ' ')}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoices */}
            <Card>
              <CardHeader><CardTitle className="text-base">Recent Invoices</CardTitle></CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invoices found.</p>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                        <div className="flex items-center gap-3">
                          {inv.status === 'paid' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                          <div>
                            <span className="font-medium">{inv.number || inv.id}</span>
                            <p className="text-xs text-muted-foreground">{new Date(inv.created).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{formatCurrency(inv.amount_due, inv.currency)}</span>
                          <Badge variant={inv.status === 'paid' ? 'default' : 'destructive'}>{inv.status}</Badge>
                          {inv.hosted_invoice_url && (
                            <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Client Dialog */}
        <Dialog open={showEditClient} onOpenChange={setShowEditClient}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Client Details</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Organisation Name *</Label>
                <Input value={editClient.name} onChange={(e) => setEditClient({ ...editClient, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Account Status</Label>
                <Select value={editClient.account_status} onValueChange={(v) => setEditClient({ ...editClient, account_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={editClient.website} onChange={(e) => setEditClient({ ...editClient, website: e.target.value })} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input value={editClient.primary_contact_name} onChange={(e) => setEditClient({ ...editClient, primary_contact_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input value={editClient.primary_contact_phone} onChange={(e) => setEditClient({ ...editClient, primary_contact_phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input type="email" value={editClient.primary_contact_email} onChange={(e) => setEditClient({ ...editClient, primary_contact_email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Billing Email</Label>
                <Input type="email" value={editClient.billing_email} onChange={(e) => setEditClient({ ...editClient, billing_email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Billing Address</Label>
                <Textarea value={editClient.billing_address} onChange={(e) => setEditClient({ ...editClient, billing_address: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={editClient.notes} onChange={(e) => setEditClient({ ...editClient, notes: e.target.value })} rows={3} placeholder="Internal notes about this client..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowEditClient(false)}>Cancel</Button>
                <Button onClick={saveClientDetails} disabled={isSavingClient}>
                  {isSavingClient ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
