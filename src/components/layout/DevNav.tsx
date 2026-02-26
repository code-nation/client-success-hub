import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { User, Headphones, Briefcase, Shield } from 'lucide-react';

const views = [
  { label: 'Client', href: '/client', icon: User, match: '/client' },
  { label: 'Support', href: '/support', icon: Headphones, match: '/support' },
  { label: 'Ops', href: '/ops', icon: Briefcase, match: '/ops' },
  { label: 'Admin', href: '/admin', icon: Shield, match: '/admin' },
];

export default function DevNav() {
  const { pathname } = useLocation();

  if (pathname === '/login') return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-background/95 backdrop-blur-sm border rounded-full px-2 py-1.5 shadow-lg">
      <span className="text-[10px] font-medium text-muted-foreground px-2 border-r mr-1 whitespace-nowrap">View as</span>
      {views.map(({ label, href, icon: Icon, match }) => {
        const isActive = pathname === match || pathname.startsWith(match + '/');
        return (
          <Link
            key={href}
            to={href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
