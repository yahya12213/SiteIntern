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
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean; gerantOnly?: boolean }> = ({
  children,
  adminOnly = false,
  gerantOnly = false
}) => {
  const { isAuthenticated, isAdmin, isGerant } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

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

      {/* Admin Routes */}
      <Route
        path="/admin/segments"
        element={
          <ProtectedRoute adminOnly>
            <Segments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/cities"
        element={
          <ProtectedRoute adminOnly>
            <Cities />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute adminOnly>
            <Users />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/calculation-sheets"
        element={
          <ProtectedRoute adminOnly>
            <CalculationSheetsList />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/calculation-sheets/:id"
        element={
          <ProtectedRoute adminOnly>
            <CalculationSheets />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/calculation-sheets/:id/editor"
        element={
          <ProtectedRoute adminOnly>
            <CalculationSheetEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/declarations"
        element={
          <ProtectedRoute adminOnly>
            <DeclarationsManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/declarations/:id"
        element={
          <ProtectedRoute adminOnly>
            <DeclarationViewer />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/formations-management"
        element={
          <ProtectedRoute adminOnly>
            <FormationsManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/corps-formation"
        element={
          <ProtectedRoute adminOnly>
            <CorpsFormation />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/formations/sessions"
        element={
          <ProtectedRoute adminOnly>
            <Sessions />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/formations/cours/:id/editor"
        element={
          <ProtectedRoute adminOnly>
            <FormationEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/sessions-formation"
        element={
          <ProtectedRoute adminOnly>
            <SessionsFormation />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/sessions-formation/:id"
        element={
          <ProtectedRoute adminOnly>
            <SessionDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute adminOnly>
            <Analytics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/student-reports"
        element={
          <ProtectedRoute adminOnly>
            <StudentReports />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/certificates"
        element={
          <ProtectedRoute adminOnly>
            <CertificatesManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/certificate-templates"
        element={
          <ProtectedRoute adminOnly>
            <CertificateTemplates />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/certificate-templates/:id/canvas-edit"
        element={
          <ProtectedRoute adminOnly>
            <CertificateTemplateCanvasEditor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/forums"
        element={
          <ProtectedRoute adminOnly>
            <ForumModeration />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute adminOnly>
            <RolesManagement />
          </ProtectedRoute>
        }
      />

      {/* HR Routes */}
      <Route
        path="/admin/hr/employees"
        element={
          <ProtectedRoute adminOnly>
            <HREmployees />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/hr/dashboard"
        element={
          <ProtectedRoute adminOnly>
            <HRDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/hr/attendance"
        element={
          <ProtectedRoute adminOnly>
            <HRAttendance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/hr/leaves"
        element={
          <ProtectedRoute adminOnly>
            <HRLeaves />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/hr/settings"
        element={
          <ProtectedRoute adminOnly>
            <HRSettings />
          </ProtectedRoute>
        }
      />

      {/* Commercialisation Routes */}
      <Route
        path="/admin/commercialisation/dashboard"
        element={
          <ProtectedRoute adminOnly>
            <CommercializationDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/commercialisation/clients"
        element={
          <ProtectedRoute adminOnly>
            <Clients />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/commercialisation/prospects"
        element={
          <ProtectedRoute adminOnly>
            <Prospects />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/commercialisation/devis"
        element={
          <ProtectedRoute adminOnly>
            <Devis />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/commercialisation/contrats"
        element={
          <ProtectedRoute adminOnly>
            <Contrats />
          </ProtectedRoute>
        }
      />

      {/* Employee Routes */}
      <Route
        path="/employee/clocking"
        element={
          <ProtectedRoute>
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
