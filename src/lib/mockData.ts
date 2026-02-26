/**
 * Centralized mock data for preview/prototype mode.
 * All pages should reference this file when isPreviewMode is true.
 */

const NOW = Date.now();
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const from = (ms: number) => new Date(NOW + ms).toISOString();
const D = 86400000; // 1 day in ms
const H = 3600000; // 1 hour in ms

// ─── ORGANIZATIONS ──────────────────────────────────────────────────────────

export const mockOrganizations = [
  {
    id: '1',
    name: 'Acme Corp',
    account_status: 'active',
    website: 'https://acmecorp.com',
    billing_email: 'billing@acmecorp.com',
    primary_contact_name: 'Jessica Moore',
    primary_contact_email: 'jessica@acmecorp.com',
    primary_contact_phone: '+1 (555) 201-4400',
    notes: 'Long-term client since 2021. E-commerce business scaling rapidly.',
    payment_overdue_since: null,
    stripe_customer_id: 'cus_acme001',
    logo_url: null,
    billing_address: '100 Commerce Blvd, Austin, TX 78701',
    created_at: ago(180 * D),
    updated_at: ago(2 * D),
  },
  {
    id: '2',
    name: 'TechStart Inc',
    account_status: 'active',
    website: 'https://techstart.io',
    billing_email: 'finance@techstart.io',
    primary_contact_name: 'Ryan Park',
    primary_contact_email: 'ryan@techstart.io',
    primary_contact_phone: '+1 (555) 332-9900',
    notes: 'Series A startup. Growing fast, high ticket volume.',
    payment_overdue_since: null,
    stripe_customer_id: 'cus_tech002',
    logo_url: null,
    billing_address: '250 Innovation Drive, San Francisco, CA 94107',
    created_at: ago(120 * D),
    updated_at: ago(1 * D),
  },
  {
    id: '3',
    name: 'Global Services',
    account_status: 'active',
    website: 'https://globalservices.com',
    billing_email: 'accounts@globalservices.com',
    primary_contact_name: 'Sandra Okafor',
    primary_contact_email: 'sandra.okafor@globalservices.com',
    primary_contact_phone: '+1 (555) 874-2211',
    notes: 'Enterprise client. Dedicated Slack channel. Priority SLA.',
    payment_overdue_since: null,
    stripe_customer_id: 'cus_global003',
    logo_url: null,
    billing_address: '800 Enterprise Way, Chicago, IL 60601',
    created_at: ago(300 * D),
    updated_at: ago(5 * D),
  },
  {
    id: '4',
    name: 'Local Business Co',
    account_status: 'paused',
    website: null,
    billing_email: 'owner@localbiz.com',
    primary_contact_name: 'Tom Bradley',
    primary_contact_email: 'tom@localbiz.com',
    primary_contact_phone: '+1 (555) 449-0033',
    notes: 'Small retail client. Account paused while they handle seasonal slowdown.',
    payment_overdue_since: null,
    stripe_customer_id: 'cus_local004',
    logo_url: null,
    billing_address: '12 Main Street, Portland, OR 97201',
    created_at: ago(90 * D),
    updated_at: ago(14 * D),
  },
  {
    id: '5',
    name: 'Startup XYZ',
    account_status: 'overdue',
    website: 'https://startupxyz.co',
    billing_email: 'admin@startupxyz.co',
    primary_contact_name: 'Priya Mehta',
    primary_contact_email: 'priya@startupxyz.co',
    primary_contact_phone: '+1 (555) 601-7755',
    notes: 'Payment overdue. Follow up required. Low usage last 30 days.',
    payment_overdue_since: ago(12 * D),
    stripe_customer_id: 'cus_xyz005',
    logo_url: null,
    billing_address: '45 Startup Ave, New York, NY 10001',
    created_at: ago(60 * D),
    updated_at: ago(12 * D),
  },
  {
    id: '6',
    name: 'Agency Partner',
    account_status: 'active',
    website: 'https://agencypartner.co',
    billing_email: 'billing@agencypartner.co',
    primary_contact_name: 'Marcus Lee',
    primary_contact_email: 'marcus@agencypartner.co',
    primary_contact_phone: '+1 (555) 788-4422',
    notes: 'White-label reseller. Manages 3 sub-clients.',
    payment_overdue_since: null,
    stripe_customer_id: 'cus_agency006',
    logo_url: null,
    billing_address: '900 Partner Blvd, Miami, FL 33101',
    created_at: ago(150 * D),
    updated_at: ago(3 * D),
  },
  {
    id: '7',
    name: 'Retail Co',
    account_status: 'active',
    website: 'https://retailco.com',
    billing_email: 'invoices@retailco.com',
    primary_contact_name: 'Karen Wu',
    primary_contact_email: 'karen.wu@retailco.com',
    primary_contact_phone: '+1 (555) 310-5599',
    notes: 'Mid-size retail chain. SEO and e-commerce focus.',
    payment_overdue_since: null,
    stripe_customer_id: 'cus_retail007',
    logo_url: null,
    billing_address: '300 Retail Park, Dallas, TX 75201',
    created_at: ago(200 * D),
    updated_at: ago(7 * D),
  },
  {
    id: '8',
    name: 'HealthPlus Clinics',
    account_status: 'active',
    website: 'https://healthplusnow.com',
    billing_email: 'admin@healthplusnow.com',
    primary_contact_name: 'Dr. Ben Osei',
    primary_contact_email: 'b.osei@healthplusnow.com',
    primary_contact_phone: '+1 (555) 920-8800',
    notes: 'Healthcare client. Strict compliance requirements for copy.',
    payment_overdue_since: null,
    stripe_customer_id: 'cus_health008',
    logo_url: null,
    billing_address: '55 Wellness Drive, Boston, MA 02101',
    created_at: ago(45 * D),
    updated_at: ago(10 * D),
  },
];

