import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Bell, Mail, UserCheck, Ticket, MessageSquare } from 'lucide-react';

interface Preferences {
  ticket_assigned_inapp: boolean;
  ticket_assigned_email: boolean;
  ticket_status_changed_inapp: boolean;
  ticket_status_changed_email: boolean;
  ticket_reply_inapp: boolean;
  ticket_reply_email: boolean;
}

const defaultPrefs: Preferences = {
  ticket_assigned_inapp: true,
  ticket_assigned_email: true,
  ticket_status_changed_inapp: true,
  ticket_status_changed_email: true,
  ticket_reply_inapp: true,
  ticket_reply_email: true,
};

const eventConfig = [
  {
    key: 'ticket_assigned',
    label: 'Ticket assigned',
    description: 'When a ticket is assigned to you',
    icon: UserCheck,
  },
  {
    key: 'ticket_status_changed',
    label: 'Status changed',
    description: 'When a ticket you\'re involved in changes status',
    icon: Ticket,
  },
  {
    key: 'ticket_reply',
    label: 'New reply',
    description: 'When someone replies to a ticket you\'re on',
    icon: MessageSquare,
  },
];

export default function NotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchPrefs();
  }, [user]);

  async function fetchPrefs() {
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (data) {
      setPrefs({
        ticket_assigned_inapp: data.ticket_assigned_inapp,
        ticket_assigned_email: data.ticket_assigned_email,
        ticket_status_changed_inapp: data.ticket_status_changed_inapp,
        ticket_status_changed_email: data.ticket_status_changed_email,
        ticket_reply_inapp: data.ticket_reply_inapp,
        ticket_reply_email: data.ticket_reply_email,
      });
    }
    setIsLoading(false);
  }

  async function updatePref(key: keyof Preferences, value: boolean) {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);

    // Upsert preferences
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(
        { user_id: user!.id, ...newPrefs },
        { onConflict: 'user_id' }
      );

    if (error) {
      toast.error('Failed to save preference');
      setPrefs(prefs); // revert
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading preferences...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to be notified about ticket events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Header row */}
        <div className="grid grid-cols-[1fr,80px,80px] gap-4 mb-4 px-1">
          <span className="text-xs font-medium text-muted-foreground uppercase">Event</span>
          <span className="text-xs font-medium text-muted-foreground uppercase text-center flex items-center justify-center gap-1">
            <Bell className="h-3 w-3" /> In-app
          </span>
          <span className="text-xs font-medium text-muted-foreground uppercase text-center flex items-center justify-center gap-1">
            <Mail className="h-3 w-3" /> Email
          </span>
        </div>
        <Separator className="mb-2" />

        <div className="space-y-1">
          {eventConfig.map((event) => {
            const Icon = event.icon;
            const inappKey = `${event.key}_inapp` as keyof Preferences;
            const emailKey = `${event.key}_email` as keyof Preferences;

            return (
              <div
                key={event.key}
                className="grid grid-cols-[1fr,80px,80px] gap-4 items-center py-3 px-1 rounded-md hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">{event.label}</Label>
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={prefs[inappKey]}
                    onCheckedChange={(v) => updatePref(inappKey, v)}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={prefs[emailKey]}
                    onCheckedChange={(v) => updatePref(emailKey, v)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
