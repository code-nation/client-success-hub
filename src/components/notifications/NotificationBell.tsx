import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Bell,
  Check,
  CheckCheck,
  Ticket,
  UserCheck,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const typeIcons: Record<string, typeof Ticket> = {
  ticket_assigned: UserCheck,
  ticket_status_changed: Ticket,
  ticket_reply: MessageSquare,
};

function getTicketPath(roles: string[], ticketId: string | null): string | null {
  if (!ticketId) return null;
  if (roles.includes('admin')) return `/admin/tickets`;
  if (roles.includes('support')) return `/support/tickets/${ticketId}`;
  return `/client/tickets/${ticketId}`;
}

export default function NotificationBell() {
  const { roles } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            <div>
              {notifications.map((notif) => {
                const Icon = typeIcons[notif.type] || Bell;
                const ticketPath = getTicketPath(roles, notif.ticket_id);

                return (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 border-b last:border-0 transition-colors ${
                      !notif.is_read ? 'bg-accent/10' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {notif.body}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(notif.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                          {ticketPath && (
                            <Link
                              to={ticketPath}
                              onClick={() => {
                                if (!notif.is_read) markAsRead(notif.id);
                                setOpen(false);
                              }}
                              className="text-[11px] text-primary hover:underline font-medium"
                            >
                              View ticket →
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {!notif.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => markAsRead(notif.id)}
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteNotification(notif.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
