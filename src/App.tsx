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
import Cours from './pages/admin/formations/Cours';
import FormationEditor from './pages/admin/formations/FormationEditor';
import StudentDashboard from './pages/student/StudentDashboard';
import FormationCatalog from './pages/student/FormationCatalog';

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
        path="/admin/create-declaration"
        element={
          <ProtectedRoute adminOnly>
            <CreateDeclaration />
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
        path="/admin/formations/cours"
        element={
          <ProtectedRoute adminOnly>
            <Cours />
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
