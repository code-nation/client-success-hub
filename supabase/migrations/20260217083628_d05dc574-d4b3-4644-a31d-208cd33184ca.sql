
-- Add agreed hourly rate to hour_allocations
ALTER TABLE public.hour_allocations
ADD COLUMN agreed_hourly_rate NUMERIC NULL;

-- Add billing contact fields to organizations
ALTER TABLE public.organizations
ADD COLUMN billing_email TEXT NULL,
ADD COLUMN billing_address TEXT NULL,
ADD COLUMN primary_contact_name TEXT NULL,
ADD COLUMN primary_contact_email TEXT NULL,
ADD COLUMN primary_contact_phone TEXT NULL;
