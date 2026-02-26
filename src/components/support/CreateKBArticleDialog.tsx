import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BookOpen, Sparkles, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';

interface TicketMessage {
  author: string;
  content: string;
  is_internal: boolean;
}

interface CreateKBArticleDialogProps {
  ticketTitle: string;
  ticketDescription: string | null;
  ticketCategory: string | null;
  messages: TicketMessage[];
  isPreviewMode?: boolean;
}

interface KBCategory {
  id: string;
  name: string;
}

interface SimilarArticle {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string;
  is_published: boolean;
}

export default function CreateKBArticleDialog({
  ticketTitle,
  ticketDescription,
  ticketCategory,
  messages,
  isPreviewMode = false,
}: CreateKBArticleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [similarArticles, setSimilarArticles] = useState<SimilarArticle[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateCheckDone, setDuplicateCheckDone] = useState(false);
  const [proceedAnyway, setProceedAnyway] = useState(false);

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchCategories();
      checkForSimilarArticles();
    } else {
      // Reset on close
      setSimilarArticles([]);
      setDuplicateCheckDone(false);
      setProceedAnyway(false);
    }
  }, [open]);

  async function checkForSimilarArticles() {
    setIsCheckingDuplicates(true);
    try {
      if (isPreviewMode) {
        await new Promise((r) => setTimeout(r, 500));
        setSimilarArticles([
          { id: '1', title: 'Fixing Mobile Display Issues', excerpt: 'Common solutions for responsive layout problems.', slug: 'fixing-mobile-display', is_published: true },
        ]);
        setDuplicateCheckDone(true);
        return;
      }

      // Extract keywords from ticket title (words 3+ chars, lowercased)
      const keywords = ticketTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !['the', 'and', 'for', 'with', 'how', 'can', 'not', 'this', 'that', 'from'].includes(w));

      if (keywords.length === 0) {
        setDuplicateCheckDone(true);
        return;
      }

      // Search using ilike for each keyword
      const orFilter = keywords.map((kw) => `title.ilike.%${kw}%`).join(',');
      const { data } = await supabase
        .from('kb_articles')
        .select('id, title, excerpt, slug, is_published')
        .or(orFilter)
        .limit(5);

      setSimilarArticles(data || []);
      setDuplicateCheckDone(true);
    } catch (err) {
      console.error('Error checking duplicates:', err);
      setDuplicateCheckDone(true);
    } finally {
      setIsCheckingDuplicates(false);
    }
  }

  async function fetchCategories() {
    if (isPreviewMode) {
      setCategories([
        { id: '1', name: 'Getting Started' },
        { id: '2', name: 'Website Management' },
        { id: '3', name: 'SEO & Marketing' },
        { id: '4', name: 'Email & Integrations' },
        { id: '5', name: 'Billing & Account' },
      ]);
      return;
    }
    const { data } = await supabase
      .from('kb_categories')
      .select('id, name')
      .order('sort_order', { ascending: true });
    if (data) setCategories(data);
  }

  async function generateDraft() {
    setIsDrafting(true);
    try {
      if (isPreviewMode) {
        // Simulate AI response in preview
        await new Promise((r) => setTimeout(r, 1500));
        setTitle('How to Resolve Mobile Display Issues');
        setExcerpt(
          'A step-by-step guide to diagnosing and fixing website display problems on mobile devices.'
        );
        setContent(
          '# How to Resolve Mobile Display Issues\n\nIf your website isn\'t displaying correctly on mobile devices, follow these steps:\n\n## 1. Check Viewport Settings\nEnsure your site has the correct viewport meta tag in the `<head>`.\n\n## 2. Test Responsive Breakpoints\nUse browser developer tools to test at common screen sizes (375px, 414px, 768px).\n\n## 3. Review CSS Media Queries\nLook for overlapping elements or missing responsive styles.\n\n## 4. Clear Cache\nMobile browsers aggressively cache CSS — try clearing cache or using incognito mode.\n\n## Need More Help?\nSubmit a support ticket and our team will investigate further.'
        );
        toast.success('AI draft generated');
        return;
      }

      const { data, error } = await supabase.functions.invoke('draft-kb-article', {
        body: {
          ticketTitle,
          ticketDescription,
          messages,
          categoryName: ticketCategory,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setTitle(data.title || '');
      setExcerpt(data.excerpt || '');
      setContent(data.content || '');
      toast.success('AI draft generated — review and edit before saving');
    } catch (err) {
      console.error('Error generating draft:', err);
      toast.error('Failed to generate draft');
    } finally {
      setIsDrafting(false);
    }
  }

  async function saveArticle() {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (isPreviewMode) {
      toast.success('Article saved as draft (preview mode)');
      setOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { error } = await supabase.from('kb_articles').insert({
        title,
        slug,
        excerpt: excerpt || null,
        content: content || null,
        category_id: categoryId || null,
        is_published: false, // Save as draft for admin review
        is_featured: false,
      });

      if (error) throw error;

      toast.success('Article saved as draft — an admin can review and publish it');
      setOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error saving article:', err);
      toast.error('Failed to save article');
    } finally {
      setIsSaving(false);
    }
  }

  function resetForm() {
    setTitle('');
    setExcerpt('');
    setContent('');
    setCategoryId('');
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookOpen className="h-4 w-4" />
          Create KB Article
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Create Knowledge Base Article
          </DialogTitle>
          <DialogDescription>
            Generate a knowledge base article from this ticket's conversation. The AI will generalize the content, removing client-specific details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Duplicate check loading */}
          {isCheckingDuplicates && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-md border">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking for similar existing articles…
            </div>
          )}

          {/* Similar articles found */}
          {duplicateCheckDone && similarArticles.length > 0 && !proceedAnyway && !title && !content && (
            <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Similar articles already exist</p>
                  <p className="text-xs text-muted-foreground">
                    Consider editing an existing article instead of creating a duplicate.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {similarArticles.map((article) => (
                  <div key={article.id} className="flex items-center justify-between rounded border bg-background p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{article.title}</p>
                      {article.excerpt && (
                        <p className="text-xs text-muted-foreground truncate">{article.excerpt}</p>
                      )}
                      <span className={`text-xs ${article.is_published ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {article.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1 shrink-0 ml-2" asChild>
                      <a href={`/support/knowledge?article=${article.slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3 w-3" />
                        View
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => setProceedAnyway(true)} className="w-full">
                Create new article anyway
              </Button>
            </div>
          )}

          {/* Show draft form when no duplicates or user chose to proceed */}
          {(duplicateCheckDone && (similarArticles.length === 0 || proceedAnyway || title || content)) && (
            <>
          {/* AI Generate button */}
          {!title && !content && (
            <Button
              onClick={generateDraft}
              disabled={isDrafting}
              className="w-full gap-2"
              variant="secondary"
            >
              {isDrafting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isDrafting ? 'Generating draft...' : 'Generate AI Draft from Ticket'}
            </Button>
          )}

          {/* Re-generate if already drafted */}
          {(title || content) && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={generateDraft}
                disabled={isDrafting}
                className="gap-1 text-xs"
              >
                {isDrafting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Regenerate
              </Button>
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-2">
            <Label htmlFor="kb-title">Title</Label>
            <Input
              id="kb-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kb-category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kb-excerpt">Excerpt</Label>
            <Textarea
              id="kb-excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief summary (1-2 sentences)..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kb-content">Content (Markdown)</Label>
            <Textarea
              id="kb-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Full article content..."
              rows={12}
              className="font-mono text-sm"
            />
          </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={saveArticle} disabled={isSaving || !title.trim()}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save as Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