// ─── STAFF ───────────────────────────────────────────────────────────────────

export const mockStaff = [
  { id: 'role-1', user_id: 'u1', role: 'admin', email: 'admin@agency.com', full_name: 'Jordan West' },
  { id: 'role-2', user_id: 'u2', role: 'support', email: 'sarah@agency.com', full_name: 'Sarah Chen' },
  { id: 'role-3', user_id: 'u3', role: 'support', email: 'mike@agency.com', full_name: 'Mike Johnson' },
  { id: 'role-4', user_id: 'u4', role: 'support', email: 'emma@agency.com', full_name: 'Emma Davis' },
  { id: 'role-5', user_id: 'u5', role: 'ops', email: 'alex@agency.com', full_name: 'Alex Rivera' },
];

// ─── TICKETS ─────────────────────────────────────────────────────────────────

export const mockTickets = [
  {
    id: 't1',
    title: 'Homepage not loading on mobile Safari',
    description: 'Several users have reported that the homepage fails to load on iOS Safari 17. The page just shows a blank screen after the spinner. We need this fixed ASAP as it's impacting our conversion rate.',
    status: 'open',
    category: 'Technical',
    priority: 'urgent',
    created_at: ago(2 * H),
    updated_at: ago(1 * H),
    sla_due_at: from(4 * H),
    organization_id: '1',
    assigned_to_user_id: null,
    created_by_user_id: 'client-u1',
    organizations: { name: 'Acme Corp' },
    assigned_user: null,
  },
  {
    id: 't2',
    title: 'Email campaign setup — Q1 newsletter',
    description: 'We need help setting up our Q1 newsletter in Mailchimp. We have the copy ready. Need segmentation for VIP customers and regular subscribers. Target send date is next Friday.',
    status: 'in_progress',
    category: 'Marketing',
    priority: 'medium',
    created_at: ago(1 * D),
    updated_at: ago(3 * H),
    sla_due_at: from(2 * D),
    organization_id: '2',
    assigned_to_user_id: 'u2',
    created_by_user_id: 'client-u2',
    organizations: { name: 'TechStart Inc' },
    assigned_user: { full_name: 'Sarah Chen', avatar_url: null, email: 'sarah@agency.com' },
  },
  {
    id: 't3',
    title: 'SEO audit findings — action plan needed',
    description: 'Our latest SEO audit identified 47 broken internal links and poor meta descriptions on product pages. Can you prioritize and give us a fix timeline?',
    status: 'waiting_on_client',
    category: 'SEO',
    priority: 'medium',
    created_at: ago(3 * D),
    updated_at: ago(12 * H),
    sla_due_at: null,
    organization_id: '3',
    assigned_to_user_id: 'u2',
    created_by_user_id: 'client-u3',
    organizations: { name: 'Global Services' },
    assigned_user: { full_name: 'Sarah Chen', avatar_url: null, email: 'sarah@agency.com' },
  },
  {
    id: 't4',
    title: 'Social media integration broken on product pages',
    description: 'The "Share to LinkedIn" button returns a 403 error. The Twitter share works fine. Issue started after the last website update on Tuesday.',
    status: 'open',
    category: 'Technical',
    priority: 'high',
    created_at: ago(30 * 60 * 1000),
    updated_at: ago(15 * 60 * 1000),
    sla_due_at: from(2 * H),
    organization_id: '1',
    assigned_to_user_id: null,
    created_by_user_id: 'client-u1',
    organizations: { name: 'Acme Corp' },
    assigned_user: null,
  },
  {
    id: 't5',
    title: 'Monthly performance report — January',
    description: 'Please prepare the standard monthly report covering: organic traffic trends, top landing pages, conversion data, and ad performance. Deadline is end of week.',
    status: 'in_progress',
    category: 'Reporting',
    priority: 'low',
    created_at: ago(2 * D),
    updated_at: ago(6 * H),
    sla_due_at: from(1 * D),
    organization_id: '4',
    assigned_to_user_id: 'u3',
    created_by_user_id: 'client-u4',
    organizations: { name: 'Local Business Co' },
    assigned_user: { full_name: 'Mike Johnson', avatar_url: null, email: 'mike@agency.com' },
  },
  {
    id: 't6',
    title: 'DNS records need updating for new subdomain',
    description: 'We need to add a CNAME record for app.startupxyz.co pointing to our new Heroku deployment. Also need to update the SPF record to include our new email provider.',
    status: 'open',
    category: 'Technical',
    priority: 'high',
    created_at: ago(4 * H),
    updated_at: ago(2 * H),
    sla_due_at: ago(1 * H), // overdue
    organization_id: '5',
    assigned_to_user_id: null,
    created_by_user_id: 'client-u5',
    organizations: { name: 'Startup XYZ' },
    assigned_user: null,
  },
  {
    id: 't7',
    title: 'Logo and brand assets request for new campaign',
    description: 'We're launching a summer campaign and need updated logo variations — white on transparent, dark on light, and colour on white — in SVG and PNG formats at 2x resolution.',
    status: 'open',
    category: 'Design',
    priority: 'medium',
    created_at: ago(1 * D + 2 * H),
    updated_at: ago(18 * H),
    sla_due_at: from(3 * D),
    organization_id: '6',
    assigned_to_user_id: 'u4',
    created_by_user_id: 'client-u6',
    organizations: { name: 'Agency Partner' },
    assigned_user: { full_name: 'Emma Davis', avatar_url: null, email: 'emma@agency.com' },
  },
  {
    id: 't8',
    title: 'Product page copy revisions',
    description: 'Please review and update the copy on our top 10 product pages. The tone needs to be refreshed — more benefit-focused, less feature-led. I've left comments in the shared Google Doc.',
    status: 'waiting_on_client',
    category: 'Content',
    priority: 'medium',
    created_at: ago(5 * D),
    updated_at: ago(2 * D),
    sla_due_at: null,
    organization_id: '7',
    assigned_to_user_id: 'u3',
    created_by_user_id: 'client-u7',
    organizations: { name: 'Retail Co' },
    assigned_user: { full_name: 'Mike Johnson', avatar_url: null, email: 'mike@agency.com' },
  },
  {
    id: 't9',
    title: 'Google Analytics 4 migration assistance',
    description: 'We're still on UA and need to migrate to GA4 before the cutoff. Please set up the new property, migrate key goals as conversions, and verify the data layer is firing correctly.',
    status: 'resolved',
    category: 'Analytics',
    priority: 'high',
    created_at: ago(10 * D),
    updated_at: ago(3 * D),
    sla_due_at: null,
    organization_id: '1',
    assigned_to_user_id: 'u2',
    created_by_user_id: 'client-u1',
    organizations: { name: 'Acme Corp' },
    assigned_user: { full_name: 'Sarah Chen', avatar_url: null, email: 'sarah@agency.com' },
  },
  {
    id: 't10',
    title: 'Accessibility audit — WCAG 2.1 compliance',
    description: 'Our legal team requires a WCAG 2.1 AA compliance audit before the product launch. Please review the homepage, checkout flow, and account settings and provide a remediation list.',
    status: 'in_progress',
    category: 'Technical',
    priority: 'high',
    created_at: ago(4 * D),
    updated_at: ago(5 * H),
    sla_due_at: from(2 * D),
    organization_id: '8',
    assigned_to_user_id: 'u4',
    created_by_user_id: 'client-u8',
    organizations: { name: 'HealthPlus Clinics' },
    assigned_user: { full_name: 'Emma Davis', avatar_url: null, email: 'emma@agency.com' },
  },
  {
    id: 't11',
    title: 'Facebook Ads account access — team member added',
    description: 'New paid social specialist joining our team on Monday. Please add lisa.nguyen@techstart.io to our Facebook Business Manager with standard analyst permissions.',
    status: 'closed',
    category: 'Access',
    priority: 'low',
    created_at: ago(7 * D),
    updated_at: ago(6 * D),
    sla_due_at: null,
    organization_id: '2',
    assigned_to_user_id: 'u3',
    created_by_user_id: 'client-u2',
    organizations: { name: 'TechStart Inc' },
    assigned_user: { full_name: 'Mike Johnson', avatar_url: null, email: 'mike@agency.com' },
  },
  {
    id: 't12',
    title: 'Newsletter unsubscribe page styling broken',
    description: 'After the email platform migration last month, the unsubscribe confirmation page is unstyled — plain HTML only. Please update it to match our brand.',
    status: 'open',
    category: 'Technical',
    priority: 'low',
    created_at: ago(6 * H),
    updated_at: ago(6 * H),
    sla_due_at: from(5 * D),
    organization_id: '6',
    assigned_to_user_id: null,
    created_by_user_id: 'client-u6',
    organizations: { name: 'Agency Partner' },
    assigned_user: null,
  },
  {
    id: 't13',
    title: 'Annual strategy review — slide deck request',
    description: 'We need a summary deck for our board meeting covering 2024 digital performance: traffic, leads, ROI on paid channels, and recommendations for 2025.',
    status: 'closed',
    category: 'Reporting',
    priority: 'medium',
    created_at: ago(14 * D),
    updated_at: ago(10 * D),
    sla_due_at: null,
    organization_id: '3',
    assigned_to_user_id: 'u2',
    created_by_user_id: 'client-u3',
    organizations: { name: 'Global Services' },
    assigned_user: { full_name: 'Sarah Chen', avatar_url: null, email: 'sarah@agency.com' },
  },
  {
    id: 't14',
    title: 'Blog content calendar — Feb to April',
    description: 'Please draft a content calendar for Q1 covering 12 blog posts (3 per month). Topics should align with our SEO keyword clusters and product launch schedule.',
    status: 'waiting_on_client',
    category: 'Content',
    priority: 'medium',
    created_at: ago(6 * D),
    updated_at: ago(3 * D),
    sla_due_at: null,
    organization_id: '7',
    assigned_to_user_id: 'u4',
    created_by_user_id: 'client-u7',
    organizations: { name: 'Retail Co' },
    assigned_user: { full_name: 'Emma Davis', avatar_url: null, email: 'emma@agency.com' },
  },
  {
    id: 't15',
    title: 'Checkout flow UX improvements',
    description: 'Cart abandonment is at 72% — much higher than industry average. Can you review the checkout funnel and suggest UX improvements? We have session recordings in Hotjar we can share.',
    status: 'in_progress',
    category: 'UX',
    priority: 'high',
    created_at: ago(3 * D),
    updated_at: ago(8 * H),
    sla_due_at: from(1 * D),
    organization_id: '1',
    assigned_to_user_id: 'u2',
    created_by_user_id: 'client-u1',
    organizations: { name: 'Acme Corp' },
    assigned_user: { full_name: 'Sarah Chen', avatar_url: null, email: 'sarah@agency.com' },
  },
];

