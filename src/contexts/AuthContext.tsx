import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'client' | 'support' | 'admin' | 'ops';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: AppRole[];
  isLoading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  primaryRole: AppRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USER: User = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'admin@example.com',
  app_metadata: {},
  user_metadata: { full_name: 'Admin User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  role: 'authenticated',
  factor_id: null,
  phone: '',
} as User;

const MOCK_PROFILE: UserProfile = {
  id: 'mock-profile-id',
  user_id: '00000000-0000-0000-0000-000000000000',
  email: 'admin@example.com',
  full_name: 'Admin User',
  avatar_url: null,
  phone: null,
};

const MOCK_ROLES: AppRole[] = ['admin', 'ops', 'support', 'client'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(MOCK_USER);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(MOCK_PROFILE);
  const [roles, setRoles] = useState<AppRole[]>(MOCK_ROLES);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          fetchUserData(session.user.id);
        } else {
          // Keep mock user if no real session
          setSession(null);
          setUser(MOCK_USER);
          setProfile(MOCK_PROFILE);
          setRoles(MOCK_ROLES);
          setIsLoading(false);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        fetchUserData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId: string) {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as UserProfile);
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesData) {
        setRoles(rolesData.map(r => r.role as AppRole));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function signInWithMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  }

  function hasRole(role: AppRole): boolean {
    return roles.includes(role);
  }

  // Determine primary role for routing (priority: ops > admin > support > client)
  const primaryRole: AppRole | null = roles.includes('ops')
    ? 'ops'
    : roles.includes('admin')
    ? 'admin'
    : roles.includes('support')
    ? 'support'
    : roles.includes('client')
    ? 'client'
    : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading,
        signInWithMagicLink,
        signOut,
        hasRole,
        primaryRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
