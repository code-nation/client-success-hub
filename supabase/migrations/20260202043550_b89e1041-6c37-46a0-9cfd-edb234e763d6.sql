-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false);

-- Allow authenticated users to upload files to ticket-attachments bucket
CREATE POLICY "Users can upload ticket attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

-- Allow users to view attachments for tickets in their organization
CREATE POLICY "Users can view ticket attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-attachments'
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create table to track ticket attachments
CREATE TABLE public.ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  uploaded_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments for tickets in their organization
CREATE POLICY "Users can view attachments for their org tickets"
ON public.ticket_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.organization_members om ON om.organization_id = t.organization_id
    WHERE t.id = ticket_attachments.ticket_id
    AND om.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'support')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'ops')
);

-- Users can insert attachments for their org tickets
CREATE POLICY "Users can add attachments to their org tickets"
ON public.ticket_attachments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.organization_members om ON om.organization_id = t.organization_id
    WHERE t.id = ticket_attachments.ticket_id
    AND om.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'support')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'ops')
);

-- Users can delete their own attachments
CREATE POLICY "Users can delete their own attachments"
ON public.ticket_attachments FOR DELETE
TO authenticated
USING (uploaded_by_user_id = auth.uid());