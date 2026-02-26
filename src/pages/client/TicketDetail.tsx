import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Send, Loader2, Pencil, Check, X, FolderOpen } from 'lucide-react';

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
}

interface ProjectLink {
  id: string;
  title: string | null;
}

interface Message {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
}

export default function TicketDetail() {
  const { ticketId } = useParams();
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [projectLink, setProjectLink] = useState<ProjectLink | null>(null);

  // Inline edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const previewTickets: Record<string, Ticket> = {
    '1': { id: '1', title: 'Website not loading on mobile', description: 'The website is not rendering correctly on mobile devices. The navigation menu overlaps with the content and images are not scaling properly.', status: 'open', created_at: new Date(Date.now() - 2 * 3600000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString(), organization_id: 'org-1' },
    '2': { id: '2', title: 'Update homepage hero section', description: 'Need to update the hero section with new branding assets and copy.', status: 'in_progress', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 7200000).toISOString(), organization_id: 'org-1' },
    '3': { id: '3', title: 'Fix navigation dropdown', description: 'The dropdown menu on the navigation bar is not working on Safari.', status: 'closed', created_at: new Date(Date.now() - 7 * 86400000).toISOString(), updated_at: new Date(Date.now() - 3 * 86400000).toISOString(), organization_id: 'org-1' },
    '4': { id: '4', title: 'Email campaign setup help', description: 'Need help setting up the email marketing campaign for the product launch.', status: 'closed', created_at: new Date(Date.now() - 14 * 86400000).toISOString(), updated_at: new Date(Date.now() - 10 * 86400000).toISOString(), organization_id: 'org-1' },
    '5': { id: '5', title: 'Social media assets', description: 'Create social media graphics for the upcoming campaign.', status: 'closed', created_at: new Date(Date.now() - 20 * 86400000).toISOString(), updated_at: new Date(Date.now() - 15 * 86400000).toISOString(), organization_id: 'org-1' },
    '6': { id: '6', title: 'Define API endpoints', description: 'Document and define the API endpoints needed for the integration.', status: 'open', created_at: new Date(Date.now() - 3 * 86400000).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString(), organization_id: 'org-1' },
  };

  const previewMessages: Message[] = [
    { id: 'm1', message: 'Hi, I\'m having trouble with the mobile layout. The navigation is broken.', created_at: new Date(Date.now() - 2 * 3600000).toISOString(), user_id: 'client-user', profiles: { full_name: 'Jane Client', email: 'jane@example.com' } },
    { id: 'm2', message: 'Thanks for reporting this. I can see the issue — the CSS media queries need adjustment. I\'ll have a fix ready by end of day.', created_at: new Date(Date.now() - 1.5 * 3600000).toISOString(), user_id: 'support-user', profiles: { full_name: 'Alex Support', email: 'alex@agency.com' } },
  ];

  useEffect(() => {
    if (ticketId) fetchTicketData();
  }, [ticketId]);

  async function fetchTicketData() {
    try {
      if (isPreviewMode && ticketId && previewTickets[ticketId]) {
        setTicket(previewTickets[ticketId]);
        setMessages(ticketId === '1' ? previewMessages : []);
        setProjectLink({ id: 'preview-1', title: 'Website Redesign' });
        setIsLoading(false);
        return;
      }

      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('id, title, description, status, created_at, updated_at, organization_id')
        .eq('id', ticketId)
        .maybeSingle();

      if (ticketError) throw ticketError;
      if (!ticketData) { navigate('/client/tickets'); return; }
      setTicket(ticketData as Ticket);

      // Find the current active project (hour allocation) for this org
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

      const { data: messagesData } = await supabase
        .from('ticket_messages')
        .select(`id, message, created_at, user_id, profiles (full_name, email)`)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (messagesData) setMessages(messagesData as unknown as Message[]);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast({ title: 'Error', description: 'Failed to load ticket details', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !ticketId) return;
    if (!isPreviewMode && !user) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: ticketId, user_id: user.id, message: newMessage.trim(), is_internal: false,
      });
      if (error) throw error;
      setNewMessage('');
      fetchTicketData();
      toast({ title: 'Message sent', description: 'Your reply has been added to the ticket.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to send message', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  }

  async function saveTitle() {
    if (!editTitle.trim() || !ticket) return;
    if (isPreviewMode) { setTicket({ ...ticket, title: editTitle.trim() }); setIsEditingTitle(false); return; }
    try {
      const { error } = await supabase.from('tickets').update({ title: editTitle.trim() }).eq('id', ticket.id);
      if (error) throw error;
      setTicket({ ...ticket, title: editTitle.trim() });
      setIsEditingTitle(false);
    } catch { toast({ title: 'Error', description: 'Failed to update title', variant: 'destructive' }); }
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
    } catch { toast({ title: 'Error', description: 'Failed to update description', variant: 'destructive' }); }
  }

  async function updateStatus(newStatus: string) {
    if (!ticket) return;
    if (isPreviewMode) { setTicket({ ...ticket, status: newStatus }); return; }
    try {
      const { error } = await supabase.from('tickets').update({ status: newStatus as any }).eq('id', ticket.id);
      if (error) throw error;
      setTicket({ ...ticket, status: newStatus });
    } catch { toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' }); }
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    return email[0].toUpperCase();
  };

  if (isLoading) {
    return <DashboardLayout role="client"><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }

  if (!ticket) {
    return <DashboardLayout role="client"><div className="p-6"><p>Ticket not found</p></div></DashboardLayout>;
  }

  return (
    <DashboardLayout role="client">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" onClick={() => navigate('/client/tickets')}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Tickets
          </Button>
          {projectLink && (
            <>
              <span className="text-muted-foreground">·</span>
              <Button variant="ghost" asChild>
                <Link to={`/client/hours/${projectLink.id}`}>
                  <FolderOpen className="h-4 w-4 mr-2" />{projectLink.title || 'View Project'}
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Ticket header */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1 flex-1 min-w-0">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-lg font-semibold" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setIsEditingTitle(false); }} />
                    <Button size="icon" variant="ghost" onClick={saveTitle}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(false)}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <CardTitle>{ticket.title}</CardTitle>
                    <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditTitle(ticket.title); setIsEditingTitle(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
                <CardDescription>
                  Created {new Date(ticket.created_at).toLocaleDateString()}
                  {' · '}Last updated {new Date(ticket.updated_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <Select value={ticket.status} onValueChange={updateStatus}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="waiting_on_client">Waiting on You</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isEditingDesc ? (
              <div className="space-y-2">
                <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} autoFocus />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveDescription}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingDesc(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="group cursor-pointer" onClick={() => { setEditDesc(ticket.description || ''); setIsEditingDesc(true); }}>
                <p className="text-sm whitespace-pre-wrap">{ticket.description || <span className="text-muted-foreground italic">No description — click to add one</span>}</p>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 inline-block" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversation */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Conversation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No messages yet. Start the conversation below.</p>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isOwn = msg.user_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={isOwn ? 'bg-accent text-accent-foreground' : 'bg-muted'}>
                          {getInitials(msg.profiles?.full_name || null, msg.profiles?.email || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex-1 max-w-[80%] ${isOwn ? 'text-right' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{msg.profiles?.full_name || msg.profiles?.email}</span>
                          <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        <div className={`rounded-lg p-3 ${isOwn ? 'bg-accent text-accent-foreground' : 'bg-muted'}`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Separator className="my-4" />

            <form onSubmit={handleSendMessage} className="space-y-4">
              <Textarea placeholder="Type your reply..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} rows={3} />
              <div className="flex justify-end">
                <Button type="submit" disabled={isSending || !newMessage.trim()}>
                  {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Send Reply
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}