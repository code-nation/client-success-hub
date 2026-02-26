import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Search,
  BookOpen,
  Star,
  Eye,
  ChevronRight,
  FileText,
  ArrowLeft,
  Clock,
  Plus,
  Edit,
  Check,
  X,
  Trash2,
} from 'lucide-react';

interface KBCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number | null;
}

interface KBArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  is_featured: boolean;
  is_published?: boolean;
  published_at: string | null;
  created_at: string;
  view_count: number | null;
  category_id: string | null;
  kb_categories?: { name: string; slug: string } | null;
}

// Mock data
const mockCategories: KBCategory[] = [
  { id: '1', name: 'Getting Started', slug: 'getting-started', description: 'New to our services? Start here.', icon: '🚀', sort_order: 0 },
  { id: '2', name: 'Website Management', slug: 'website-management', description: 'Managing your website content and updates.', icon: '🌐', sort_order: 1 },
  { id: '3', name: 'SEO & Marketing', slug: 'seo-marketing', description: 'Search engine optimization and digital marketing tips.', icon: '📈', sort_order: 2 },
  { id: '4', name: 'Email & Integrations', slug: 'email-integrations', description: 'Setting up email campaigns and third-party integrations.', icon: '📧', sort_order: 3 },
  { id: '5', name: 'Billing & Account', slug: 'billing-account', description: 'Subscription, invoices, and account management.', icon: '💳', sort_order: 4 },
];

const mockArticles: KBArticle[] = [
  { id: '1', title: 'How to submit a support ticket', slug: 'submit-ticket', excerpt: 'Learn how to create and track support requests through your client portal.', content: '# How to Submit a Support Ticket\n\n1. Navigate to **Support Tickets** in the sidebar\n2. Click **New Ticket**\n3. Fill in the title, category, priority, and description\n4. Optionally attach files\n5. Click **Submit**\n\nYou\'ll receive updates via email as your ticket progresses.', is_featured: true, published_at: '2025-01-15T00:00:00Z', created_at: '2025-01-15T00:00:00Z', view_count: 245, category_id: '1', kb_categories: { name: 'Getting Started', slug: 'getting-started' } },
  { id: '2', title: 'Understanding your retainer hours', slug: 'retainer-hours', excerpt: 'A guide to how retainer hours work, how they\'re tracked, and what happens when you run low.', content: '# Understanding Your Retainer Hours\n\nYour retainer includes a set number of hours each billing period...\n\n## How Hours Are Tracked\nEvery task our team works on is logged with time spent. You can see this in your **Hours & Usage** dashboard.\n\n## Running Low?\nWhen you\'re at 80% usage, you\'ll see a warning. Contact us to add more hours.', is_featured: true, published_at: '2025-01-20T00:00:00Z', created_at: '2025-01-20T00:00:00Z', view_count: 189, category_id: '1', kb_categories: { name: 'Getting Started', slug: 'getting-started' } },
  { id: '3', title: 'Requesting website content updates', slug: 'content-updates', excerpt: 'How to request changes to your website text, images, and pages.', content: null, is_featured: false, published_at: '2025-02-01T00:00:00Z', created_at: '2025-02-01T00:00:00Z', view_count: 102, category_id: '2', kb_categories: { name: 'Website Management', slug: 'website-management' } },
  { id: '4', title: 'SEO basics: What we do for you', slug: 'seo-basics', excerpt: 'An overview of the SEO services included in your retainer and how to request additional work.', content: null, is_featured: false, published_at: '2025-02-05T00:00:00Z', created_at: '2025-02-05T00:00:00Z', view_count: 78, category_id: '3', kb_categories: { name: 'SEO & Marketing', slug: 'seo-marketing' } },
  { id: '5', title: 'Setting up email campaigns', slug: 'email-campaigns', excerpt: 'Step-by-step guide to planning and launching email marketing campaigns with our team.', content: null, is_featured: false, published_at: '2025-02-10T00:00:00Z', created_at: '2025-02-10T00:00:00Z', view_count: 64, category_id: '4', kb_categories: { name: 'Email & Integrations', slug: 'email-integrations' } },
  { id: '6', title: 'How to update your payment method', slug: 'update-payment', excerpt: 'Update your credit card or payment details through the client portal.', content: null, is_featured: false, published_at: '2025-02-12T00:00:00Z', created_at: '2025-02-12T00:00:00Z', view_count: 156, category_id: '5', kb_categories: { name: 'Billing & Account', slug: 'billing-account' } },
];

interface KnowledgeBaseProps {
  role: 'client' | 'support' | 'ops';
}

