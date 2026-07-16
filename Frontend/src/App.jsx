import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, Clock, LogOut, Users, ChevronDown, Menu, X, Shield, Briefcase, Mail, Phone, User as UserIcon } from 'lucide-react';
import api from './api/axios';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login          from './pages/Login';
import Dashboard      from './pages/Dashboard';
import Samples        from './pages/Samples';
import SalesOrders    from './pages/SalesOrders';
import PurchaseIMOs   from './pages/PurchaseIMOs';
import UserManagement from './pages/UserManagement';
import Sanding        from './pages/Sanding';
import Buyers         from './pages/Buyers';
import BuyerMasters   from './pages/BuyerMasters';
import POs            from './pages/POs';

import pinkcityLogo from './assets/Logo_2.png';

const ROLE_COLORS = {
  admin:      '#8b5a2b',
  supervisor: '#a855f7',
  contractor: '#22c55e',
};

function Navbar() {
  const { user, setUser, logout, isAdmin, isSandingSupervisor, isContractor } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (user) {
      api.get('/auth/me/')
        .then(res => {
          const updatedUser = {
            id: res.data.id,
            username: res.data.username,
            full_name: `${res.data.first_name || ''} ${res.data.last_name || ''}`.trim() || res.data.username,
            first_name: res.data.first_name,
            last_name: res.data.last_name,
            email: res.data.email,
            phone: res.data.phone,
            role: res.data.role,
            batch_category: res.data.batch_category,
            supervisor_name: res.data.supervisor_name,
            profile_image: res.data.profile_image,
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        })
        .catch(err => {
          console.error('Failed to sync user profile', err);
          if (err.response?.status === 401) {
            logout();
          }
        });
    }
  }, []);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" onClick={() => setMobileMenuOpen(false)}>
          <img src={pinkcityLogo} alt="Pinkcity Logo" className="navbar-logo-img" />
          <span className="navbar-brand-text">Pinkcity Imports ERP</span>
        </Link>

        {/* Mobile menu toggle */}
        <button 
          className="navbar-toggle-btn" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} color="#64748b" /> : <Menu size={24} color="#64748b" />}
        </button>

        {/* Navbar links & actions */}
        <div className={`navbar-menu ${mobileMenuOpen ? 'is-open' : ''}`}>
          {/* Search bar */}
          <div className="navbar-search-wrapper">
            <input
              type="text"
              placeholder="Search menus..."
              className="navbar-search-input"
            />
            <Search size={16} color="#64748b" className="navbar-search-icon" />
          </div>

          {/* Action buttons & User profile info */}
          <div className="navbar-actions">
            <div className="navbar-action-icons">
              <Bell size={20} color="#64748b" className="navbar-action-icon" />
              <Clock size={20} color="#64748b" className="navbar-action-icon" />
            </div>

            {user && (
              <div className="navbar-user-section">
                {/* Role badge */}
                <span
                  className="navbar-role-badge"
                  style={{ backgroundColor: ROLE_COLORS[user.role] + '20', color: ROLE_COLORS[user.role] }}
                >
                  {isSandingSupervisor ? 'Sanding Supervisor' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>

                {/* User info */}
                <div className="navbar-user" onClick={() => setShowProfileModal(true)} style={{ cursor: 'pointer' }}>
                   {user.profile_image ? (
                     <img
                       src={user.profile_image}
                       alt={user.full_name || user.username}
                       className="navbar-avatar"
                       style={{ objectFit: 'cover', border: `2px solid ${ROLE_COLORS[user.role]}` }}
                     />
                   ) : (
                     <div
                       className="navbar-avatar"
                       style={{ backgroundColor: ROLE_COLORS[user.role] }}
                     >
                       {(user.full_name?.[0] || user.username?.[0] || 'U').toUpperCase()}
                     </div>
                   )}
                   <span className="navbar-username">{user.full_name || user.username}</span>
                </div>

                {/* Admin link */}
                {isAdmin && (
                  <Link to="/users" className="navbar-icon-btn" title="User Management" onClick={() => setMobileMenuOpen(false)}>
                    <Users size={18} color="#64748b" />
                    <span className="navbar-mobile-label">User Management</span>
                  </Link>
                )}

                {/* Logout */}
                <button className="navbar-logout-btn" onClick={handleLogout} title="Logout">
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Details Modal */}
      {showProfileModal && user && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" style={{ maxWidth: '380px', borderRadius: '12px', padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h2>User Profile</h2>
              <button className="modal-close" onClick={() => setShowProfileModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem', paddingTop: '1rem' }}>
              <div style={{ position: 'relative' }}>
                {user.profile_image ? (
                  <img 
                    src={user.profile_image} 
                    alt="Profile" 
                    style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${ROLE_COLORS[user.role]}` }}
                  />
                ) : (
                  <div 
                    style={{ 
                      width: '110px', 
                      height: '110px', 
                      borderRadius: '50%', 
                      backgroundColor: ROLE_COLORS[user.role], 
                      color: '#fff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '2.5rem', 
                      fontWeight: 'bold' 
                    }}
                  >
                    {(user.full_name?.[0] || user.username?.[0] || 'U').toUpperCase()}
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: '0.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-color)', margin: 0 }}>
                  {user.full_name || user.username}
                </h3>
                <span 
                  className="navbar-role-badge"
                  style={{ 
                    backgroundColor: ROLE_COLORS[user.role] + '20', 
                    color: ROLE_COLORS[user.role], 
                    display: 'inline-block', 
                    marginTop: '0.35rem',
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.5rem'
                  }}
                >
                  {isSandingSupervisor ? 'Sanding Supervisor' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
              </div>

              <div style={{ width: '100%', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <UserIcon size={16} color="#64748b" style={{ flexShrink: 0 }} />
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Username</span>
                    <strong style={{ color: 'var(--text-color)' }}>{user.username}</strong>
                  </div>
                </div>

                {user.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Mail size={16} color="#64748b" style={{ flexShrink: 0 }} />
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Email</span>
                      <strong style={{ color: 'var(--text-color)', wordBreak: 'break-all' }}>{user.email}</strong>
                    </div>
                  </div>
                )}

                {user.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Phone size={16} color="#64748b" style={{ flexShrink: 0 }} />
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Phone</span>
                      <strong style={{ color: 'var(--text-color)' }}>{user.phone}</strong>
                    </div>
                  </div>
                )}

                {user.role === 'supervisor' && user.batch_category && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Briefcase size={16} color="#64748b" style={{ flexShrink: 0 }} />
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Batch Category</span>
                      <strong style={{ color: 'var(--text-color)' }}>
                        {user.batch_category.charAt(0).toUpperCase() + user.batch_category.slice(1)}
                      </strong>
                    </div>
                  </div>
                )}

                {user.role === 'contractor' && user.supervisor_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Briefcase size={16} color="#64748b" style={{ flexShrink: 0 }} />
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Supervisor</span>
                      <strong style={{ color: 'var(--text-color)' }}>{user.supervisor_name}</strong>
                    </div>
                  </div>
                )}
              </div>

              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setShowProfileModal(false)}
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.4rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function AppLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  return (
    <div className="app-container">
      {isAuthenticated && !isLogin && <Navbar />}
      <main className={isLogin ? '' : 'container'}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/samples" element={<ProtectedRoute><Samples /></ProtectedRoute>} />
          <Route path="/buyers" element={<ProtectedRoute><Buyers /></ProtectedRoute>} />
          <Route path="/buyer-masters" element={<ProtectedRoute><BuyerMasters /></ProtectedRoute>} />
          <Route path="/pos" element={<ProtectedRoute><POs /></ProtectedRoute>} />
          <Route path="/sales-orders" element={<ProtectedRoute><SalesOrders /></ProtectedRoute>} />
          <Route path="/purchase-imos" element={<ProtectedRoute><PurchaseIMOs /></ProtectedRoute>} />

          {/* Sanding — accessible to Supervisor (sanding), Contractor, and Admin */}
          <Route
            path="/sanding"
            element={
              <ProtectedRoute>
                <Sanding />
              </ProtectedRoute>
            }
          />

          {/* Admin only */}
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </Router>
  );
}

export default App;