// ─── HOUR ALLOCATIONS ────────────────────────────────────────────────────────

const periodStart = new Date(NOW - 15 * D).toISOString().split('T')[0];
const periodEnd = new Date(NOW + 15 * D).toISOString().split('T')[0];
const prevStart = new Date(NOW - 46 * D).toISOString().split('T')[0];
const prevEnd = new Date(NOW - 16 * D).toISOString().split('T')[0];

export const mockHourAllocations = [
  {
    id: 'alloc-1',
    title: 'Retainer — Pro Plan',
    organization_id: '1',
    total_hours: 40,
    used_hours: 35.5,
    period_start: periodStart,
    period_end: periodEnd,
    agreed_hourly_rate: 145.0,
    notes: 'Includes 2 revision rounds per deliverable.',
    stripe_subscription_id: 'sub_acme001',
    created_at: ago(20 * D),
    updated_at: ago(2 * H),
  },
  {
    id: 'alloc-2',
    title: 'Retainer — Standard Plan',
    organization_id: '2',
    total_hours: 30,
    used_hours: 24.0,
    period_start: periodStart,
    period_end: periodEnd,
    agreed_hourly_rate: 135.0,
    notes: null,
    stripe_subscription_id: 'sub_tech002',
    created_at: ago(20 * D),
    updated_at: ago(1 * D),
  },
  {
    id: 'alloc-3',
    title: 'Enterprise Retainer',
    organization_id: '3',
    total_hours: 50,
    used_hours: 48.0,
    period_start: periodStart,
    period_end: periodEnd,
    agreed_hourly_rate: 128.5,
    notes: 'Priority SLA — 4 hour response window.',
    stripe_subscription_id: 'sub_global003',
    created_at: ago(20 * D),
    updated_at: ago(5 * H),
  },
  {
    id: 'alloc-4',
    title: 'Retainer — Starter',
    organization_id: '4',
    total_hours: 15,
    used_hours: 3.0,
    period_start: periodStart,
    period_end: periodEnd,
    agreed_hourly_rate: 120.0,
    notes: 'Account paused — hours not being consumed.',
    stripe_subscription_id: 'sub_local004',
    created_at: ago(20 * D),
    updated_at: ago(14 * D),
  },
  {
    id: 'alloc-5',
    title: 'Retainer — Starter',
    organization_id: '5',
    total_hours: 20,
    used_hours: 3.5,
    period_start: periodStart,
    period_end: periodEnd,
    agreed_hourly_rate: 120.0,
    notes: 'Payment overdue. Account flagged.',
    stripe_subscription_id: 'sub_xyz005',
    created_at: ago(20 * D),
    updated_at: ago(12 * D),
  },
  {
    id: 'alloc-6',
    title: 'Retainer — Pro Plan',
    organization_id: '6',
    total_hours: 25,
    used_hours: 23.0,
    period_start: periodStart,
    period_end: periodEnd,
    agreed_hourly_rate: 138.0,
    notes: 'Reseller discount applied.',
    stripe_subscription_id: 'sub_agency006',
    created_at: ago(20 * D),
    updated_at: ago(3 * D),
  },
  {
    id: 'alloc-7',
    title: 'Retainer — Standard Plan',
    organization_id: '7',
    total_hours: 35,
    used_hours: 15.0,
    period_start: periodStart,
    period_end: periodEnd,
    agreed_hourly_rate: 130.0,
    notes: null,
    stripe_subscription_id: 'sub_retail007',
    created_at: ago(20 * D),
    updated_at: ago(7 * D),
  },
  {
    id: 'alloc-8',
    title: 'Retainer — Starter',
    organization_id: '8',
    total_hours: 20,
    used_hours: 8.0,
    period_start: periodStart,
    period_end: periodEnd,
    agreed_hourly_rate: 125.0,
    notes: 'New client onboarded last month.',
    stripe_subscription_id: 'sub_health008',
    created_at: ago(20 * D),
    updated_at: ago(10 * D),
  },
  // Previous period for Acme Corp
  {
    id: 'alloc-1-prev',
    title: 'Retainer — Pro Plan',
    organization_id: '1',
    total_hours: 40,
    used_hours: 40.0,
    period_start: prevStart,
    period_end: prevEnd,
    agreed_hourly_rate: 145.0,
    notes: 'Fully utilised — client needed extra 3h, purchased as ad-hoc.',
    stripe_subscription_id: 'sub_acme001',
    created_at: ago(50 * D),
    updated_at: ago(16 * D),
  },
  // Previous period for TechStart Inc
  {
    id: 'alloc-2-prev',
    title: 'Retainer — Standard Plan',
    organization_id: '2',
    total_hours: 30,
    used_hours: 28.5,
    period_start: prevStart,
    period_end: prevEnd,
    agreed_hourly_rate: 135.0,
    notes: null,
    stripe_subscription_id: 'sub_tech002',
    created_at: ago(50 * D),
    updated_at: ago(16 * D),
  },
];

