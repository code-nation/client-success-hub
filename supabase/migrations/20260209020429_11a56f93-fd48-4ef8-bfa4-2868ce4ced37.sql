
-- Function to get the primary support contact for an organization
CREATE OR REPLACE FUNCTION public.get_org_primary_support_contact(_org_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.user_id
  FROM public.organization_members om
  WHERE om.organization_id = _org_id
    AND om.is_primary_contact = true
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = om.user_id
        AND ur.role IN ('support', 'admin')
    )
  LIMIT 1;
$$;

-- Trigger function to auto-assign tickets on insert
CREATE OR REPLACE FUNCTION public.auto_assign_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_to_user_id IS NULL THEN
    NEW.assigned_to_user_id := public.get_org_primary_support_contact(NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to tickets table
CREATE TRIGGER auto_assign_ticket_trigger
BEFORE INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_ticket();

-- Allow support/admin/ops staff to view all profiles (for reassignment dropdown)
CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'support')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'ops')
  OR user_id = auth.uid()
);
