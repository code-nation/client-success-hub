import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { FolderKanban } from 'lucide-react';

export default function Projects() {
  return (
    <DashboardLayout role="support">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Project management coming soon</p>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <FolderKanban className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              The projects module is currently being designed and will be available in a future update.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