// ─── TIME LOGS ───────────────────────────────────────────────────────────────

export const mockTimeLogs = [
  {
    id: 'log-1', hours: 2.5, description: 'Mobile Safari debugging and hotfix deployment', logged_at: ago(1 * H), ticket_id: 't1', ticket_title: 'Homepage not loading on mobile Safari', logger_name: 'Sarah Chen', user_id: 'u2',
  },
  {
    id: 'log-2', hours: 1.0, description: 'Initial email list segmentation setup', logged_at: ago(3 * H), ticket_id: 't2', ticket_title: 'Email campaign setup — Q1 newsletter', logger_name: 'Sarah Chen', user_id: 'u2',
  },
  {
    id: 'log-3', hours: 1.5, description: 'Mailchimp template design and copy review', logged_at: ago(1 * H), ticket_id: 't2', ticket_title: 'Email campaign setup — Q1 newsletter', logger_name: 'Sarah Chen', user_id: 'u2',
  },
  {
    id: 'log-4', hours: 3.0, description: 'SEO audit analysis and broken link report', logged_at: ago(12 * H), ticket_id: 't3', ticket_title: 'SEO audit findings — action plan needed', logger_name: 'Sarah Chen', user_id: 'u2',
  },
  {
    id: 'log-5', hours: 2.0, description: 'Monthly report compilation and chart creation', logged_at: ago(6 * H), ticket_id: 't5', ticket_title: 'Monthly performance report — January', logger_name: 'Mike Johnson', user_id: 'u3',
  },
  {
    id: 'log-6', hours: 1.5, description: 'Logo file exports in all requested formats', logged_at: ago(18 * H), ticket_id: 't7', ticket_title: 'Logo and brand assets request', logger_name: 'Emma Davis', user_id: 'u4',
  },
  {
    id: 'log-7', hours: 4.0, description: 'GA4 property setup and goal migration', logged_at: ago(4 * D), ticket_id: 't9', ticket_title: 'Google Analytics 4 migration assistance', logger_name: 'Sarah Chen', user_id: 'u2',
  },
  {
    id: 'log-8', hours: 2.0, description: 'GA4 data layer verification and QA', logged_at: ago(3 * D), ticket_id: 't9', ticket_title: 'Google Analytics 4 migration assistance', logger_name: 'Sarah Chen', user_id: 'u2',
  },
  {
    id: 'log-9', hours: 3.5, description: 'WCAG 2.1 AA audit — homepage and checkout flow', logged_at: ago(5 * H), ticket_id: 't10', ticket_title: 'Accessibility audit — WCAG 2.1 compliance', logger_name: 'Emma Davis', user_id: 'u4',
  },
  {
    id: 'log-10', hours: 2.5, description: 'Checkout funnel heatmap analysis and UX recommendations', logged_at: ago(8 * H), ticket_id: 't15', ticket_title: 'Checkout flow UX improvements', logger_name: 'Sarah Chen', user_id: 'u2',
  },
];

