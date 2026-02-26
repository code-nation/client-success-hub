import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FileText, Upload, Download, Trash2, File, Image, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DocumentItem {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  description: string | null;
  created_at: string;
  uploaded_by_user_id: string;
}

const previewDocuments: DocumentItem[] = [
  { id: 'doc-1', file_name: 'Brand_Guidelines_v2.pdf', file_path: '', file_size: 2400000, content_type: 'application/pdf', description: 'Latest brand guidelines including logo usage and color palette', created_at: new Date(Date.now() - 5 * 86400000).toISOString(), uploaded_by_user_id: 'preview' },
  { id: 'doc-2', file_name: 'Q4_Report.xlsx', file_path: '', file_size: 850000, content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', description: 'Quarterly performance report', created_at: new Date(Date.now() - 12 * 86400000).toISOString(), uploaded_by_user_id: 'preview' },
  { id: 'doc-3', file_name: 'Homepage_Mockup.png', file_path: '', file_size: 3200000, content_type: 'image/png', description: 'Approved homepage redesign mockup', created_at: new Date(Date.now() - 20 * 86400000).toISOString(), uploaded_by_user_id: 'preview' },
  { id: 'doc-4', file_name: 'Service_Agreement_2025.pdf', file_path: '', file_size: 540000, content_type: 'application/pdf', description: 'Signed service agreement', created_at: new Date(Date.now() - 30 * 86400000).toISOString(), uploaded_by_user_id: 'preview' },
];

function fileIcon(contentType: string | null) {
  if (!contentType) return <File className="h-5 w-5 text-muted-foreground" />;
  if (contentType.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
  if (contentType.includes('spreadsheet') || contentType.includes('csv')) return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  if (contentType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatSize(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function ClientDocuments() {
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isPreviewMode) {
      setDocuments(previewDocuments);
      setIsLoading(false);
      return;
    }
    if (user) fetchDocuments();
  }, [user, isPreviewMode]);

  async function fetchDocuments() {
    try {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (!membership) { setIsLoading(false); return; }

      const { data } = await supabase
        .from('client_documents')
        .select('*')
        .eq('organization_id', membership.organization_id)
        .order('created_at', { ascending: false });

      setDocuments((data as DocumentItem[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpload() {
    if (!selectedFile || !user) return;
    setUploading(true);
    try {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!membership) throw new Error('No organization found');

      const filePath = `${membership.organization_id}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, selectedFile);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('client_documents')
        .insert({
          organization_id: membership.organization_id,
          uploaded_by_user_id: user.id,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          content_type: selectedFile.type,
          description: description || null,
        });
      if (insertError) throw insertError;

      toast.success('Document uploaded');
      setDialogOpen(false);
      setSelectedFile(null);
      setDescription('');
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc: DocumentItem) {
    if (isPreviewMode) { toast.info('Downloads disabled in preview'); return; }
    const { data, error } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) { toast.error('Could not generate download link'); return; }
    window.open(data.signedUrl, '_blank');
  }

  async function handleDelete(doc: DocumentItem) {
    if (isPreviewMode) {
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast.success('Document removed (preview)');
      return;
    }
    try {
      await supabase.storage.from('client-documents').remove([doc.file_path]);
      await supabase.from('client_documents').delete().eq('id', doc.id);
      toast.success('Document deleted');
      fetchDocuments();
    } catch { toast.error('Delete failed'); }
  }

  return (
    <DashboardLayout role="client">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Documents & Resources</h1>
            <p className="text-muted-foreground">Shared files, guides, contracts, and onboarding docs</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Add Document
          </Button>
        </div>

        {isLoading ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent></Card>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Documents Yet</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-md">
                Upload documents and resources to share with your team.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" /> Upload Your First Document
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <Card key={doc.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  {fileIcon(doc.content_type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.file_name}</p>
                    {doc.description && <p className="text-sm text-muted-foreground truncate">{doc.description}</p>}
                    <p className="text-xs text-muted-foreground">{formatSize(doc.file_size)} · {format(new Date(doc.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Download">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>Select a file and optionally add a description.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>File</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What is this document about?"
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
                {uploading ? 'Uploading…' : 'Upload'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
