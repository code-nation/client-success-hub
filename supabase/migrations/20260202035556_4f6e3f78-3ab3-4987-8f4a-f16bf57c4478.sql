-- =============================================
-- CUSTOMER PORTAL DATABASE SCHEMA
-- Phase 1: Core Tables & Role-Based Access
-- =============================================

-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('client', 'support', 'admin', 'ops');

-- Create ticket status enum
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'waiting_on_client', 'resolved', 'closed');

-- Create ticket priority enum  
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create account status enum
CREATE TYPE public.account_status AS ENUM ('active', 'paused', 'suspended', 'overdue');

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Profiles: users can update their own profile  
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Profiles: users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- USER ROLES TABLE (separate per security requirements)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get all roles for a user
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(role), ARRAY[]::app_role[])
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- User roles: users can see their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- User roles: admins can manage all roles
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- ORGANIZATIONS (CLIENTS) TABLE
-- =============================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  website TEXT,
  stripe_customer_id TEXT UNIQUE,
  account_status account_status NOT NULL DEFAULT 'active',
  payment_overdue_since TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ORGANIZATION MEMBERS (links users to orgs)
-- =============================================
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_primary_contact BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Function to check if user belongs to organization
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

-- Function to get user's organization ID
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Org members: clients can see their own org membership
CREATE POLICY "Users can view own org membership"
  ON public.organization_members FOR SELECT
  USING (auth.uid() = user_id);

-- Org members: staff/admin can view all
CREATE POLICY "Staff can view all org members"
  ON public.organization_members FOR SELECT
  USING (
    public.has_role(auth.uid(), 'support') OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'ops')
  );

-- Organizations: clients can view their own org
CREATE POLICY "Clients can view own organization"
  ON public.organizations FOR SELECT
  USING (
    public.user_belongs_to_org(auth.uid(), id)
  );

-- Organizations: staff can view all
CREATE POLICY "Staff can view all organizations"
  ON public.organizations FOR SELECT
  USING (
    public.has_role(auth.uid(), 'support') OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'ops')
  );

-- Organizations: admins can manage
CREATE POLICY "Admins can manage organizations"
  ON public.organizations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- HOUR ALLOCATIONS (retainer hours)
-- =============================================
CREATE TABLE public.hour_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  total_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  used_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  stripe_subscription_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hour_allocations ENABLE ROW LEVEL SECURITY;

-- Hour allocations: clients can view their org's allocations
CREATE POLICY "Clients can view own hour allocations"
  ON public.hour_allocations FOR SELECT
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
  );

-- Hour allocations: staff can view all
CREATE POLICY "Staff can view all hour allocations"
  ON public.hour_allocations FOR SELECT
  USING (
    public.has_role(auth.uid(), 'support') OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'ops')
  );

-- Hour allocations: admins can manage
CREATE POLICY "Admins can manage hour allocations"
  ON public.hour_allocations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- SUPPORT TICKETS
-- =============================================
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  created_by_user_id UUID REFERENCES auth.users(id) NOT NULL,
  assigned_to_user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  category TEXT,
  resolved_at TIMESTAMPTZ,
  sla_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Tickets: clients can view their org's tickets
CREATE POLICY "Clients can view own org tickets"
  ON public.tickets FOR SELECT
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
  );

-- Tickets: clients can create tickets for their org
CREATE POLICY "Clients can create tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (
    public.user_belongs_to_org(auth.uid(), organization_id) AND
    auth.uid() = created_by_user_id
  );

-- Tickets: clients can update their own tickets (limited fields handled in app)
CREATE POLICY "Clients can update own tickets"
  ON public.tickets FOR UPDATE
  USING (
    public.user_belongs_to_org(auth.uid(), organization_id)
  );

-- Tickets: staff can view all tickets
CREATE POLICY "Staff can view all tickets"
  ON public.tickets FOR SELECT
  USING (
    public.has_role(auth.uid(), 'support') OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'ops')
  );

-- Tickets: staff can manage tickets
CREATE POLICY "Staff can manage tickets"
  ON public.tickets FOR ALL
  USING (
    public.has_role(auth.uid(), 'support') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- =============================================
-- TICKET MESSAGES
-- =============================================
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Function to get ticket's organization
CREATE OR REPLACE FUNCTION public.get_ticket_org_id(_ticket_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.tickets
  WHERE id = _ticket_id
$$;

-- Messages: clients can view non-internal messages on their org's tickets
CREATE POLICY "Clients can view public messages"
  ON public.ticket_messages FOR SELECT
  USING (
    NOT is_internal AND
    public.user_belongs_to_org(auth.uid(), public.get_ticket_org_id(ticket_id))
  );

-- Messages: clients can create messages on their org's tickets
CREATE POLICY "Clients can create messages"
  ON public.ticket_messages FOR INSERT
  WITH CHECK (
    NOT is_internal AND
    auth.uid() = user_id AND
    public.user_belongs_to_org(auth.uid(), public.get_ticket_org_id(ticket_id))
  );

-- Messages: staff can view all messages
CREATE POLICY "Staff can view all messages"
  ON public.ticket_messages FOR SELECT
  USING (
    public.has_role(auth.uid(), 'support') OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'ops')
  );

-- Messages: staff can create messages
CREATE POLICY "Staff can create messages"
  ON public.ticket_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (public.has_role(auth.uid(), 'support') OR public.has_role(auth.uid(), 'admin'))
  );

