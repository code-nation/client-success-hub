import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PreviewModeProvider } from "@/contexts/PreviewModeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DevNav from "@/components/layout/DevNav";
import Login from "./pages/Login";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientTickets from "./pages/client/ClientTickets";
import NewTicket from "./pages/client/NewTicket";
import TicketDetail from "./pages/client/TicketDetail";
import ClientSubscriptions from "./pages/client/ClientSubscriptions";
import ClientHours from "./pages/client/ClientHours";
import ClientHoursPeriod from "./pages/client/ClientHoursPeriod";
import ClientDocuments from "./pages/client/ClientDocuments";
import SupportDashboard from "./pages/support/SupportDashboard";
import SupportTickets from "./pages/support/SupportTickets";
import SupportTicketDetail from "./pages/support/SupportTicketDetail";
import SupportClients from "./pages/support/SupportClients";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminClients from "./pages/admin/AdminClients";
import AdminTicketTriage from "./pages/admin/AdminTicketTriage";
import AdminContent from "./pages/admin/AdminContent";
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
const allRoles: ('client' | 'support' | 'admin' | 'ops')[] = ['client', 'support', 'admin', 'ops'];

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
              <Route path="/" element={<Navigate to="/ops" replace />} />

              {/* Client routes */}
              <Route path="/client" element={<ProtectedRoute allowedRoles={allRoles}><ClientDashboard /></ProtectedRoute>} />
              <Route path="/client/tickets" element={<ProtectedRoute allowedRoles={allRoles}><ClientTickets /></ProtectedRoute>} />
              <Route path="/client/tickets/new" element={<ProtectedRoute allowedRoles={allRoles}><NewTicket /></ProtectedRoute>} />
              <Route path="/client/tickets/:ticketId" element={<ProtectedRoute allowedRoles={allRoles}><TicketDetail /></ProtectedRoute>} />
              <Route path="/client/subscriptions" element={<ProtectedRoute allowedRoles={allRoles}><ClientSubscriptions /></ProtectedRoute>} />
              <Route path="/client/hours" element={<ProtectedRoute allowedRoles={allRoles}><ClientHours /></ProtectedRoute>} />
              <Route path="/client/hours/:allocationId" element={<ProtectedRoute allowedRoles={allRoles}><ClientHoursPeriod /></ProtectedRoute>} />
              <Route path="/client/documents" element={<ProtectedRoute allowedRoles={allRoles}><ClientDocuments /></ProtectedRoute>} />
              <Route path="/client/notifications" element={<ProtectedRoute allowedRoles={allRoles}><NotificationSettings role="client" /></ProtectedRoute>} />

              {/* Support routes */}
              <Route path="/support" element={<ProtectedRoute allowedRoles={staffRoles}><SupportDashboard /></ProtectedRoute>} />
              <Route path="/support/tickets" element={<ProtectedRoute allowedRoles={staffRoles}><SupportTickets /></ProtectedRoute>} />
              <Route path="/support/tickets/:ticketId" element={<ProtectedRoute allowedRoles={staffRoles}><SupportTicketDetail /></ProtectedRoute>} />
              <Route path="/support/clients" element={<ProtectedRoute allowedRoles={staffRoles}><SupportClients /></ProtectedRoute>} />
              <Route path="/support/knowledge" element={<ProtectedRoute allowedRoles={staffRoles}><KnowledgeBase role="support" /></ProtectedRoute>} />
              <Route path="/support/notifications" element={<ProtectedRoute allowedRoles={staffRoles}><NotificationSettings role="support" /></ProtectedRoute>} />

              {/* Ops routes */}
              <Route path="/ops" element={<ProtectedRoute allowedRoles={staffRoles}><OpsDashboard /></ProtectedRoute>} />
              <Route path="/ops/clients" element={<ProtectedRoute allowedRoles={staffRoles}><AdminClients /></ProtectedRoute>} />
              <Route path="/ops/clients/:orgId" element={<ProtectedRoute allowedRoles={staffRoles}><ClientProfile role="ops" /></ProtectedRoute>} />
              <Route path="/ops/clients/:orgId/hours" element={<ProtectedRoute allowedRoles={staffRoles}><ClientHoursDetail /></ProtectedRoute>} />
              <Route path="/ops/clients/:orgId/projects/:allocationId" element={<ProtectedRoute allowedRoles={staffRoles}><ClientHoursDetail /></ProtectedRoute>} />
              <Route path="/ops/triage" element={<ProtectedRoute allowedRoles={staffRoles}><AdminTicketTriage /></ProtectedRoute>} />
              <Route path="/ops/content" element={<ProtectedRoute allowedRoles={staffRoles}><AdminContent /></ProtectedRoute>} />
              <Route path="/ops/staff" element={<ProtectedRoute allowedRoles={staffRoles}><StaffManagement /></ProtectedRoute>} />
              <Route path="/ops/notifications" element={<ProtectedRoute allowedRoles={staffRoles}><NotificationSettings role="ops" /></ProtectedRoute>} />

              {/* Admin routes */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={staffRoles}><AdminDashboard /></ProtectedRoute>} />

              {/* Projects */}
              <Route path="/projects" element={<ProtectedRoute allowedRoles={staffRoles}><Projects /></ProtectedRoute>} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <DevNav />
          </BrowserRouter>
        </TooltipProvider>
      </PreviewModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
