
-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'ticket_assigned', 'ticket_status_changed', 'ticket_reply'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  ticket_assigned_inapp BOOLEAN NOT NULL DEFAULT true,
  ticket_assigned_email BOOLEAN NOT NULL DEFAULT true,
  ticket_status_changed_inapp BOOLEAN NOT NULL DEFAULT true,
  ticket_status_changed_email BOOLEAN NOT NULL DEFAULT true,
  ticket_reply_inapp BOOLEAN NOT NULL DEFAULT true,
  ticket_reply_email BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see/manage their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- System inserts notifications via trigger (SECURITY DEFINER), so no INSERT policy needed for users
-- But we need service role to insert, so add a policy for triggers
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- RLS: Users can manage own preferences
CREATE POLICY "Users can view own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: notify assignee when ticket is assigned
CREATE OR REPLACE FUNCTION public.notify_ticket_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when assigned_to_user_id changes and is not null
  IF NEW.assigned_to_user_id IS NOT NULL AND 
     (OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id) THEN
    INSERT INTO public.notifications (user_id, type, title, body, ticket_id)
    VALUES (
      NEW.assigned_to_user_id,
      'ticket_assigned',
      'Ticket assigned to you',
      'Ticket "' || NEW.title || '" has been assigned to you.',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_assigned
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_assigned();

-- Also trigger on INSERT for auto-assigned tickets
CREATE TRIGGER on_ticket_created_assigned
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  WHEN (NEW.assigned_to_user_id IS NOT NULL)
  EXECUTE FUNCTION public.notify_ticket_assigned();

-- Trigger: notify assignee + creator when status changes
CREATE OR REPLACE FUNCTION public.notify_ticket_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify assignee (if not the one who changed it - we can't tell who changed it in a trigger, so notify both)
    IF NEW.assigned_to_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, ticket_id)
      VALUES (
        NEW.assigned_to_user_id,
        'ticket_status_changed',
        'Ticket status updated',
        'Ticket "' || NEW.title || '" status changed to ' || REPLACE(NEW.status::text, '_', ' ') || '.',
        NEW.id
      );
    END IF;
    -- Notify ticket creator
    IF NEW.created_by_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
      INSERT INTO public.notifications (user_id, type, title, body, ticket_id)
      VALUES (
        NEW.created_by_user_id,
        'ticket_status_changed',
        'Ticket status updated',
        'Ticket "' || NEW.title || '" status changed to ' || REPLACE(NEW.status::text, '_', ' ') || '.',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_status_changed
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_status_changed();

-- Trigger: notify on new non-internal ticket message
CREATE OR REPLACE FUNCTION public.notify_ticket_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ticket RECORD;
BEGIN
  -- Only for non-internal messages
  IF NEW.is_internal THEN
    RETURN NEW;
  END IF;

  SELECT id, title, assigned_to_user_id, created_by_user_id
  INTO v_ticket
  FROM public.tickets
  WHERE id = NEW.ticket_id;

  -- Notify assignee if reply is not from them
  IF v_ticket.assigned_to_user_id IS NOT NULL AND v_ticket.assigned_to_user_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, ticket_id)
    VALUES (
      v_ticket.assigned_to_user_id,
      'ticket_reply',
      'New reply on ticket',
      'New reply on "' || v_ticket.title || '".',
      v_ticket.id
    );
  END IF;

  -- Notify creator if reply is not from them
  IF v_ticket.created_by_user_id != NEW.user_id AND v_ticket.created_by_user_id IS DISTINCT FROM v_ticket.assigned_to_user_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, ticket_id)
    VALUES (
      v_ticket.created_by_user_id,
      'ticket_reply',
      'New reply on ticket',
      'New reply on "' || v_ticket.title || '".',
      v_ticket.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_reply
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_reply();

-- Trigger to auto-update updated_at on notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
