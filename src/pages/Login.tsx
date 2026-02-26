import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, CheckCircle, Eye } from 'lucide-react';

// Note: backend email rate-limits can last longer than 60s.
// We start with a conservative 5 minutes and back off further on repeated 429s.
const OTP_BASE_COOLDOWN_SECONDS = 5 * 60;
const OTP_MAX_COOLDOWN_SECONDS = 30 * 60;
const OTP_COOLDOWN_STORAGE_KEY = 'auth:otp_cooldown_until';
const OTP_BACKOFF_SECONDS_KEY = 'auth:otp_backoff_seconds';

export default function Login() {
  const { user, isLoading, signInWithMagicLink, primaryRole } = useAuth();
  const { isPreviewMode, enablePreviewMode } = usePreviewMode();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [cooldownUntilMs, setCooldownUntilMs] = useState<number>(() => {
    const raw = localStorage.getItem(OTP_COOLDOWN_STORAGE_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  });
  const [nowMs, setNowMs] = useState(() => Date.now());

  const remainingSeconds = useMemo(() => {
    const remaining = Math.ceil((cooldownUntilMs - nowMs) / 1000);
    return Math.max(0, remaining);
  }, [cooldownUntilMs, nowMs]);

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [remainingSeconds]);

  // Check if we're in a preview environment
  const isPreviewEnv =
    window.location.hostname.includes('lovableproject.com') ||
    window.location.hostname.includes('lovable.app') ||
    window.location.hostname === 'localhost';

  function handleEnterPreviewMode() {
    enablePreviewMode();
    navigate('/client');
  }

  // If preview mode is enabled, redirect to client dashboard
  if (isPreviewMode) {
    return <Navigate to="/client" replace />;
  }

  function startCooldown(seconds: number) {
    const until = Date.now() + seconds * 1000;
    localStorage.setItem(OTP_COOLDOWN_STORAGE_KEY, String(until));
    setCooldownUntilMs(until);
    setNowMs(Date.now());
  }

  function startBackoffCooldown() {
    const raw = localStorage.getItem(OTP_BACKOFF_SECONDS_KEY);
    const prev = raw ? Number(raw) : 0;
    const next = Math.min(
      OTP_MAX_COOLDOWN_SECONDS,
      Math.max(OTP_BASE_COOLDOWN_SECONDS, Number.isFinite(prev) && prev > 0 ? prev * 2 : 0)
    );
    localStorage.setItem(OTP_BACKOFF_SECONDS_KEY, String(next));
    startCooldown(next);
    return next;
  }

  function resetBackoffCooldown() {
    localStorage.removeItem(OTP_BACKOFF_SECONDS_KEY);
  }

  // Redirect if already logged in
  if (user && primaryRole) {
    const redirectPath = `/${primaryRole}`;
    return <Navigate to={redirectPath} replace />;
  }

  if (user && !isLoading && !primaryRole) {
    // User is logged in but has no role assigned
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-brand p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Access Pending</CardTitle>
            <CardDescription>
              Your account has been created but you don't have access yet.
              Please contact your administrator to assign you a role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    if (remainingSeconds > 0) {
      toast({
        title: 'Please wait',
        description: `Too many requests. Try again in ${remainingSeconds}s.`,
      });
      return;
    }

    setIsSending(true);
    const { error } = await signInWithMagicLink(email);

    if (error) {
      const anyErr = error as any;
      const isRateLimited =
        anyErr?.status === 429 ||
        anyErr?.code === 'over_email_send_rate_limit' ||
        String(anyErr?.message ?? '').toLowerCase().includes('rate limit');

      if (isRateLimited) {
        const seconds = startBackoffCooldown();
        toast({
          title: 'Email rate limit reached',
          description: `Please wait ${Math.ceil(seconds / 60)} minutes and try again.`,
          variant: 'destructive',
        });
        setIsSending(false);
        return;
      }

      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      // Success means we're no longer rate-limited; reset backoff.
      resetBackoffCooldown();
      setEmailSent(true);
      toast({
        title: 'Check your email',
        description: 'We sent you a magic link to sign in.',
      });
    }
    setIsSending(false);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-brand">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-brand p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-accent">CN</span>
          </div>
          <div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription className="mt-2">
              Sign in to access your customer portal
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-medium">Check your email</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  We sent a magic link to <strong>{email}</strong>
                </p>
              </div>
              <Button
                variant="ghost"
                className="text-sm"
                onClick={() => setEmailSent(false)}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSending || remainingSeconds > 0}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  remainingSeconds > 0
                    ? `Try again in ${Math.ceil(remainingSeconds / 60)}m`
                    : 'Send magic link'
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                We'll send you a secure link to sign in without a password.
              </p>

              {/* Preview mode button - only in preview environments */}
              {isPreviewEnv && (
                <div className="pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleEnterPreviewMode}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Enter Preview Mode
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Bypass login to preview the UI (dev only)
                  </p>
                </div>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
