import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Users, UserPlus, Edit2, Trash2, X, ChevronDown, Key, Search, Warehouse,
  Shield, Briefcase, Hammer, CheckCircle, AlertCircle, Monitor, UserCheck, ShoppingBag, Eye, EyeOff
} from 'lucide-react';
import { TableSkeleton } from '../components/TableSkeleton';
import CustomSelect from '../components/CustomSelect';
import Pagination from '../components/Pagination';

const ROLE_CONFIG = {
  admin:         { label: 'Admin',         color: '#8b5a2b', badge: 'admin-badge',         icon: Shield },
  supervisor:    { label: 'Supervisor',    color: '#a855f7', badge: 'supervisor-badge',    icon: Briefcase },
  contractor:    { label: 'Contractor',    color: '#22c55e', badge: 'contractor-badge',    icon: Hammer },
  store_manager: { label: 'Store Manager', color: '#ea580c', badge: 'store-manager-badge', icon: Warehouse },
  merchant:      { label: 'Merchant',      color: '#2563eb', badge: 'merchant-badge',      icon: ShoppingBag },
};

const BATCH_LABELS = {
  sanding: 'Sanding', polish: 'Polish', fitting: 'Fitting', packaging: 'Packaging',
};

const EMPTY_FORM = {
  username: '', first_name: '', last_name: '', email: '', phone: '',
  role: 'supervisor', batch_category: '', supervisor: '', password: '', is_active: true,
};

