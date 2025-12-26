import React, { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import PermissionGate from './components/PermissionGate.jsx';
import AccessDenied from './components/AccessDenied.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import featureFlags from './config/featureFlags.js';
import { useAuth } from './context/AuthContext.jsx';
import { Navigate } from 'react-router-dom';

const Login = lazy(() => import('./pages/Login.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const ChatView = lazy(() => import('./pages/ChatView.jsx'));
const Broadcast = lazy(() => import('./pages/Broadcast.jsx'));
const WhatsappConnections = lazy(() => import('./pages/WhatsappConnections.jsx'));
const Users = lazy(() => import('./pages/Users.jsx'));
const Queues = lazy(() => import('./pages/Queues.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const QuickReplies = lazy(() => import('./pages/QuickReplies.jsx'));

const RoleLanding = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  const target = user.role === 'AGENTE' ? '/chat' : '/status';
  return <Navigate to={target} replace />;
};

const App = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<RoleLanding />} />
          <Route
            path="/status"
            element={
              <PermissionGate roles={['ADMIN', 'SUPERVISOR']} fallback={<AccessDenied />}>
                <Dashboard />
              </PermissionGate>
            }
          />
          <Route path="/chat" element={<ChatView />} />
          <Route
            path="/broadcast"
            element={
              <PermissionGate roles={['ADMIN', 'SUPERVISOR']} fallback={<AccessDenied />}>
                <Broadcast />
              </PermissionGate>
            }
          />
          <Route
            path="/quick-replies"
            element={
              <PermissionGate roles={['ADMIN', 'SUPERVISOR']} fallback={<AccessDenied />}>
                <QuickReplies />
              </PermissionGate>
            }
          />
          {featureFlags.whatsappConnections ? (
            <Route
              path="/whatsapp"
              element={
                <PermissionGate roles={['ADMIN', 'SUPERVISOR']} fallback={<AccessDenied />}>
                  <WhatsappConnections />
                </PermissionGate>
              }
            />
          ) : null}
          <Route
            path="/queues"
            element={
              <PermissionGate roles={['ADMIN', 'SUPERVISOR']} fallback={<AccessDenied />}>
                <Queues />
              </PermissionGate>
            }
          />
          <Route
            path="/users"
            element={
              <PermissionGate roles={['ADMIN']} fallback={<AccessDenied />}>
                <Users />
              </PermissionGate>
            }
          />
          <Route
            path="/settings"
            element={
              <PermissionGate roles={['ADMIN']} fallback={<AccessDenied />}>
                <Settings />
              </PermissionGate>
            }
          />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default App;