// ─── TICKET MESSAGES ─────────────────────────────────────────────────────────

export const mockMessages: Record<string, Array<{ id: string; message: string; is_internal: boolean; created_at: string; user_id: string; profiles: { full_name: string | null; email: string } | null }>> = {
  't1': [
    {
      id: 'msg-t1-1', message: "Hi team, our homepage is completely blank on iOS Safari. Multiple customers have contacted us. This is urgent — our Black Friday sale landing page is linked from our Instagram bio right now.", is_internal: false, created_at: ago(2 * H), user_id: 'client-u1', profiles: { full_name: 'Jessica Moore', email: 'jessica@acmecorp.com' },
    },
    {
      id: 'msg-t1-2', message: "Acknowledged. Looking into this now. Can you share the exact URL and iOS version? I can reproduce on Safari 17.2 — checking if it's a CSS variable issue introduced in Tuesday's deploy.", is_internal: false, created_at: ago(1 * H + 30 * 60 * 1000), user_id: 'u2', profiles: { full_name: 'Sarah Chen', email: 'sarah@agency.com' },
    },
    {
      id: 'msg-t1-3', message: "Looks like the CSS custom properties aren't being parsed correctly. Possible PostCSS config issue in the build pipeline. Checking the last deploy diff now.", is_internal: true, created_at: ago(1 * H + 15 * 60 * 1000), user_id: 'u2', profiles: { full_name: 'Sarah Chen', email: 'sarah@agency.com' },
    },
    {
      id: 'msg-t1-4', message: "URL is https://acmecorp.com. Our customers are on iPhone 13 and 14. iOS 17.2 mostly. It also affects iPad.", is_internal: false, created_at: ago(1 * H), user_id: 'client-u1', profiles: { full_name: 'Jessica Moore', email: 'jessica@acmecorp.com' },
    },
  ],
  't2': [
    {
      id: 'msg-t2-1', message: "Hi Sarah, we need the Q1 newsletter sent by next Friday. I've attached our approved copy doc. The list should be split: VIP customers (tagged in Mailchimp) get a slightly different version with an early-access offer.", is_internal: false, created_at: ago(1 * D), user_id: 'client-u2', profiles: { full_name: 'Ryan Park', email: 'ryan@techstart.io' },
    },
    {
      id: 'msg-t2-2', message: "Got it! I've reviewed the copy — it looks great. I'll set up two separate audiences in Mailchimp today. Quick question: should the early-access offer link to the pricing page or a dedicated landing page?", is_internal: false, created_at: ago(22 * H), user_id: 'u2', profiles: { full_name: 'Sarah Chen', email: 'sarah@agency.com' },
    },
    {
      id: 'msg-t2-3', message: "Dedicated landing page — I'll send the URL later today once the dev team has it ready.", is_internal: false, created_at: ago(20 * H), user_id: 'client-u2', profiles: { full_name: 'Ryan Park', email: 'ryan@techstart.io' },
    },
    {
      id: 'msg-t2-4', message: "Audience segments created. Template is built and looks great on desktop and mobile. Waiting on the landing page URL to complete the VIP version.", is_internal: false, created_at: ago(3 * H), user_id: 'u2', profiles: { full_name: 'Sarah Chen', email: 'sarah@agency.com' },
    },
  ],
  't9': [
    {
      id: 'msg-t9-1', message: "We need to migrate from Universal Analytics to GA4 before July. Can you handle the full migration? We have e-commerce tracking and about 15 custom goals.", is_internal: false, created_at: ago(10 * D), user_id: 'client-u1', profiles: { full_name: 'Jessica Moore', email: 'jessica@acmecorp.com' },
    },
    {
      id: 'msg-t9-2', message: "Absolutely. I'll start with the GA4 property setup and map your existing goals to GA4 conversions. I'll also verify the data layer. Can you give me view access to the current GA account?", is_internal: false, created_at: ago(10 * D - 2 * H), user_id: 'u2', profiles: { full_name: 'Sarah Chen', email: 'sarah@agency.com' },
    },
    {
      id: 'msg-t9-3', message: "Access granted to sarah@agency.com. We also have some custom dimensions you should know about — I'll email you our tracking spec doc.", is_internal: false, created_at: ago(9 * D), user_id: 'client-u1', profiles: { full_name: 'Jessica Moore', email: 'jessica@acmecorp.com' },
    },
    {
      id: 'msg-t9-4', message: "Migration complete! All 15 goals are now running as GA4 conversions. Data is flowing correctly. I've also set up the enhanced measurement events and linked to Google Ads. The verification doc is in your shared folder.", is_internal: false, created_at: ago(3 * D), user_id: 'u2', profiles: { full_name: 'Sarah Chen', email: 'sarah@agency.com' },
    },
    {
      id: 'msg-t9-5', message: "This looks perfect, Sarah. Thank you! Closing this ticket.", is_internal: false, created_at: ago(3 * D - 1 * H), user_id: 'client-u1', profiles: { full_name: 'Jessica Moore', email: 'jessica@acmecorp.com' },
    },
  ],
};

