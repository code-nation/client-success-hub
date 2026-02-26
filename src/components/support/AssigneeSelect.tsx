import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { UserPlus, User, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StaffMember {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface AssigneeSelectProps {
  ticketId: string;
  currentAssigneeId: string | null;
  currentAssignee?: { full_name: string | null; avatar_url: string | null; email: string } | null;
  isPreviewMode?: boolean;
  onAssigned?: (userId: string | null, user: StaffMember | null) => void;
  compact?: boolean;
}

const mockStaff: StaffMember[] = [
  { user_id: 'current-user', full_name: 'Sarah Chen', avatar_url: null, email: 'sarah@agency.com' },
  { user_id: 'other-user', full_name: 'Mike Johnson', avatar_url: null, email: 'mike@agency.com' },
  { user_id: 'user-3', full_name: 'Alex Rivera', avatar_url: null, email: 'alex@agency.com' },
  { user_id: 'user-4', full_name: 'Jordan Lee', avatar_url: null, email: 'jordan@agency.com' },
];

export default function AssigneeSelect({
  ticketId,
  currentAssigneeId,
  currentAssignee,
  isPreviewMode = false,
  onAssigned,
  compact = false,
}: AssigneeSelectProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isPreviewMode) {
      setStaff(mockStaff);
    } else {
      fetchStaff();
    }
  }, [isPreviewMode]);

  async function fetchStaff() {
    try {
      // Get all users with support or admin roles
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['support', 'admin']);

      if (!roleData || roleData.length === 0) return;

      const userIds = roleData.map((r) => r.user_id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, email')
        .in('user_id', userIds);

      if (profileData) {
        setStaff(profileData as StaffMember[]);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  }

  async function assignTicket(userId: string | null) {
    if (isPreviewMode) {
      const selectedUser = userId ? staff.find((s) => s.user_id === userId) || null : null;
      onAssigned?.(userId, selectedUser);
      setOpen(false);
      toast.success(userId ? 'Ticket reassigned' : 'Ticket unassigned');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ assigned_to_user_id: userId })
        .eq('id', ticketId);

      if (error) throw error;

      const selectedUser = userId ? staff.find((s) => s.user_id === userId) || null : null;
      onAssigned?.(userId, selectedUser);
      toast.success(userId ? 'Ticket reassigned' : 'Ticket unassigned');
    } catch (error) {
      console.error('Error reassigning ticket:', error);
      toast.error('Failed to reassign ticket');
    } finally {
      setIsUpdating(false);
      setOpen(false);
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return null;
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {currentAssigneeId && currentAssignee ? (
          <Button
            variant="ghost"
            size={compact ? 'sm' : 'default'}
            className={cn('gap-2', compact ? 'h-8 px-2' : '')}
            disabled={isUpdating}
          >
            <Avatar className={compact ? 'h-5 w-5' : 'h-6 w-6'}>
              <AvatarImage src={currentAssignee.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">
                {getInitials(currentAssignee.full_name) || <User className="h-3 w-3" />}
              </AvatarFallback>
            </Avatar>
            <span className={cn('truncate', compact ? 'max-w-[70px] text-xs' : 'max-w-[100px] text-sm')}>
              {currentAssignee.full_name || currentAssignee.email.split('@')[0]}
            </span>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled={isUpdating} className="gap-1">
            <UserPlus className="h-4 w-4" />
            {!compact && 'Assign'}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Search team..." />
          <CommandList>
            <CommandEmpty>No team members found</CommandEmpty>
            <CommandGroup>
              {currentAssigneeId && (
                <CommandItem onSelect={() => assignTicket(null)} className="text-muted-foreground">
                  <User className="h-4 w-4 mr-2" />
                  Unassign
                </CommandItem>
              )}
              {staff.map((member) => (
                <CommandItem
                  key={member.user_id}
                  onSelect={() => assignTicket(member.user_id)}
                  className="gap-2"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-[9px]">
                      {getInitials(member.full_name) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-sm">
                    {member.full_name || member.email.split('@')[0]}
                  </span>
                  {member.user_id === currentAssigneeId && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
