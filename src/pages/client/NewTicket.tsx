import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, CalendarIcon, Paperclip, X, FileIcon, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

export default function NewTicket() {
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [formData, setFormData] = useState({ title: '', description: '' });

  useEffect(() => {
    if (user) {
      supabase.from('organization_members').select('organization_id').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        if (data) setOrganizationId(data.organization_id);
      });
    }
  }, [user]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) { toast({ title: 'File too large', description: `${file.name} exceeds 10MB`, variant: 'destructive' }); continue; }
      if (attachments.length + validFiles.length >= MAX_FILES) { toast({ title: 'Too many files', description: `Maximum ${MAX_FILES} files`, variant: 'destructive' }); break; }
      validFiles.push(file);
    }
    setAttachments(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPreviewMode) {
      setIsSubmitting(true);
      await new Promise(r => setTimeout(r, 1000));
      toast({ title: 'Preview Mode', description: 'Ticket creation simulated.' });
      setIsSubmitting(false);
      navigate('/client/tickets');
      return;
    }
    if (!organizationId || !user) {
      toast({ title: 'Error', description: 'Unable to create ticket.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from('tickets').insert({
        organization_id: organizationId,
        created_by_user_id: user.id,
        title: formData.title,
        description: formData.description,
        status: 'open',
        sla_due_at: dueDate ? dueDate.toISOString() : null,
      }).select('id').single();
      if (error) throw error;

      if (attachments.length > 0) {
        for (const file of attachments) {
          const filePath = `${user.id}/${data.id}/${Date.now()}-${file.name}`;
          const { error: upErr } = await supabase.storage.from('ticket-attachments').upload(filePath, file);
          if (!upErr) {
            await supabase.from('ticket_attachments').insert({ ticket_id: data.id, file_name: file.name, file_path: filePath, file_size: file.size, content_type: file.type, uploaded_by_user_id: user.id });
          }
        }
      }
      toast({ title: 'Ticket created', description: 'Your support ticket has been submitted.' });
      navigate(`/client/tickets/${data.id}`);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create ticket', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DashboardLayout role="client">
      <div className="p-6 max-w-2xl">
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/client/tickets')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to Tickets
        </Button>

        {isPreviewMode && (
          <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
            <Eye className="h-4 w-4" />
            <AlertDescription><strong>Preview Mode:</strong> Form submissions will be simulated.</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Create New Ticket</CardTitle>
            <CardDescription>Describe your issue and we'll get back to you as soon as possible</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Subject *</Label>
                <Input id="title" placeholder="Brief description of your issue" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>

              <div className="space-y-2">
                <Label>Due Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{dueDate ? format(dueDate, "PPP") : "Select a due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} disabled={(date) => date < new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
                {dueDate && <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setDueDate(undefined)}>Clear due date</Button>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea id="description" placeholder="Please provide details about your issue..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={6} required />
              </div>

              <div className="space-y-2">
                <Label>Attachments (Optional)</Label>
                <div className="border border-dashed border-border rounded-lg p-4">
                  <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" />
                  <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={attachments.length >= MAX_FILES}>
                    <Paperclip className="h-4 w-4 mr-2" />{attachments.length >= MAX_FILES ? `Maximum ${MAX_FILES} files reached` : 'Add attachments'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">Max {MAX_FILES} files, 10MB each.</p>
                </div>
                {attachments.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">({formatFileSize(file.size)})</span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => navigate('/client/tickets')}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Ticket'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
