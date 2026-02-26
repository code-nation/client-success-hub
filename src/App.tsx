import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PreviewModeProvider } from "@/contexts/PreviewModeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import ClientTickets from "./pages/client/ClientTickets";
import NewTicket from "./pages/client/NewTicket";
import TicketDetail from "./pages/client/TicketDetail";
import ClientSubscriptions from "./pages/client/ClientSubscriptions";
import ClientHours from "./pages/client/ClientHours";
import ClientHoursPeriod from "./pages/client/ClientHoursPeriod";
import ClientDocuments from "./pages/client/ClientDocuments";
import SupportTickets from "./pages/support/SupportTickets";
import SupportTicketDetail from "./pages/support/SupportTicketDetail";
import AdminClients from "./pages/admin/AdminClients";
import StaffManagement from "./pages/admin/StaffManagement";
import OpsDashboard from "./pages/ops/OpsDashboard";
import KnowledgeBase from "./pages/shared/KnowledgeBase";
import NotificationSettings from "./pages/shared/NotificationSettings";
import ClientProfile from "./pages/shared/ClientProfile";
import ClientHoursDetail from "./pages/shared/ClientHoursDetail";
import Projects from "./pages/shared/Projects";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const staffRoles: ('support' | 'admin' | 'ops')[] = ['support', 'admin', 'ops'];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PreviewModeProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Client routes */}
            <Route path="/client" element={<Navigate to="/client/tickets" replace />} />
            <Route path="/client/tickets" element={<ProtectedRoute allowedRoles={['client', 'admin']}><ClientTickets /></ProtectedRoute>} />
            <Route path="/client/tickets/new" element={<ProtectedRoute allowedRoles={['client', 'admin']}><NewTicket /></ProtectedRoute>} />
            <Route path="/client/tickets/:ticketId" element={<ProtectedRoute allowedRoles={['client', 'admin']}><TicketDetail /></ProtectedRoute>} />
            <Route path="/client/subscriptions" element={<ProtectedRoute allowedRoles={['client', 'admin']}><ClientSubscriptions /></ProtectedRoute>} />
            <Route path="/client/hours" element={<ProtectedRoute allowedRoles={['client', 'admin']}><ClientHours /></ProtectedRoute>} />
            <Route path="/client/hours/:allocationId" element={<ProtectedRoute allowedRoles={['client', 'admin']}><ClientHoursPeriod /></ProtectedRoute>} />
            <Route path="/client/documents" element={<ProtectedRoute allowedRoles={['client', 'admin']}><ClientDocuments /></ProtectedRoute>} />
            <Route path="/client/notifications" element={<ProtectedRoute allowedRoles={['client', 'admin']}><NotificationSettings role="client" /></ProtectedRoute>} />

            {/* Support routes (accessible by all staff) */}
            <Route path="/support" element={<Navigate to="/support/tickets" replace />} />
            <Route path="/support/tickets" element={<ProtectedRoute allowedRoles={staffRoles}><SupportTickets /></ProtectedRoute>} />
            <Route path="/support/tickets/:ticketId" element={<ProtectedRoute allowedRoles={staffRoles}><SupportTicketDetail /></ProtectedRoute>} />
            <Route path="/support/knowledge" element={<ProtectedRoute allowedRoles={staffRoles}><KnowledgeBase role="support" /></ProtectedRoute>} />
            <Route path="/support/notifications" element={<ProtectedRoute allowedRoles={staffRoles}><NotificationSettings role="support" /></ProtectedRoute>} />

            {/* Ops routes (accessible by all staff) */}
            <Route path="/ops" element={<ProtectedRoute allowedRoles={staffRoles}><OpsDashboard /></ProtectedRoute>} />
            <Route path="/ops/clients" element={<ProtectedRoute allowedRoles={staffRoles}><AdminClients /></ProtectedRoute>} />
            <Route path="/ops/clients/:orgId" element={<ProtectedRoute allowedRoles={staffRoles}><ClientProfile role="ops" /></ProtectedRoute>} />
            <Route path="/ops/clients/:orgId/hours" element={<ProtectedRoute allowedRoles={staffRoles}><ClientHoursDetail /></ProtectedRoute>} />
            <Route path="/ops/clients/:orgId/projects/:allocationId" element={<ProtectedRoute allowedRoles={staffRoles}><ClientHoursDetail /></ProtectedRoute>} />
            <Route path="/ops/staff" element={<ProtectedRoute allowedRoles={['admin']}><StaffManagement /></ProtectedRoute>} />
            <Route path="/ops/notifications" element={<ProtectedRoute allowedRoles={staffRoles}><NotificationSettings role="ops" /></ProtectedRoute>} />

            {/* Projects (accessible by all staff) */}
            <Route path="/projects" element={<ProtectedRoute allowedRoles={staffRoles}><Projects /></ProtectedRoute>} />

            {/* Admin redirects to support */}
            <Route path="/admin" element={<Navigate to="/support" replace />} />
            <Route path="/admin/*" element={<Navigate to="/support" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </PreviewModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
