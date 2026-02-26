
-- Allow inserting satisfaction surveys (for the automated trigger)
-- Currently INSERT is blocked for satisfaction_surveys. We need to allow inserts from triggers (SECURITY DEFINER)
-- and also allow the system to create surveys.

-- Create a function that auto-creates a satisfaction survey when a ticket is resolved
CREATE OR REPLACE FUNCTION public.create_satisfaction_survey_on_resolve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when status changes TO 'resolved'
  IF NEW.status = 'resolved' AND (OLD.status IS DISTINCT FROM 'resolved') THEN
    -- Check if a survey already exists for this ticket
    IF NOT EXISTS (
      SELECT 1 FROM public.satisfaction_surveys WHERE ticket_id = NEW.id
    ) THEN
      INSERT INTO public.satisfaction_surveys (ticket_id, organization_id, user_id)
      VALUES (NEW.id, NEW.organization_id, NEW.created_by_user_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-creating satisfaction surveys
CREATE TRIGGER create_survey_on_ticket_resolve
AFTER UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.create_satisfaction_survey_on_resolve();

-- Allow clients to insert their own surveys (for manual submission if needed)
CREATE POLICY "Clients can insert own surveys"
ON public.satisfaction_surveys
FOR INSERT
WITH CHECK (auth.uid() = user_id);
