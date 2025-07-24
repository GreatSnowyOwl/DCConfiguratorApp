import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet
} from 'react-router-dom';

import DCConfiguratorApp from './components/DCConfiguratorApp';
import SignUpPage from './components/SignUpForm'; // Assuming SignUpForm.tsx exports SignUpPage
import LoginPage from './components/LoginPage'; // Import the placeholder Login page
import PartnerDashboard from './components/PartnerDashboard';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordForm from './components/ResetPasswordForm';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import RegistrationStatusPage from './components/RegistrationStatusPage'; // Import the new status page
import ViewQuote from './components/ViewQuote'; // Import the ViewQuote component
import EmailVerifiedPage from './components/EmailVerifiedPage'; // Import the new page
import DataCenterDesigner from './pages/DataCenterDesigner';
import DataCenterVisualizerPage from './pages/DataCenterVisualizerPage';
import CRACConfiguratorPage from './components/CRACConfiguratorPage'; // Import the new CRAC Configurator page
import UPSConfiguratorPage from './components/UPSConfiguratorPage'; // Import the new UPS Configurator page

// Define a simple protected route component
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    // Optional: Show a loading spinner/indicator while checking auth state
    return <div className="min-h-screen flex items-center justify-center text-white bg-[#0A2B6C]">Loading...</div>; 
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  // Remove the placeholder state - we'll use the context
  // const isAuthenticated = true; 

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Change root path to always redirect to login */}
          <Route 
            path="/" 
            element={ <Navigate to="/login" replace /> } 
          />
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordForm />} />
          <Route path="/registration-status" element={<RegistrationStatusPage />} />
          <Route path="/email-verified" element={<EmailVerifiedPage />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<PartnerDashboard />} />
            <Route path="/configurator" element={<DCConfiguratorApp />} />
            <Route path="/acconfig" element={<CRACConfiguratorPage />} />
            <Route path="/upsconfig" element={<UPSConfiguratorPage />} />
            <Route path="/dashboard/quote/:quoteId" element={<ViewQuote />} />
          </Route>

          <Route path="/designer" element={<DataCenterDesigner />} />
          <Route path="/visualizer" element={<DataCenterVisualizerPage />} />

          {/* Fallback for unmatched routes */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;