-- =============================================
-- TICKET TIME LOGS
-- =============================================
CREATE TABLE public.ticket_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  hours DECIMAL(10,2) NOT NULL,
  description TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_time_logs ENABLE ROW LEVEL SECURITY;

-- Time logs: clients can view time logged on their tickets
CREATE POLICY "Clients can view time logs"
  ON public.ticket_time_logs FOR SELECT
  USING (
    public.user_belongs_to_org(auth.uid(), public.get_ticket_org_id(ticket_id))
  );

-- Time logs: staff can view all
CREATE POLICY "Staff can view all time logs"
  ON public.ticket_time_logs FOR SELECT
  USING (
    public.has_role(auth.uid(), 'support') OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'ops')
  );

-- Time logs: staff can create
CREATE POLICY "Staff can create time logs"
  ON public.ticket_time_logs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (public.has_role(auth.uid(), 'support') OR public.has_role(auth.uid(), 'admin'))
  );

-- Time logs: staff can update own logs
CREATE POLICY "Staff can update own time logs"
  ON public.ticket_time_logs FOR UPDATE
  USING (
    auth.uid() = user_id AND
    (public.has_role(auth.uid(), 'support') OR public.has_role(auth.uid(), 'admin'))
  );

-- =============================================
-- KNOWLEDGE BASE CATEGORIES
-- =============================================
CREATE TABLE public.kb_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;

-- KB categories: everyone can view
CREATE POLICY "Anyone can view kb categories"
  ON public.kb_categories FOR SELECT
  USING (true);

-- KB categories: admins can manage
CREATE POLICY "Admins can manage kb categories"
  ON public.kb_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- KNOWLEDGE BASE ARTICLES
-- =============================================
CREATE TABLE public.kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.kb_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  view_count INT DEFAULT 0,
  author_id UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

-- KB articles: everyone can view published articles
CREATE POLICY "Anyone can view published articles"
  ON public.kb_articles FOR SELECT
  USING (is_published = true);

-- KB articles: staff can view all
CREATE POLICY "Staff can view all articles"
  ON public.kb_articles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'support') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- KB articles: admins can manage
CREATE POLICY "Admins can manage articles"
  ON public.kb_articles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- SATISFACTION SURVEYS
-- =============================================
CREATE TABLE public.satisfaction_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL UNIQUE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- Surveys: clients can view and submit their own
CREATE POLICY "Clients can view own surveys"
  ON public.satisfaction_surveys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Clients can update own surveys"
  ON public.satisfaction_surveys FOR UPDATE
  USING (auth.uid() = user_id);

-- Surveys: staff can view all
CREATE POLICY "Staff can view all surveys"
  ON public.satisfaction_surveys FOR SELECT
  USING (
    public.has_role(auth.uid(), 'support') OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'ops')
  );

-- =============================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hour_allocations_updated_at
  BEFORE UPDATE ON public.hour_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kb_articles_updated_at
  BEFORE UPDATE ON public.kb_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- FUNCTION TO AUTO-DEDUCT HOURS FROM ALLOCATION
-- =============================================
CREATE OR REPLACE FUNCTION public.deduct_hours_on_time_log()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_allocation_id UUID;
BEGIN
  -- Get the organization from the ticket
  SELECT organization_id INTO v_org_id
  FROM public.tickets
  WHERE id = NEW.ticket_id;

  -- Find the current active allocation
  SELECT id INTO v_allocation_id
  FROM public.hour_allocations
  WHERE organization_id = v_org_id
    AND period_start <= CURRENT_DATE
    AND period_end >= CURRENT_DATE
  ORDER BY created_at DESC
  LIMIT 1;

  -- Update the used hours
  IF v_allocation_id IS NOT NULL THEN
    UPDATE public.hour_allocations
    SET used_hours = used_hours + NEW.hours
    WHERE id = v_allocation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_time_log_created
  AFTER INSERT ON public.ticket_time_logs
  FOR EACH ROW EXECUTE FUNCTION public.deduct_hours_on_time_log();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_tickets_org_id ON public.tickets(organization_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_assigned_to ON public.tickets(assigned_to_user_id);
CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX idx_ticket_time_logs_ticket_id ON public.ticket_time_logs(ticket_id);
CREATE INDEX idx_hour_allocations_org_id ON public.hour_allocations(organization_id);
CREATE INDEX idx_kb_articles_category ON public.kb_articles(category_id);
CREATE INDEX idx_kb_articles_published ON public.kb_articles(is_published);
CREATE INDEX idx_satisfaction_surveys_org ON public.satisfaction_surveys(organization_id);