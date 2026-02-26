import DashboardLayout from '@/components/layout/DashboardLayout';
import NotificationPreferences from '@/components/notifications/NotificationPreferences';

interface NotificationSettingsProps {
  role: 'client' | 'support' | 'admin' | 'ops';
}

export default function NotificationSettings({ role }: NotificationSettingsProps) {
  return (
    <DashboardLayout role={role}>
      <div className="p-6 max-w-2xl">
        <h1 className="text-xl font-bold mb-6">Notification Settings</h1>
        <NotificationPreferences />
      </div>
    </DashboardLayout>
  );
}
