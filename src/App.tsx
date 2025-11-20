import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Segments from './pages/admin/Segments';
import Cities from './pages/admin/Cities';
import Users from './pages/admin/Users';
import CalculationSheets from './pages/admin/CalculationSheets';
import CalculationSheetsList from './pages/admin/CalculationSheetsList';
import CalculationSheetEditor from './pages/admin/CalculationSheetEditor';
import DeclarationsManagement from './pages/admin/DeclarationsManagement';
import DeclarationViewer from './pages/admin/DeclarationViewer';
import Declarations from './pages/professor/Declarations';
import DeclarationForm from './pages/professor/DeclarationForm';
import GerantDeclarations from './pages/gerant/GerantDeclarations';
import CreateDeclaration from './pages/gerant/CreateDeclaration';
import Sessions from './pages/admin/formations/Sessions';
import FormationEditor from './pages/admin/formations/FormationEditor';
import FormationsManagement from './pages/admin/FormationsManagement';
import { Analytics } from './pages/admin/Analytics';
import { StudentReports } from './pages/admin/StudentReports';
import { CertificatesManagement } from './pages/admin/CertificatesManagement';
import { CertificateTemplates } from './pages/admin/CertificateTemplates';
import { CertificateTemplateCanvasEditor } from './pages/admin/CertificateTemplateCanvasEditor';
import { ForumModeration } from './pages/admin/ForumModeration';
import { SessionsFormation } from './pages/admin/SessionsFormation';
import { SessionDetail } from './pages/admin/SessionDetail';
import CorpsFormation from './pages/admin/CorpsFormation';
import { RolesManagement } from './pages/admin/RolesManagement';
import HREmployees from './pages/admin/hr/HREmployees';
import HRDashboard from './pages/admin/hr/HRDashboard';
import HRAttendance from './pages/admin/hr/HRAttendance';
import HRLeaves from './pages/admin/hr/HRLeaves';
import HRSettings from './pages/admin/hr/HRSettings';
import CommercializationDashboard from './pages/admin/commercialisation/CommercializationDashboard';
import Clients from './pages/admin/commercialisation/Clients';
import Prospects from './pages/admin/commercialisation/Prospects';
import Devis from './pages/admin/commercialisation/Devis';
import Contrats from './pages/admin/commercialisation/Contrats';
import Clocking from './pages/employee/Clocking';
import StudentDashboard from './pages/student/StudentDashboard';
import FormationCatalog from './pages/student/FormationCatalog';
import FormationViewer from './pages/student/FormationViewer';
import VideoPlayer from './pages/student/VideoPlayer';
import TestTaking from './pages/student/TestTaking';
import { MyCertificates } from './pages/student/MyCertificates';
import { ForumList } from './pages/student/ForumList';
import { ThreadView } from './pages/student/ThreadView';
import { CreateThread } from './pages/student/CreateThread';

