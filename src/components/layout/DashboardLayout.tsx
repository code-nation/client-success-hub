import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotificationBell from '@/components/notifications/NotificationBell';
import {
  Ticket,
  CreditCard,
  LogOut,
  Menu,
  X,
  Bell,
  FolderKanban,
  Building2,
  FileText,
  Users,
  LayoutDashboard,
  ListFilter,
  BookOpen,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  exact?: boolean;
}

interface DashboardLayoutProps {
  children: ReactNode;
  role: 'client' | 'support' | 'admin' | 'ops';
}

const clientNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/client', icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
  { label: 'Support Tickets', href: '/client/tickets', icon: <Ticket className="h-4 w-4" /> },
  { label: 'Projects', href: '/client/hours', icon: <FolderKanban className="h-4 w-4" /> },
  { label: 'Documents', href: '/client/documents', icon: <FileText className="h-4 w-4" /> },
  { label: 'Subscriptions', href: '/client/subscriptions', icon: <CreditCard className="h-4 w-4" /> },
];

const staffNavItems: NavItem[] = [
  { label: 'Overview', href: '/ops', icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
  { label: 'Ticket Queue', href: '/support/tickets', icon: <Ticket className="h-4 w-4" /> },
  { label: 'Ticket Triage', href: '/ops/triage', icon: <ListFilter className="h-4 w-4" /> },
  { label: 'Client Management', href: '/ops/clients', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Support Clients', href: '/support/clients', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Content Management', href: '/ops/content', icon: <BookOpen className="h-4 w-4" /> },
  { label: 'Staff Management', href: '/ops/staff', icon: <Users className="h-4 w-4" /> },
];

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isStaff = ['support', 'admin', 'ops'].includes(role);
  const navItems = isStaff ? staffNavItems : clientNavItems;

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const headerTitle = isStaff ? 'Team Portal' : 'Client Portal';

  const renderNavItem = (item: NavItem) => {
    const isActive = item.exact
      ? location.pathname === item.href
      : location.pathname === item.href || location.pathname.startsWith(item.href + '/');
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={() => setSidebarOpen(false)}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-white',
          isActive
            ? 'bg-sidebar-primary text-white'
            : 'hover:bg-sidebar-accent text-white'
        )}
      >
        {item.icon}
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between h-16 px-4 border-b bg-background">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-lg">{headerTitle}</span>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{profile?.full_name || profile?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo area */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-sidebar-primary flex items-center justify-center">
                <span className="text-sidebar-primary-foreground font-bold text-sm">CN</span>
              </div>
              <span className="font-semibold text-sm">{headerTitle}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navItems.map(renderNavItem)}
            </nav>
          </ScrollArea>

          {/* User section */}
          <div className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 px-3 py-2 h-auto hover:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">{profile?.email}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={`/${isStaff ? 'support' : role}/notifications`}>
                    <Bell className="mr-2 h-4 w-4" />
                    Notification Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="min-h-screen pb-16">{children}</div>
      </main>
    </div>
  );
}
