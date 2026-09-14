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
import ManagerDashboard from './pages/ManagerDashboard';
import AuthorityDashboard from './pages/AuthorityDashboard';
import ShelterDetail from './pages/ShelterDetail';
import RedistributeAction from './pages/RedistributeAction';
import CitizenRequestShelter from './pages/CitizenRequestShelter';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Navbar />
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/request-shelter" element={<CitizenRequestShelter />} />

            {/* Citizen Dashboard */}
            <Route path="/user" element={
              <ProtectedRoute roles={['user', 'admin']}><CitizenRequestShelter /></ProtectedRoute>
            } />

            {/* Administrator Modules */}
            <Route path="/admin" element={
              <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>
            } />

            {/* Shelter Manager Module */}
            <Route path="/manager" element={
              <ProtectedRoute roles={['manager', 'admin']}><ManagerDashboard /></ProtectedRoute>
            } />

            {/* Disaster Authority Module */}
            <Route path="/authority" element={
              <ProtectedRoute roles={['authority', 'admin']}><AuthorityDashboard /></ProtectedRoute>
            } />

            {/* Shelter Details (All authenticated users) */}
            <Route path="/shelters/:id" element={
              <ProtectedRoute><ShelterDetail /></ProtectedRoute>
            } />

            {/* Shelter Redistribution Action (Authority and Admin only) */}
            <Route path="/shelters/:id/redistribute" element={
              <ProtectedRoute roles={['authority', 'admin']}><RedistributeAction /></ProtectedRoute>
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
