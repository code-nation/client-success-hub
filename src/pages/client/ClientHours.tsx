import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { FolderKanban, ChevronRight, Loader2 } from 'lucide-react';

interface HourAllocation {
  id: string;
  title: string | null;
  total_hours: number;
  used_hours: number;
  period_start: string;
  period_end: string;
  organization_id: string;
}

export default function ClientHours() {
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const [allocations, setAllocations] = useState<HourAllocation[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user || isPreviewMode) fetchAllocations();
  }, [user, isPreviewMode]);

  async function fetchAllocations() {
    try {
      if (isPreviewMode) {
        // Provide dummy data for preview
        const dummyAllocations: HourAllocation[] = [
          {
            id: 'preview-1',
            title: 'Website Redesign',
            total_hours: 40,
            used_hours: 28.5,
            period_start: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
            period_end: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
            organization_id: 'preview-org',
          },
          {
            id: 'preview-2',
            title: 'Marketing Campaign',
            total_hours: 20,
            used_hours: 20,
            period_start: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0],
            period_end: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
            organization_id: 'preview-org',
          },
          {
            id: 'preview-3',
            title: 'API Integration',
            total_hours: 30,
            used_hours: 5,
            period_start: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
            period_end: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
            organization_id: 'preview-org',
          },
        ];
        setAllocations(dummyAllocations);
        setIsLoading(false);
        return;
      }

      let orgId: string | null = null;
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (membership?.organization_id) {
        orgId = membership.organization_id;
        const { data } = await supabase
          .from('hour_allocations')
          .select('id, title, total_hours, used_hours, period_start, period_end, organization_id')
          .eq('organization_id', orgId)
          .order('period_start', { ascending: false });
        if (data) setAllocations(data as HourAllocation[]);
      }

    } catch (error) {
      console.error('Error fetching allocations:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const formatDateRange = (start: string, end: string) =>
    `${new Date(start).toLocaleDateString()} — ${new Date(end).toLocaleDateString()}`;

  const isCurrent = (alloc: HourAllocation) => {
    const now = new Date();
    return new Date(alloc.period_start) <= now && new Date(alloc.period_end) >= now;
  };

  return (
    <DashboardLayout role="client">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Your project periods, scoped tasks, and hours usage</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : allocations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Projects</h3>
              <p className="text-muted-foreground text-center mt-2">No project periods have been set up yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {allocations.map((alloc) => {
              const pct = alloc.total_hours > 0 ? (alloc.used_hours / alloc.total_hours) * 100 : 0;
              const remaining = Math.max(alloc.total_hours - alloc.used_hours, 0);
              const current = isCurrent(alloc);

              return (
                <Card key={alloc.id} className={current ? 'border-primary/30 bg-primary/5' : ''}>
                  <CardContent className="pt-5 pb-5">
                    <Link to={`/client/hours/${alloc.id}`} className="block">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {alloc.title || formatDateRange(alloc.period_start, alloc.period_end)}
                          </span>
                          {current && <Badge variant="secondary" className="text-xs">Current</Badge>}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {alloc.title && (
                        <p className="text-xs text-muted-foreground mb-3">
                          {formatDateRange(alloc.period_start, alloc.period_end)}
                        </p>
                      )}

                      {/* Hours bar */}
                      <div className="mb-3">
                        <Progress value={pct} className={`h-2 ${pct > 90 ? '[&>div]:bg-destructive' : ''}`} />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{alloc.used_hours.toFixed(1)} / {alloc.total_hours}h used ({pct.toFixed(0)}%)</span>
                          <span>{remaining.toFixed(1)}h remaining</span>
                        </div>
                      </div>

                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
