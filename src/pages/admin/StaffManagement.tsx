import { useEffect, useState } from 'react';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, Users, UserPlus, Trash2, Loader2, Shield, ShieldCheck } from 'lucide-react';

interface StaffMember {
  id: string; // user_roles row id
  user_id: string;
  role: string;
  email: string;
  full_name: string | null;
}

const mockStaff: StaffMember[] = [
  { id: '1', user_id: 'u1', role: 'admin', email: 'admin@agency.com', full_name: 'Sarah Admin' },
  { id: '2', user_id: 'u2', role: 'support', email: 'sarah@agency.com', full_name: 'Sarah Chen' },
  { id: '3', user_id: 'u3', role: 'support', email: 'mike@agency.com', full_name: 'Mike Johnson' },
];

const roleConfig: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'outline' }> = {
  admin: { label: 'Admin', icon: <ShieldCheck className="h-3 w-3" />, variant: 'default' },
  support: { label: 'Team Member', icon: <Shield className="h-3 w-3" />, variant: 'secondary' },
};

export default function StaffManagement() {
  const { isPreviewMode } = usePreviewMode();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add staff dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<string>('support');
  const [isAdding, setIsAdding] = useState(false);

  // Remove confirmation
  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (isPreviewMode) {
      setStaff(mockStaff);
      setIsLoading(false);
    } else {
      fetchStaff();
    }
  }, [isPreviewMode]);

  async function fetchStaff() {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('id, user_id, role')
        .in('role', ['admin', 'support']);

      if (!roles || roles.length === 0) { setStaff([]); setIsLoading(false); return; }

      const userIds = [...new Set(roles.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      setStaff(roles.map(r => {
        const p = profileMap.get(r.user_id);
        return { id: r.id, user_id: r.user_id, role: r.role, email: p?.email || '', full_name: p?.full_name || null };
      }));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load staff');
    } finally {
      setIsLoading(false);
    }
  }

  async function addStaffMember() {
    if (!addEmail.trim() || !addRole) return;
    if (isPreviewMode) {
      setStaff(prev => [...prev, { id: `m-${Date.now()}`, user_id: `u-${Date.now()}`, role: addRole, email: addEmail.trim(), full_name: null }]);
      setShowAddDialog(false);
      setAddEmail('');
      setAddRole('support');
      toast.success('Staff member added');
      return;
    }

    setIsAdding(true);
    try {
      // Find user by email
      const { data: profile } = await supabase.from('profiles').select('user_id, email, full_name').eq('email', addEmail.trim()).maybeSingle();
      if (!profile) { toast.error('No user found with that email. They must sign up first.'); setIsAdding(false); return; }

      // Check if they already have this role
      const existing = staff.find(s => s.user_id === profile.user_id && s.role === addRole);
      if (existing) { toast.error(`User already has the ${roleConfig[addRole]?.label} role.`); setIsAdding(false); return; }

      const { data: inserted, error } = await supabase
        .from('user_roles')
        .insert({ user_id: profile.user_id, role: addRole as any })
        .select('id, user_id, role')
        .single();
      if (error) throw error;

      setStaff(prev => [...prev, { id: inserted.id, user_id: inserted.user_id, role: inserted.role, email: profile.email, full_name: profile.full_name }]);
      setShowAddDialog(false);
      setAddEmail('');
      setAddRole('support');
      toast.success('Staff member added');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add staff member');
    } finally {
      setIsAdding(false);
    }
  }

  async function removeStaffMember() {
    if (!removeTarget) return;
    if (isPreviewMode) {
      setStaff(prev => prev.filter(s => s.id !== removeTarget.id));
      setRemoveTarget(null);
      toast.success('Access revoked');
      return;
    }

    setIsRemoving(true);
    try {
      const { error } = await supabase.from('user_roles').delete().eq('id', removeTarget.id);
      if (error) throw error;
      setStaff(prev => prev.filter(s => s.id !== removeTarget.id));
      setRemoveTarget(null);
      toast.success('Access revoked');
    } catch {
      toast.error('Failed to revoke access');
    } finally {
      setIsRemoving(false);
    }
  }

  // Group by user — a user may have multiple roles
  const grouped = staff.reduce<Record<string, StaffMember[]>>((acc, s) => {
    if (!acc[s.user_id]) acc[s.user_id] = [];
    acc[s.user_id].push(s);
    return acc;
  }, {});

  const userEntries = Object.values(grouped).sort((a, b) => {
    const aName = a[0].full_name || a[0].email;
    const bName = b[0].full_name || b[0].email;
    return aName.localeCompare(bName);
  });

  return (
    <DashboardLayout role="admin">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Staff Management</h1>
            <p className="text-muted-foreground">Manage team access and roles</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />Add Staff Member
          </Button>
        </div>

        {isPreviewMode && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <Eye className="h-4 w-4" />
            <AlertDescription><strong>Preview Mode:</strong> Sample data shown.</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : userEntries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No staff members found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {userEntries.map(roles => {
              const primary = roles[0];
              const initials = primary.full_name
                ? primary.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : primary.email[0].toUpperCase();

              return (
                <Card key={primary.user_id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{primary.full_name || primary.email}</p>
                          {primary.full_name && <p className="text-sm text-muted-foreground truncate">{primary.email}</p>}
                        </div>
                        <div className="flex gap-1.5 ml-2">
                          {roles.map(r => {
                            const cfg = roleConfig[r.role] || { label: r.role, icon: null, variant: 'outline' as const };
                            return (
                              <Badge key={r.id} variant={cfg.variant} className="gap-1">
                                {cfg.icon}{cfg.label}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0 ml-4">
                        {roles.map(r => (
                          <Button
                            key={r.id}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title={`Remove ${roleConfig[r.role]?.label || r.role} role`}
                            onClick={() => setRemoveTarget(r)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add Staff Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
              <DialogDescription>Grant staff access to an existing user by email address.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  placeholder="user@agency.com"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStaffMember(); } }}
                />
              </div>
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={addRole} onValueChange={setAddRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="support">Team Member — Can manage tickets and clients</SelectItem>
                    <SelectItem value="admin">Admin — Full system access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">The user must have an account first. They'll gain access immediately.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={addStaffMember} disabled={isAdding || !addEmail.trim()}>
                {isAdding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</> : 'Add Staff Member'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Confirmation Dialog */}
        <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revoke Access</DialogTitle>
              <DialogDescription>
                Remove the <strong>{roleConfig[removeTarget?.role || '']?.label || removeTarget?.role}</strong> role from <strong>{removeTarget?.full_name || removeTarget?.email}</strong>? They will lose access to staff features for this role immediately.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={removeStaffMember} disabled={isRemoving}>
                {isRemoving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Removing...</> : 'Revoke Access'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