// Protected Route Component
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
  gerantOnly?: boolean;
  requiredPermission?: string | string[];
}> = ({
  children,
  adminOnly = false,
  gerantOnly = false,
  requiredPermission
}) => {
  const { isAuthenticated, isAdmin, isGerant, hasPermission, hasAnyPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check permission-based access (priority over role-based)
  if (requiredPermission) {
    const hasAccess = Array.isArray(requiredPermission)
      ? hasAnyPermission(...requiredPermission)
      : hasPermission(requiredPermission);

    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
  }

  // Fallback to role-based access (for backward compatibility)
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (gerantOnly && !isGerant) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isLoading } = useAuth();

  // Afficher un écran de chargement pendant la vérification de l'authentification
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes - Gestion Comptable */}
      <Route
        path="/admin/segments"
        element={
          <ProtectedRoute requiredPermission="accounting.segments.view_page">
            <Segments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/cities"
        element={
          <ProtectedRoute requiredPermission="accounting.cities.view_page">
            <Cities />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requiredPermission="accounting.users.view_page">
            <Users />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/calculation-sheets"
        element={
          <ProtectedRoute requiredPermission="accounting.sheets.view_page">
            <CalculationSheetsList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/calculation-sheets/:id"
        element={
          <ProtectedRoute requiredPermission="accounting.sheets.view_page">
            <CalculationSheets />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/calculation-sheets/:id/editor"
        element={
          <ProtectedRoute requiredPermission="accounting.sheets.edit">
            <CalculationSheetEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/declarations"
        element={
          <ProtectedRoute requiredPermission="accounting.declarations.view_page">
            <DeclarationsManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/declarations/:id"
        element={
          <ProtectedRoute requiredPermission="accounting.declarations.view_page">
            <DeclarationViewer />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes - Formation en Ligne */}
      <Route
        path="/admin/formations-management"
        element={
          <ProtectedRoute requiredPermission="training.formations.view_page">
            <FormationsManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/corps-formation"
        element={
          <ProtectedRoute requiredPermission="training.corps.view_page">
            <CorpsFormation />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/formations/sessions"
        element={
          <ProtectedRoute requiredPermission="training.sessions.view_page">
            <Sessions />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/formations/cours/:id/editor"
        element={
          <ProtectedRoute requiredPermission="training.formations.edit">
            <FormationEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/sessions-formation"
        element={
          <ProtectedRoute requiredPermission="training.sessions.view_page">
            <SessionsFormation />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/sessions-formation/:id"
        element={
          <ProtectedRoute requiredPermission="training.sessions.view_page">
            <SessionDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute requiredPermission="training.analytics.view_page">
            <Analytics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/student-reports"
        element={
          <ProtectedRoute requiredPermission="training.student_reports.view_page">
            <StudentReports />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/certificates"
        element={
          <ProtectedRoute requiredPermission="training.certificates.view_page">
            <CertificatesManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/certificate-templates"
        element={
          <ProtectedRoute requiredPermission="training.certificate_templates.view_page">
            <CertificateTemplates />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/certificate-templates/:id/canvas-edit"
        element={
          <ProtectedRoute requiredPermission="training.certificate_templates.edit">
            <CertificateTemplateCanvasEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/forums"
        element={
          <ProtectedRoute requiredPermission="training.forums.view_page">
            <ForumModeration />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes - Système */}
      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute requiredPermission="system.roles.view_page">
            <RolesManagement />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes - Ressources Humaines */}
      <Route
        path="/admin/hr/employees"
        element={
          <ProtectedRoute requiredPermission="hr.employees.view_page">
            <HREmployees />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/hr/dashboard"
        element={
          <ProtectedRoute requiredPermission="hr.dashboard.view_page">
            <HRDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/hr/attendance"
        element={
          <ProtectedRoute requiredPermission="hr.attendance.view_page">
            <HRAttendance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/hr/leaves"
        element={
          <ProtectedRoute requiredPermission="hr.leaves.view_page">
            <HRLeaves />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/hr/settings"
        element={
          <ProtectedRoute requiredPermission="hr.settings.view_page">
            <HRSettings />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes - Commercialisation */}
      <Route
        path="/admin/commercialisation/dashboard"
        element={
          <ProtectedRoute requiredPermission="commercialisation.dashboard.view_page">
            <CommercializationDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/commercialisation/clients"
        element={
          <ProtectedRoute requiredPermission="commercialisation.clients.view_page">
            <Clients />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/commercialisation/prospects"
        element={
          <ProtectedRoute requiredPermission="commercialisation.prospects.view_page">
            <Prospects />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/commercialisation/devis"
        element={
          <ProtectedRoute requiredPermission="commercialisation.devis.view_page">
            <Devis />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/commercialisation/contrats"
        element={
          <ProtectedRoute requiredPermission="commercialisation.contrats.view_page">
            <Contrats />
          </ProtectedRoute>
        }
      />

      {/* Employee Routes */}
      <Route
        path="/employee/clocking"
        element={
          <ProtectedRoute requiredPermission="hr.clocking.self">
            <Clocking />
          </ProtectedRoute>
        }
      />

      {/* Professor Routes */}
      <Route
        path="/professor/declarations"
        element={
          <ProtectedRoute>
            <Declarations />
          </ProtectedRoute>
        }
      />

      <Route
        path="/professor/declarations/:id/fill"
        element={
          <ProtectedRoute>
            <DeclarationForm />
          </ProtectedRoute>
        }
      />

      {/* Student Routes */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/catalog"
        element={
          <ProtectedRoute>
            <FormationCatalog />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/formations/:id"
        element={
          <ProtectedRoute>
            <FormationViewer />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/formations/:id/videos/:videoId"
        element={
          <ProtectedRoute>
            <VideoPlayer />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/formations/:id/tests/:testId"
        element={
          <ProtectedRoute>
            <TestTaking />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/certificates"
        element={
          <ProtectedRoute>
            <MyCertificates />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/forums/:formationId"
        element={
          <ProtectedRoute>
            <ForumList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/forums/:formationId/new"
        element={
          <ProtectedRoute>
            <CreateThread />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/forums/thread/:threadId"
        element={
          <ProtectedRoute>
            <ThreadView />
          </ProtectedRoute>
        }
      />

      {/* Gerant Routes */}
      <Route
        path="/gerant/declarations"
        element={
          <ProtectedRoute gerantOnly>
            <GerantDeclarations />
          </ProtectedRoute>
        }
      />

      <Route
        path="/gerant/create-declaration"
        element={
          <ProtectedRoute gerantOnly>
            <CreateDeclaration />
          </ProtectedRoute>
        }
      />

      {/* Default Route */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