export default function KnowledgeBase({ role }: KnowledgeBaseProps) {
  const { isPreviewMode } = usePreviewMode();
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);

  // Staff editing state
  const isStaff = role !== 'client';
  const [editArticle, setEditArticle] = useState<KBArticle | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editExcerpt, setEditExcerpt] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [isNewArticle, setIsNewArticle] = useState(false);
  useEffect(() => {
    if (isPreviewMode) {
      setCategories(mockCategories);
      setArticles(mockArticles);
      setIsLoading(false);
    } else {
      fetchData();
    }
  }, [isPreviewMode]);

  async function fetchData() {
    try {
      const [catRes, artRes] = await Promise.all([
        supabase
          .from('kb_categories')
          .select('*')
          .order('sort_order', { ascending: true }),
        isStaff
          ? supabase
              .from('kb_articles')
              .select('id, title, slug, excerpt, content, is_featured, is_published, published_at, created_at, view_count, category_id, kb_categories (name, slug)')
              .order('created_at', { ascending: false })
          : supabase
              .from('kb_articles')
              .select('id, title, slug, excerpt, content, is_featured, is_published, published_at, created_at, view_count, category_id, kb_categories (name, slug)')
              .eq('is_published', true)
              .order('published_at', { ascending: false }),
      ]);

      if (catRes.data) setCategories(catRes.data);
      if (artRes.data) setArticles(artRes.data as unknown as KBArticle[]);
    } catch (error) {
      console.error('Error fetching KB data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredArticles = articles.filter((a) => {
    const matchesSearch =
      !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || a.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredArticles = articles.filter((a) => a.is_featured);

  // Staff editing helpers
  function openNewArticle() {
    setIsNewArticle(true);
    setEditTitle('');
    setEditExcerpt('');
    setEditContent('');
    setEditCategoryId(categories[0]?.id || null);
    setEditArticle({ id: '', title: '', slug: '', excerpt: null, content: null, is_featured: false, published_at: null, created_at: '', view_count: null, category_id: null } as KBArticle);
  }

  function openEditArticle(article: KBArticle) {
    setIsNewArticle(false);
    setEditTitle(article.title);
    setEditExcerpt(article.excerpt || '');
    setEditContent(article.content || '');
    setEditCategoryId(article.category_id);
    setEditArticle(article);
  }

  async function saveArticle() {
    if (!editTitle.trim()) { toast.error('Title is required'); return; }
    const slug = editTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    if (isPreviewMode) {
      if (isNewArticle) {
        const newArt: KBArticle = {
          id: crypto.randomUUID(),
          title: editTitle,
          slug,
          excerpt: editExcerpt || null,
          content: editContent || null,
          is_featured: false,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          view_count: 0,
          category_id: editCategoryId,
          is_published: true,
          kb_categories: categories.find(c => c.id === editCategoryId) ? { name: categories.find(c => c.id === editCategoryId)!.name, slug: categories.find(c => c.id === editCategoryId)!.slug } : null,
        };
        setArticles(prev => [newArt, ...prev]);
      } else {
        setArticles(prev => prev.map(a => a.id === editArticle?.id ? { ...a, title: editTitle, excerpt: editExcerpt || null, content: editContent || null, category_id: editCategoryId } : a));
      }
      toast.success(isNewArticle ? 'Article created' : 'Article updated');
      setEditArticle(null);
      return;
    }

    try {
      if (isNewArticle) {
        const { error } = await supabase.from('kb_articles').insert({
          title: editTitle, slug, excerpt: editExcerpt || null, content: editContent || null,
          category_id: editCategoryId, is_published: true, published_at: new Date().toISOString(),
        });
        if (error) throw error;
        toast.success('Article created');
      } else {
        const { error } = await supabase.from('kb_articles').update({
          title: editTitle, slug, excerpt: editExcerpt || null, content: editContent || null, category_id: editCategoryId,
        }).eq('id', editArticle!.id);
        if (error) throw error;
        toast.success('Article updated');
      }
      setEditArticle(null);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save article');
    }
  }

  async function togglePublish(article: KBArticle) {
    const next = !article.is_published;
    if (isPreviewMode) {
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, is_published: next } : a));
      toast.success(next ? 'Published' : 'Unpublished');
      return;
    }
    try {
      const updates: any = { is_published: next };
      if (next) updates.published_at = new Date().toISOString();
      const { error } = await supabase.from('kb_articles').update(updates).eq('id', article.id);
      if (error) throw error;
      toast.success(next ? 'Published' : 'Unpublished');
      fetchData();
    } catch (err) {
      toast.error('Failed to update');
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
      fetchData();
    } catch (err) {
      toast.error('Failed to delete');
    }
  }

  // Article detail view
  if (selectedArticle) {
    return (
      <DashboardLayout role={role}>
        <div className="p-6 max-w-3xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => setSelectedArticle(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Knowledge Base
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              {selectedArticle.kb_categories && (
                <Badge variant="secondary">{selectedArticle.kb_categories.name}</Badge>
              )}
              {selectedArticle.is_featured && (
                <Badge variant="outline" className="gap-1">
                  <Star className="h-3 w-3" /> Featured
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold">{selectedArticle.title}</h1>
            {selectedArticle.published_at && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Published {new Date(selectedArticle.published_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <Separator />
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {selectedArticle.content ? (
              <div className="whitespace-pre-wrap">{selectedArticle.content}</div>
            ) : (
              <p className="text-muted-foreground">This article's content is being prepared.</p>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={role}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Knowledge Base</h1>
            <p className="text-muted-foreground">Find answers, guides, and documentation</p>
          </div>
          {isStaff && (
            <Button onClick={openNewArticle}>
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          )}
        </div>

        {isPreviewMode && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <Eye className="h-4 w-4" />
            <AlertDescription>
              <strong>Preview Mode:</strong> Displaying sample knowledge base content.
            </AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* Featured articles (only on main view, no search/filter active) */}
        {!searchQuery && !selectedCategory && featuredArticles.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Featured
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {featuredArticles.map((article) => (
                <Card
                  key={article.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedArticle(article)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{article.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      {article.kb_categories && <Badge variant="secondary" className="text-xs">{article.kb_categories.name}</Badge>}
                      <span>{article.view_count} views</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        {!searchQuery && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Categories
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => {
                const count = articles.filter((a) => a.category_id === cat.id).length;
                return (
                  <Card
                    key={cat.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${selectedCategory === cat.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  >
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{cat.icon || '📄'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{cat.name}</p>
                          {cat.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{cat.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{count} article{count !== 1 ? 's' : ''}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Articles list */}
        {(searchQuery || selectedCategory) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {selectedCategory
                  ? categories.find((c) => c.id === selectedCategory)?.name || 'Articles'
                  : `Search results for "${searchQuery}"`}
              </h2>
              {selectedCategory && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                  Clear filter
                </Button>
              )}
            </div>
            {filteredArticles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No articles found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredArticles.map((article) => (
                  <Card
                    key={article.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedArticle(article)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{article.title}</p>
                            {article.is_featured && <Star className="h-3 w-3 text-amber-500" />}
                          </div>
                          {article.excerpt && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{article.excerpt}</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground ml-4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All articles (default view, no filter) */}
        {!searchQuery && !selectedCategory && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">All Articles</h2>
            <div className="space-y-2">
              {articles.map((article) => (
                <Card
                  key={article.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedArticle(article)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                         <div className="flex items-center gap-2">
                           <p className="font-medium">{article.title}</p>
                           {article.is_featured && <Star className="h-3 w-3 text-amber-500" />}
                           {isStaff && !article.is_published && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                         </div>
                         <div className="flex items-center gap-2 mt-1">
                           {article.kb_categories && (
                             <Badge variant="secondary" className="text-xs">{article.kb_categories.name}</Badge>
                           )}
                           <span className="text-xs text-muted-foreground">{article.view_count} views</span>
                         </div>
                       </div>
                       <div className="flex items-center gap-2">
                         {isStaff && (
                           <>
                             <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditArticle(article); }}>
                               <Edit className="h-3 w-3" />
                             </Button>
                             <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); togglePublish(article); }}>
                               {article.is_published ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                             </Button>
                             <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteArticle(article.id); }}>
                               <Trash2 className="h-3 w-3" />
                             </Button>
                           </>
                         )}
                         <ChevronRight className="h-4 w-4 text-muted-foreground" />
                       </div>
                     </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Edit/New Article dialog */}
        <Dialog open={!!editArticle} onOpenChange={open => { if (!open) setEditArticle(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{isNewArticle ? 'New Article' : 'Edit Article'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={editTitle} onChange={e => setEditTitle(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editCategoryId || ''} onValueChange={setEditCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Excerpt</Label><Textarea value={editExcerpt} onChange={e => setEditExcerpt(e.target.value)} rows={2} /></div>
              <div className="space-y-2"><Label>Content (Markdown)</Label><Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={12} className="font-mono text-sm" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditArticle(null)}>Cancel</Button>
              <Button onClick={saveArticle}>{isNewArticle ? 'Create' : 'Save Changes'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
