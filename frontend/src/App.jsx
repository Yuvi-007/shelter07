import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminShelters from './pages/AdminShelters';
import AdminDisasters from './pages/AdminDisasters';
import AdminRoleRequests from './pages/AdminRoleRequests';
import Profile from './pages/Profile';
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerHistory from './pages/ManagerHistory';
import AuthorityDashboard from './pages/AuthorityDashboard';
import ShelterDetail from './pages/ShelterDetail';
import RedistributeAction from './pages/RedistributeAction';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route path="/admin" element={
              <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>
            } />
            <Route path="/admin/shelters" element={
              <ProtectedRoute roles={['admin']}><AdminShelters /></ProtectedRoute>
            } />
            <Route path="/admin/disasters" element={
              <ProtectedRoute roles={['admin']}><AdminDisasters /></ProtectedRoute>
            } />
            <Route path="/admin/role-requests" element={
              <ProtectedRoute roles={['admin']}><AdminRoleRequests /></ProtectedRoute>
            } />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/manager" element={
              <ProtectedRoute roles={['manager']}><ManagerDashboard /></ProtectedRoute>
            } />
            <Route path="/manager/history" element={
              <ProtectedRoute roles={['manager']}><ManagerHistory /></ProtectedRoute>
            } />
            <Route path="/authority" element={
              <ProtectedRoute roles={['user', 'authority']}><AuthorityDashboard /></ProtectedRoute>
            } />
            <Route path="/shelters/:id" element={
              <ProtectedRoute><ShelterDetail /></ProtectedRoute>
            } />
            <Route path="/shelters/:id/redistribute" element={
              <ProtectedRoute roles={['user', 'admin']}><RedistributeAction /></ProtectedRoute>
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