// ─── KB CATEGORIES ───────────────────────────────────────────────────────────

export const mockKBCategories = [
  { id: 'kbc-1', name: 'Getting Started', slug: 'getting-started', description: 'New to our services? Start here.', icon: '🚀', sort_order: 0 },
  { id: 'kbc-2', name: 'Website Management', slug: 'website-management', description: 'Managing your website content and updates.', icon: '🌐', sort_order: 1 },
  { id: 'kbc-3', name: 'SEO & Marketing', slug: 'seo-marketing', description: 'Search engine optimisation and digital marketing tips.', icon: '📈', sort_order: 2 },
  { id: 'kbc-4', name: 'Email & Integrations', slug: 'email-integrations', description: 'Email campaigns and third-party integrations.', icon: '📧', sort_order: 3 },
  { id: 'kbc-5', name: 'Billing & Account', slug: 'billing-account', description: 'Subscription, invoices, and account management.', icon: '💳', sort_order: 4 },
  { id: 'kbc-6', name: 'Design & Assets', slug: 'design-assets', description: 'Brand guidelines, asset requests, and design files.', icon: '🎨', sort_order: 5 },
];

// ─── KB ARTICLES ─────────────────────────────────────────────────────────────

export const mockKBArticles = [
  {
    id: 'kb-1',
    title: 'How to submit a support ticket',
    slug: 'submit-ticket',
    excerpt: 'Learn how to create and track support requests through your client portal.',
    content: `# How to Submit a Support Ticket

Getting help is easy. Here's how to submit a support request:

## Steps

1. Navigate to **Support Tickets** in the left sidebar
2. Click the **New Ticket** button (top right)
3. Fill in the required fields:
   - **Subject** — A short, descriptive title
   - **Description** — As much detail as possible (screenshots help!)
4. Set a **Priority** if applicable (Urgent, High, Medium, Low)
5. Optionally attach files (up to 5 files, 10MB each)
6. Click **Submit**

## What happens next?

You'll receive an email confirmation immediately. Our team typically responds within **4 business hours** for standard tickets and **1 hour** for urgent tickets.

You can track your ticket status at any time from the Tickets page.

## Tips for faster resolution

- Include browser/device info for technical issues
- Share error messages verbatim
- Attach screenshots or screen recordings where possible`,
    is_featured: true,
    is_published: true,
    published_at: ago(60 * D),
    created_at: ago(60 * D),
    view_count: 312,
    category_id: 'kbc-1',
    kb_categories: { name: 'Getting Started', slug: 'getting-started' },
  },
  {
    id: 'kb-2',
    title: 'Understanding your retainer hours',
    slug: 'retainer-hours',
    excerpt: 'A guide to how retainer hours work, how they\'re tracked, and what to do when you run low.',
    content: `# Understanding Your Retainer Hours

Your retainer includes a set number of hours each billing period. Here's everything you need to know.

## How hours are counted

Every task our team works on is logged with time spent. You can see the full breakdown in your **Projects** section, which shows:

- Hours used per project/allocation period
- Time logs per ticket
- Remaining hours for the current period

## Running low on hours?

When you reach **80% usage**, you'll see a warning on your dashboard. You have two options:

1. **Top up ad-hoc hours** — Contact your account manager to purchase additional hours at your retainer rate
2. **Defer work** — We'll create a backlog and prioritise it in your next period

## What's included in tracked time?

- Strategy and planning calls
- Content creation and editing
- Technical development and QA
- Reporting and analysis
- Client communication (for longer threads)

Quick admin tasks (replying to a 2-sentence email) are not logged.

## What happens to unused hours?

Unused hours **do not roll over** to the next period by default. If you're consistently under-utilising your allocation, speak to your account manager about right-sizing your plan.`,
    is_featured: true,
    is_published: true,
    published_at: ago(55 * D),
    created_at: ago(55 * D),
    view_count: 224,
    category_id: 'kbc-1',
    kb_categories: { name: 'Getting Started', slug: 'getting-started' },
  },
  {
    id: 'kb-3',
    title: 'How to request website content updates',
    slug: 'content-updates',
    excerpt: 'How to request changes to your website text, images, and pages.',
    content: `# Requesting Website Content Updates

## Quick changes (text, images)

For small updates — changing a heading, swapping an image, or updating contact info — open a support ticket with:

- The **exact URL** of the page to be edited
- The **current text** and **replacement text**
- Any image files attached directly to the ticket

Simple edits are usually completed within 1–2 business days.

## Larger changes (new pages, redesigns)

For new page builds or significant redesigns, we'll scope the work first. Submit a ticket describing what you need, and we'll respond with:

- A time estimate
- Any questions we need answered
- Confirmation before we begin

## Providing assets

If you're supplying images, ensure they're:
- **High resolution** (minimum 1500px wide for full-bleed images)
- **Web-optimised formats** (JPG, PNG, WebP)
- **Licensed** for web use

We'll handle compression and final formatting.`,
    is_featured: false,
    is_published: true,
    published_at: ago(45 * D),
    created_at: ago(45 * D),
    view_count: 147,
    category_id: 'kbc-2',
    kb_categories: { name: 'Website Management', slug: 'website-management' },
  },
  {
    id: 'kb-4',
    title: 'SEO basics: what we do for you',
    slug: 'seo-basics',
    excerpt: 'An overview of the SEO services included in your retainer and how to request additional work.',
    content: `# SEO Basics: What We Do For You

## What's included in your retainer

Depending on your plan, your retainer includes a combination of:

- **Technical SEO** — Site speed, crawlability, structured data, XML sitemaps
- **On-page SEO** — Title tags, meta descriptions, heading structure, internal linking
- **Content SEO** — Keyword research, blog briefs, content refreshes
- **Local SEO** (if applicable) — Google Business Profile, local citations

## Monthly SEO tasks

Each month we'll:

1. Pull a rankings and traffic report
2. Flag any new technical issues
3. Complete the agreed scope of on-page or content work
4. Update you on any algorithm changes that affect your site

## How to request additional SEO work

Open a ticket with the category **SEO & Marketing** and describe what you need. Include:

- The target keyword(s) or page(s)
- Any competitor examples you admire
- Your deadline

We'll scope the time required and confirm before starting.`,
    is_featured: false,
    is_published: true,
    published_at: ago(40 * D),
    created_at: ago(40 * D),
    view_count: 98,
    category_id: 'kbc-3',
    kb_categories: { name: 'SEO & Marketing', slug: 'seo-marketing' },
  },
  {
    id: 'kb-5',
    title: 'Setting up email campaigns with our team',
    slug: 'email-campaigns',
    excerpt: 'Step-by-step guide to planning and launching email marketing campaigns.',
    content: `# Setting Up Email Campaigns

## What you need to provide

To get started on an email campaign, share the following in your ticket:

1. **Copy** — Subject line, preview text, and body copy (or brief if you'd like us to write it)
2. **Audience** — Which list segment to send to
3. **Send date and time** — We'll schedule it in your ESP (e.g. Mailchimp, Klaviyo)
4. **CTA destination** — The URL for the main call-to-action button
5. **Assets** — Any hero images or product photos

## Our process

1. We build the template in your ESP
2. You receive a test email for approval
3. You approve (or request changes)
4. We schedule and send
5. We share open rate + click rate within 48 hours of send

## Turnaround times

- Standard campaigns: **3–4 business days**
- Automation sequences: **5–7 business days** depending on complexity
- Urgent campaigns: **24 hours** (contact your account manager)`,
    is_featured: false,
    is_published: true,
    published_at: ago(35 * D),
    created_at: ago(35 * D),
    view_count: 82,
    category_id: 'kbc-4',
    kb_categories: { name: 'Email & Integrations', slug: 'email-integrations' },
  },
  {
    id: 'kb-6',
    title: 'How to update your payment method',
    slug: 'update-payment',
    excerpt: 'Update your credit card or payment details through the billing portal.',
    content: `# Updating Your Payment Method

## Via the billing portal

1. Go to **Subscriptions** in the left sidebar
2. Click **Manage Billing**
3. You'll be redirected to the secure Stripe billing portal
4. Under **Payment methods**, click **Add payment method**
5. Enter your new card details and save

Changes take effect on your next billing date.

## Questions about your invoice?

If you have questions about a specific charge, open a support ticket with category **Billing & Account** and include:

- The invoice number (found in your email receipts)
- A description of the query

We'll respond within 1 business day.

## Failed payments

If a payment fails, you'll receive an automatic email from Stripe with a link to update your details. You have 7 days to resolve the payment before your account is paused.`,
    is_featured: false,
    is_published: true,
    published_at: ago(30 * D),
    created_at: ago(30 * D),
    view_count: 189,
    category_id: 'kbc-5',
    kb_categories: { name: 'Billing & Account', slug: 'billing-account' },
  },
  {
    id: 'kb-7',
    title: 'Brand asset guidelines and how to request files',
    slug: 'brand-assets',
    excerpt: 'How to access your brand guidelines and request logo files, templates, and design assets.',
    content: `# Brand Assets & Guidelines

## Where are my brand files?

Your approved brand assets are stored in the **Documents** section of this portal. This includes:

- Logo files (SVG, PNG, various colourways)
- Colour palette and typography specs
- Brand guidelines PDF
- Email and social media templates

## Requesting new design files

Submit a ticket under **Design & Assets** and specify:

- **File format** needed (SVG, PNG, PDF, etc.)
- **Intended use** (website, print, social, email)
- **Size/resolution** requirements
- **Background colour** context (dark, light, transparent)

We'll prepare the files within **2 business days**.

## Brand consistency reminders

Please don't modify brand assets without approval. If you need a variation (e.g. a reversed-out logo for a dark background), request it via ticket — we keep a consistent asset library.`,
    is_featured: false,
    is_published: true,
    published_at: ago(25 * D),
    created_at: ago(25 * D),
    view_count: 56,
    category_id: 'kbc-6',
    kb_categories: { name: 'Design & Assets', slug: 'design-assets' },
  },
  {
    id: 'kb-8',
    title: 'Emergency contact and after-hours support',
    slug: 'emergency-support',
    excerpt: 'How to reach us for urgent issues outside normal business hours.',
    content: `# Emergency Contact & After-Hours Support

## Standard support hours

Monday–Friday, 9am–6pm (GMT/BST). Tickets submitted outside these hours will be triaged the next business day.

## Urgent issues

If you have a **production-critical issue** (site down, data breach, broken checkout), submit a ticket marked **Urgent** immediately. We monitor urgent tickets outside standard hours.

For Enterprise plan clients, you also have access to the after-hours emergency line — see your welcome pack for details.

## What counts as an emergency?

- Website completely inaccessible
- Checkout or payment flow broken
- Security incident
- Data loss

For planned downtime, scheduled maintenance, or marketing requests — please use standard tickets.`,
    is_featured: false,
    is_published: true,
    published_at: ago(20 * D),
    created_at: ago(20 * D),
    view_count: 43,
    category_id: 'kbc-1',
    kb_categories: { name: 'Getting Started', slug: 'getting-started' },
  },
  {
    id: 'kb-9',
    title: 'Google Business Profile — management guide',
    slug: 'google-business-profile',
    excerpt: 'How we manage your Google Business Profile and how to request updates.',
    content: `# Google Business Profile Management

## What we manage

If GBP management is included in your plan, we handle:

- Posting monthly updates and promotions
- Responding to reviews (drafts sent to you for approval)
- Updating business hours, photos, and contact info
- Monitoring Q&A

## Requesting an update

To request a GBP change (new photo, updated hours, add a service), open a ticket under **SEO & Marketing**.

## Review responses

We'll draft responses to new reviews and send them for your approval before posting. Response turnaround is **2 business days**.`,
    is_featured: false,
    is_published: false,
    published_at: null,
    created_at: ago(5 * D),
    view_count: 0,
    category_id: 'kbc-3',
    kb_categories: { name: 'SEO & Marketing', slug: 'seo-marketing' },
  },
];

