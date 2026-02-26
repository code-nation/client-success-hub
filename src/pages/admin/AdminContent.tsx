import { useEffect, useState } from 'react';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { mockKBArticles } from '@/lib/mockData';
import { Eye, FileText, Check, X, Edit, Trash2, Search } from 'lucide-react';

interface KBArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
  category_name?: string;
}

const mockArticles: KBArticle[] = mockKBArticles.map(a => ({
  id: a.id,
  title: a.title,
  slug: a.slug,
  excerpt: a.excerpt,
  content: a.content,
  is_published: a.is_published,
  is_featured: a.is_featured,
  created_at: a.created_at,
  category_name: a.kb_categories?.name ?? undefined,
}));

export default function AdminContent() {
  const { isPreviewMode } = usePreviewMode();
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [editArticle, setEditArticle] = useState<KBArticle | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editExcerpt, setEditExcerpt] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (isPreviewMode) {
      setArticles(mockArticles);
      setIsLoading(false);
    } else {
      fetchArticles();
    }
  }, [isPreviewMode]);

  async function fetchArticles() {
    try {
      const { data, error } = await supabase
        .from('kb_articles')
        .select('id, title, slug, excerpt, content, is_published, is_featured, created_at, kb_categories(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setArticles((data || []).map((a: any) => ({ ...a, category_name: a.kb_categories?.name })));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  }

  async function togglePublish(article: KBArticle) {
    const next = !article.is_published;
    if (isPreviewMode) {
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, is_published: next } : a));
      toast.success(next ? 'Article published' : 'Article unpublished');
      return;
    }
    try {
      const updates: any = { is_published: next };
      if (next) updates.published_at = new Date().toISOString();
      const { error } = await supabase.from('kb_articles').update(updates).eq('id', article.id);
      if (error) throw error;
      toast.success(next ? 'Article published' : 'Article unpublished');
      fetchArticles();
    } catch (err) {
      toast.error('Failed to update article');
    }
  }

  async function deleteArticle(id: string) {
    if (isPreviewMode) {
      setArticles(prev => prev.filter(a => a.id !== id));
      toast.success('Article deleted');
      return;
    }
    try {
      const { error } = await supabase.from('kb_articles').delete().eq('id', id);
      if (error) throw error;
      toast.success('Article deleted');
      fetchArticles();
    } catch (err) {
      toast.error('Failed to delete article');
    }
  }

  function openEdit(article: KBArticle) {
    setEditArticle(article);
    setEditTitle(article.title);
    setEditExcerpt(article.excerpt || '');
    setEditContent(article.content || '');
  }

  async function saveEdit() {
    if (!editArticle) return;
    if (isPreviewMode) {
      setArticles(prev => prev.map(a => a.id === editArticle.id ? { ...a, title: editTitle, excerpt: editExcerpt, content: editContent } : a));
      toast.success('Article updated');
      setEditArticle(null);
      return;
    }
    try {
      const slug = editTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { error } = await supabase.from('kb_articles').update({ title: editTitle, excerpt: editExcerpt || null, content: editContent || null, slug }).eq('id', editArticle.id);
      if (error) throw error;
      toast.success('Article updated');
      setEditArticle(null);
      fetchArticles();
    } catch (err) {
      toast.error('Failed to update');
    }
  }

  const filtered = articles.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'published' ? a.is_published : !a.is_published);
    return matchSearch && matchFilter;
  });

  const draftCount = articles.filter(a => !a.is_published).length;
  const publishedCount = articles.filter(a => a.is_published).length;

  return (
    <DashboardLayout role="ops">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Content Management</h1>
          <p className="text-muted-foreground">Review, edit, and publish knowledge base articles</p>
        </div>

        {isPreviewMode && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <Eye className="h-4 w-4" />
            <AlertDescription><strong>Preview Mode:</strong> Sample data shown.</AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer" onClick={() => setFilter('all')}>
            <CardContent className="pt-4 pb-4"><p className="text-sm text-muted-foreground">Total Articles</p><p className="text-2xl font-bold">{articles.length}</p></CardContent>
          </Card>
          <Card className={`cursor-pointer ${draftCount > 0 ? 'border-amber-500/50' : ''}`} onClick={() => setFilter('draft')}>
            <CardContent className="pt-4 pb-4"><p className="text-sm text-muted-foreground">Pending Review</p><p className="text-2xl font-bold text-amber-600">{draftCount}</p></CardContent>
          </Card>
          <Card className="cursor-pointer" onClick={() => setFilter('published')}>
            <CardContent className="pt-4 pb-4"><p className="text-sm text-muted-foreground">Published</p><p className="text-2xl font-bold">{publishedCount}</p></CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search articles..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {/* Article list */}
        <div className="space-y-3">
          {filtered.map(article => (
            <Card key={article.id}>
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{article.title}</span>
                      <Badge variant={article.is_published ? 'default' : 'secondary'}>
                        {article.is_published ? 'Published' : 'Draft'}
                      </Badge>
                      {article.is_featured && <Badge variant="outline">Featured</Badge>}
                    </div>
                    {article.excerpt && <p className="text-sm text-muted-foreground truncate ml-6">{article.excerpt}</p>}
                    <p className="text-xs text-muted-foreground ml-6 mt-1">
                      {article.category_name && `${article.category_name} • `}
                      {new Date(article.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(article)}>
                      <Edit className="h-3 w-3 mr-1" />Edit
                    </Button>
                    <Button variant={article.is_published ? 'secondary' : 'default'} size="sm" onClick={() => togglePublish(article)}>
                      {article.is_published ? <><X className="h-3 w-3 mr-1" />Unpublish</> : <><Check className="h-3 w-3 mr-1" />Publish</>}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteArticle(article.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No articles match your filters</p>
            </div>
          )}
        </div>

        {/* Edit dialog */}
        <Dialog open={!!editArticle} onOpenChange={open => { if (!open) setEditArticle(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Article</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={editTitle} onChange={e => setEditTitle(e.target.value)} /></div>
              <div className="space-y-2"><Label>Excerpt</Label><Textarea value={editExcerpt} onChange={e => setEditExcerpt(e.target.value)} rows={2} /></div>
              <div className="space-y-2"><Label>Content (Markdown)</Label><Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={12} className="font-mono text-sm" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditArticle(null)}>Cancel</Button>
              <Button onClick={saveEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