export default function UserManagement() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [filterRole, setFilterRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Password Reset Modal state
  const [resetPassUser, setResetPassUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetFeedback, setResetFeedback] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [showPassText, setShowPassText] = useState(false);

  // Profile Image crop states
  const [selectedImgFile, setSelectedImgFile] = useState(null);
  const [imgToCrop, setImgToCrop] = useState(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  // Active Devices State
  const [activeDevices, setActiveDevices] = useState([]);

  useEffect(() => {
    if (isAdmin) {
      api.get('/auth/devices/')
        .then(res => setActiveDevices(res.data || []))
        .catch(err => console.error("Failed to load devices", err));
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = filterRole ? { role: filterRole, nopage: true } : { nopage: true };
      const res = await api.get('/users/', { params });
      setUsers(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupervisors = async () => {
    try {
      const res = await api.get('/users/supervisors/', { params: { nopage: true } });
      setSupervisors(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered Users List based on role and search query
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesRole = !filterRole || u.role === filterRole;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        u.username.toLowerCase().includes(q) ||
        (u.first_name || '').toLowerCase().includes(q) ||
        (u.last_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q)
      );
      return matchesRole && matchesSearch;
    });
  }, [users, filterRole, searchQuery]);

  // Pagination State (20 per page)
  const ITEMS_PER_PAGE = 20;
  const [pageUser, setPageUser] = useState(1);

  useEffect(() => {
    setPageUser(1);
  }, [filterRole, searchQuery]);

  const paginatedUsers = filteredUsers.slice((pageUser - 1) * ITEMS_PER_PAGE, pageUser * ITEMS_PER_PAGE);

  useEffect(() => { fetchUsers(); }, [filterRole]);
  useEffect(() => { fetchSupervisors(); }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedImgFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImgToCrop(reader.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setCroppedImageBlob(null);
    setCropPreviewUrl(null);
    setSelectedImgFile(null);
    setImgToCrop(null);
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      batch_category: user.batch_category || '',
      supervisor: user.supervisor || '',
      password: '',
      is_active: user.is_active,
      profile_image: user.profile_image || ''
    });
    setCroppedImageBlob(null);
    setCropPreviewUrl(null);
    setSelectedImgFile(null);
    setImgToCrop(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFeedback(null);
    setCroppedImageBlob(null);
    setCropPreviewUrl(null);
    setSelectedImgFile(null);
    setImgToCrop(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append('username', form.username);
      formData.append('first_name', form.first_name);
      formData.append('last_name', form.last_name);
      formData.append('email', form.email);
      formData.append('phone', form.phone);
      formData.append('role', form.role);
      formData.append('is_active', form.is_active);

      if (form.password) {
        formData.append('password', form.password);
      }

      if (form.role === 'supervisor') {
        if (form.batch_category) formData.append('batch_category', form.batch_category);
      }
      if (form.role === 'contractor') {
        if (form.supervisor) formData.append('supervisor', form.supervisor);
      }

      if (croppedImageBlob) {
        formData.append('profile_image', croppedImageBlob, 'profile_pic.jpg');
      }

      const headers = { 'Content-Type': 'multipart/form-data' };

      if (editingUser) {
        await api.patch(`/users/${editingUser.id}/`, formData, { headers });
        setFeedback({ type: 'success', msg: 'User updated successfully.' });
      } else {
        await api.post('/users/', formData, { headers });
        setFeedback({ type: 'success', msg: 'User created successfully.' });
      }
      fetchUsers();
      fetchSupervisors();
      setTimeout(closeModal, 1200);
    } catch (err) {
      const data = err.response?.data;
      const msg = data
        ? Object.values(data).flat().join(' ')
        : 'An error occurred. Please try again.';
      setFeedback({ type: 'error', msg });
    } finally {
      setSaving(false);
    }
  };

  // Toggle active/inactive status instantly
  const handleToggleActive = async (user) => {
    try {
      const updated = !user.is_active;
      await api.patch(`/users/${user.id}/`, { is_active: updated });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: updated } : u));
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  };

  // Quick Password Reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      setResetFeedback({ type: 'error', msg: 'Password must be at least 4 characters long.' });
      return;
    }
    setResetting(true);
    setResetFeedback(null);
    try {
      await api.patch(`/users/${resetPassUser.id}/`, { password: newPassword });
      setResetFeedback({ type: 'success', msg: `Password updated successfully for ${resetPassUser.username}.` });
      setTimeout(() => {
        setResetPassUser(null);
        setNewPassword('');
        setResetFeedback(null);
      }, 1500);
    } catch (err) {
      setResetFeedback({ type: 'error', msg: 'Failed to reset password. Please try again.' });
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (user) => {
    try {
      await api.delete(`/users/${user.id}/`);
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const groupedUsers = {
    admin:         users.filter((u) => u.role === 'admin'),
    supervisor:    users.filter((u) => u.role === 'supervisor'),
    contractor:    users.filter((u) => u.role === 'contractor'),
    store_manager: users.filter((u) => u.role === 'store_manager'),
    merchant:      users.filter((u) => u.role === 'merchant'),
  };

  if (!isAdmin) {
    return (
      <div className="um-access-denied">
        <Shield size={48} color="#ef4444" />
        <h2>Access Denied</h2>
        <p>User management is restricted to Administrators only.</p>
      </div>
    );
  }

  return (
    <div className="um-container" style={{ padding: '1.25rem 0', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="um-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>
            <UserCheck size={28} color="#0284c7" style={{ flexShrink: 0 }} /> Enterprise User Control & Role Management
          </h1>
          <p className="um-subtitle" style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            Manage user accounts, assign roles, toggle active status, and reset security credentials
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {activeDevices.length > 0 && (
            <button 
              className="btn-secondary"
              title="Click to view and manage all active session devices"
              onClick={() => navigate('/active-devices')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.85rem', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <Monitor size={16} />
              {activeDevices.length} Active Device{activeDevices.length > 1 ? 's' : ''}
            </button>
          )}
          <button className="btn-primary um-add-btn" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.1rem' }}>
            <UserPlus size={18} />
            + Add New User
          </button>
        </div>
      </div>

      {/* Role Stats Row */}
      <div className="um-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {Object.entries(groupedUsers).map(([role, list]) => {
          const cfg = ROLE_CONFIG[role] || { label: role, color: '#64748b', icon: Shield };
          const IconComponent = cfg.icon;
          const isSelected = filterRole === role;
          return (
            <div
              key={role}
              className={`um-stat-card ${isSelected ? 'active' : ''}`}
              onClick={() => setFilterRole(isSelected ? '' : role)}
              style={{
                backgroundColor: '#ffffff',
                padding: '1rem 1.1rem',
                borderRadius: '14px',
                border: isSelected ? `2px solid ${cfg.color}` : '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? `0 4px 12px ${cfg.color}30` : '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}
            >
              <div className="um-stat-icon" style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: cfg.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconComponent size={20} color={cfg.color} />
              </div>
              <div>
                <p className="um-stat-count" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{list.length}</p>
                <p className="um-stat-label" style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{cfg.label}s</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter & Keyword Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', backgroundColor: '#ffffff', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.45rem 0.75rem', backgroundColor: '#f8fafc' }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by name, username, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem' }}
          />
        </div>

        {/* Role Filters */}
        <div className="um-filter-bar" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Filter:</span>
          {['', 'admin', 'supervisor', 'contractor', 'store_manager', 'merchant'].map((r) => {
            const cfg = ROLE_CONFIG[r];
            const isSel = filterRole === r;
            return (
              <button
                key={r || 'all'}
                className={`um-filter-btn ${isSel ? 'active' : ''}`}
                onClick={() => setFilterRole(r)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  border: isSel ? `1.5px solid ${cfg ? cfg.color : '#8b5a2b'}` : '1px solid #cbd5e1',
                  backgroundColor: isSel ? (cfg ? cfg.color + '15' : '#8b5a2b15') : '#ffffff',
                  color: isSel ? (cfg ? cfg.color : '#8b5a2b') : '#475569',
                  fontSize: '0.78rem',
                  fontWeight: isSel ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {r ? cfg?.label : 'All Roles'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container" style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <table className="data-table">
          <thead style={{ backgroundColor: '#faf8f5', borderBottom: '2px solid #e2e8f0' }}>
            <tr>
              <th>User Account</th>
              <th>Username</th>
              <th>Role</th>
              <th>Assignment Details</th>
              <th>Phone / Email</th>
              <th>Status (Click Toggle)</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={6} cols={7} hasImage={false} />
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={7} className="um-empty" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No users found matching current filters.</td></tr>
            ) : (
              paginatedUsers.map((u) => {
                const cfg = ROLE_CONFIG[u.role] || { label: u.role, color: '#64748b', badge: 'admin-badge' };
                return (
                  <tr key={u.id} className="smooth-fade-in" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="um-name-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {u.profile_image ? (
                          <img
                            src={u.profile_image}
                            alt={u.username}
                            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${cfg.color}`, flexShrink: 0 }}
                          />
                        ) : (
                          <div className="um-avatar" style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: cfg.color + '20', color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                            {(u.first_name?.[0] || u.username[0]).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="um-full-name" style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                            {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}` : u.username}
                          </p>
                          <p className="um-email-small" style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{u.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>

                    <td><code className="um-code" style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>{u.username}</code></td>

                    <td>
                      <span className={`login-role-badge ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </td>

                    <td>
                      {u.role === 'supervisor' && u.batch_category && (
                        <span className="um-batch-tag">{BATCH_LABELS[u.batch_category] || u.batch_category}</span>
                      )}
                      {u.role === 'contractor' && u.supervisor_name && (
                        <span className="um-supervisor-tag">{u.supervisor_name}</span>
                      )}
                      {u.role === 'store_manager' && (
                        <span style={{ fontSize: '0.78rem', color: '#ea580c', fontWeight: 600 }}>Store Inventory Lead</span>
                      )}
                      {u.role === 'merchant' && (
                        <span style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 600 }}>Buyer Representative</span>
                      )}
                    </td>

                    <td style={{ fontSize: '0.825rem', color: '#475569' }}>
                      <div>{u.phone || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.email || ''}</div>
                    </td>

                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u)}
                        title="Click to toggle Active/Inactive status"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        <span className={`um-status ${u.is_active ? 'active' : 'inactive'}`} style={{ cursor: 'pointer' }}>
                          {u.is_active ? '● Active' : '○ Inactive'}
                        </span>
                      </button>
                    </td>

                    <td>
                      <div className="um-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <button
                          className="um-action-btn edit"
                          onClick={() => openEdit(u)}
                          title="Edit User Details"
                          style={{ padding: '5px 8px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          className="um-action-btn"
                          onClick={() => { setResetPassUser(u); setNewPassword(''); setResetFeedback(null); }}
                          title="Reset Password"
                          style={{ padding: '5px 8px', borderRadius: '6px', backgroundColor: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff', cursor: 'pointer' }}
                        >
                          <Key size={14} />
                        </button>

                        <button
                          className="um-action-btn delete"
                          onClick={() => setDeleteConfirm(u)}
                          title="Delete User"
                          style={{ padding: '5px 8px', borderRadius: '6px', backgroundColor: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div style={{ padding: '0.85rem 1.25rem' }}>
          <Pagination
            currentPage={pageUser}
            totalPages={Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1}
            onPageChange={setPageUser}
          />
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetPassUser && (
        <div className="modal-overlay" onClick={() => setResetPassUser(null)}>
          <div className="modal-content" style={{ maxWidth: '420px', borderRadius: '16px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.1rem' }}>
                <Key size={20} color="#7e22ce" /> Reset Password
              </h2>
              <button className="modal-close" onClick={() => setResetPassUser(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#475569', marginTop: 0 }}>
                Set a new login password for <strong>{resetPassUser.full_name || resetPassUser.username}</strong> (<code>{resetPassUser.username}</code>).
              </p>

              {resetFeedback && (
                <div className={`um-feedback ${resetFeedback.type}`} style={{ marginBottom: '1rem' }}>
                  {resetFeedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {resetFeedback.msg}
                </div>
              )}

              <form onSubmit={handleResetPassword}>
                <div className="form-group" style={{ position: 'relative', marginBottom: '1.25rem' }}>
                  <label className="form-label">New Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassText ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="form-input"
                      placeholder="Enter new strong password"
                      required
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassText(!showPassText)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                    >
                      {showPassText ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="um-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setResetPassUser(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={resetting} style={{ backgroundColor: '#7e22ce', borderColor: '#7e22ce' }}>
                    {resetting ? 'Updating...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" style={{ maxWidth: '420px', borderRadius: '16px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: 'none' }}>
              <h2 style={{ color: '#be123c', margin: 0, fontSize: '1.1rem' }}>Delete User Account?</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '1rem 1.25rem 1.5rem 1.25rem' }}>
              <p style={{ fontSize: '0.9rem', color: '#334155', marginTop: 0 }}>
                Are you sure you want to delete user <strong>{deleteConfirm.username}</strong> ({deleteConfirm.first_name} {deleteConfirm.last_name})?
              </p>
              <p style={{ fontSize: '0.8rem', color: '#be123c', backgroundColor: '#fff1f2', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                ⚠️ Warning: This operation will revoke all access rights and logged device sessions.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn-primary" style={{ backgroundColor: '#be123c', borderColor: '#be123c' }} onClick={() => handleDelete(deleteConfirm)}>
                  Confirm Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', borderRadius: '16px' }}>
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User Account' : 'Create New User Account'}</h2>
              <button className="modal-close" onClick={closeModal}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
              {feedback && (
                <div className={`um-feedback ${feedback.type}`} style={{ marginBottom: '1rem' }}>
                  {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {feedback.msg}
                </div>
              )}
              <form onSubmit={handleSave} className="um-form">
                
                {/* Profile Image Picker & Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem', gap: '0.4rem' }}>
                  <div style={{ position: 'relative', width: '84px', height: '84px' }}>
                    <img 
                      src={cropPreviewUrl || form.profile_image || 'https://via.placeholder.com/84?text=User'} 
                      alt="Profile" 
                      style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #8b5a2b' }}
                    />
                    <label 
                      style={{ 
                        position: 'absolute', bottom: 0, right: 0, 
                        backgroundColor: '#8b5a2b', color: '#fff', 
                        width: '26px', height: '26px', borderRadius: '50%', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        cursor: 'pointer', border: '2px solid #fff' 
                      }}
                      title="Upload Profile Image"
                    >
                      <UserPlus size={13} />
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileSelect} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Upload 1:1 Profile Picture</span>
                </div>

                <div className="um-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input name="first_name" value={form.first_name} onChange={handleChange} className="form-input" placeholder="First name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input name="last_name" value={form.last_name} onChange={handleChange} className="form-input" placeholder="Last name" />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label className="form-label">Username *</label>
                  <input name="username" value={form.username} onChange={handleChange} className="form-input" placeholder="username" required />
                </div>

                <div className="um-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} className="form-input" placeholder="email@company.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input name="phone" value={form.phone} onChange={handleChange} className="form-input" placeholder="+91 00000 00000" />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label className="form-label">Enterprise User Role *</label>
                  <CustomSelect name="role" value={form.role} onChange={handleChange} className="form-input">
                    <option value="admin">Admin (Full System Access)</option>
                    <option value="supervisor">Supervisor (Factory & Quality Lead)</option>
                    <option value="contractor">Contractor (Worker Delegate)</option>
                    <option value="store_manager">Store Manager (Inventory Lead)</option>
                    <option value="merchant">Merchant (Buyer Representative)</option>
                  </CustomSelect>
                </div>

                {form.role === 'supervisor' && (
                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">Batch Category *</label>
                    <CustomSelect name="batch_category" value={form.batch_category} onChange={handleChange} className="form-input">
                      <option value="">Select batch category</option>
                      <option value="sanding">Sanding</option>
                      <option value="polish">Polish</option>
                      <option value="fitting">Fitting</option>
                      <option value="packaging">Packaging</option>
                    </CustomSelect>
                  </div>
                )}

                {form.role === 'contractor' && (
                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">Supervisor *</label>
                    <CustomSelect name="supervisor" value={form.supervisor} onChange={handleChange} className="form-input">
                      <option value="">Select supervisor</option>
                      {supervisors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({BATCH_LABELS[s.batch_category] || s.batch_category})
                        </option>
                      ))}
                    </CustomSelect>
                  </div>
                )}

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label className="form-label">{editingUser ? 'New Password (leave blank to keep current)' : 'Account Password *'}</label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    className="form-input"
                    placeholder={editingUser ? '••••••••' : 'Enter password'}
                    required={!editingUser}
                  />
                </div>

                <div className="form-group um-active-toggle" style={{ marginTop: '1rem' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                    <strong>Active Account Status</strong>
                  </label>
                </div>

                <div className="um-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editingUser ? 'Update Account' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
