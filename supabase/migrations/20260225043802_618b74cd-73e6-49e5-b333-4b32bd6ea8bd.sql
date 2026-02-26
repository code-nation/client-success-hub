
-- Allow admins to insert organization members
CREATE POLICY "Admins can insert org members"
ON public.organization_members
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete organization members
CREATE POLICY "Admins can delete org members"
ON public.organization_members
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow support staff to insert org members
CREATE POLICY "Support can insert org members"
ON public.organization_members
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'support'::app_role));

-- Allow support staff to delete org members
CREATE POLICY "Support can delete org members"
ON public.organization_members
FOR DELETE
USING (has_role(auth.uid(), 'support'::app_role));