// ─── HELPER: Derive client rows (for AdminClients / SupportClients) ───────────

const memberCounts: Record<string, number> = { '1': 3, '2': 2, '3': 5, '4': 1, '5': 2, '6': 4, '7': 3, '8': 2 };

export const mockClientRows = mockOrganizations.map((org) => {
  const alloc = mockHourAllocations.find((a) => a.organization_id === org.id && !a.id.includes('prev'));
  const openTickets = mockTickets.filter(
    (t) => t.organization_id === org.id && ['open', 'in_progress', 'waiting_on_client'].includes(t.status),
  ).length;
  return {
    id: org.id,
    name: org.name,
    account_status: org.account_status,
    website: org.website,
    totalHours: alloc?.total_hours ?? 0,
    usedHours: alloc?.used_hours ?? 0,
    openTickets,
    memberCount: memberCounts[org.id] ?? 1,
  };
});

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────

export const mockDocuments = [
  {
    id: 'doc-1', file_name: 'Brand_Guidelines_v3.pdf', file_path: '', file_size: 2_400_000, content_type: 'application/pdf', description: 'Latest brand guidelines including logo usage, colour palette, and typography', created_at: ago(5 * D), uploaded_by_user_id: 'u2',
  },
  {
    id: 'doc-2', file_name: 'Q4_2024_Performance_Report.xlsx', file_path: '', file_size: 850_000, content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', description: 'Full Q4 2024 performance metrics across all channels', created_at: ago(12 * D), uploaded_by_user_id: 'u2',
  },
  {
    id: 'doc-3', file_name: 'Homepage_Redesign_v2_Approved.png', file_path: '', file_size: 3_200_000, content_type: 'image/png', description: 'Approved homepage redesign mockup — v2 with client revisions applied', created_at: ago(20 * D), uploaded_by_user_id: 'u3',
  },
  {
    id: 'doc-4', file_name: 'Service_Agreement_2025.pdf', file_path: '', file_size: 540_000, content_type: 'application/pdf', description: 'Signed service agreement for the 2025 retainer period', created_at: ago(30 * D), uploaded_by_user_id: 'u1',
  },
  {
    id: 'doc-5', file_name: 'Keyword_Research_Jan2025.csv', file_path: '', file_size: 120_000, content_type: 'text/csv', description: 'Full keyword research export — 250 target keywords with volume and difficulty', created_at: ago(18 * D), uploaded_by_user_id: 'u2',
  },
  {
    id: 'doc-6', file_name: 'Social_Media_Templates.zip', file_path: '', file_size: 8_900_000, content_type: 'application/zip', description: 'Canva-exported social media templates for Instagram, LinkedIn, and Facebook', created_at: ago(25 * D), uploaded_by_user_id: 'u4',
  },
];
