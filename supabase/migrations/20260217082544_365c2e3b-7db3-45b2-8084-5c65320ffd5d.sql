
-- Fix: Replace overly permissive INSERT policy with a restrictive one
-- Triggers use SECURITY DEFINER so they bypass RLS. No user should directly insert notifications.
DROP POLICY "System can insert notifications" ON public.notifications;

-- Only allow service role (triggers) to insert - no direct user inserts
-- Since SECURITY DEFINER functions bypass RLS, no INSERT policy is needed at all.
-- But we add one that blocks all direct inserts for safety.
CREATE POLICY "No direct user inserts"
  ON public.notifications FOR INSERT
  WITH CHECK (false);
