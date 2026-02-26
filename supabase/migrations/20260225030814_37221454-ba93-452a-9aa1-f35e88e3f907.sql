
-- Create documents table
CREATE TABLE public.client_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  uploaded_by_user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  content_type TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own org documents"
  ON public.client_documents FOR SELECT
  USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Clients can upload documents"
  ON public.client_documents FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by_user_id AND user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Clients can delete own documents"
  ON public.client_documents FOR DELETE
  USING (auth.uid() = uploaded_by_user_id AND user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Staff can view all documents"
  ON public.client_documents FOR SELECT
  USING (has_role(auth.uid(), 'support'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'ops'::app_role));

CREATE POLICY "Staff can manage all documents"
  ON public.client_documents FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for client documents
INSERT INTO storage.buckets (id, name, public) VALUES ('client-documents', 'client-documents', false);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view own org documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'client-documents' AND auth.role() = 'authenticated');
