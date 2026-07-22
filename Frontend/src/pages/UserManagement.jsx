import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  Users, UserPlus, Edit2, Trash2, X, ChevronDown,
  Shield, Briefcase, Hammer, CheckCircle, AlertCircle,
} from 'lucide-react';

const ROLE_CONFIG = {
  admin:      { label: 'Admin',      color: '#8b5a2b', badge: 'admin-badge' },
  supervisor: { label: 'Supervisor', color: '#a855f7', badge: 'supervisor-badge' },
  contractor: { label: 'Contractor', color: '#22c55e', badge: 'contractor-badge' },
};

const BATCH_LABELS = {
  sanding: 'Sanding', polish: 'Polish', fitting: 'Fitting', packaging: 'Packaging',
};

const EMPTY_FORM = {
  username: '', first_name: '', last_name: '', email: '', phone: '',
  role: 'contractor', batch_category: '', supervisor: '', password: '', is_active: true,
};

function UserManagement() {
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
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Profile Image crop states
  const [selectedImgFile, setSelectedImgFile] = useState(null);
  const [imgToCrop, setImgToCrop] = useState(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = filterRole ? { role: filterRole, nopage: true } : { nopage: true };
      const res = await api.get('/users/', { params });
      setUsers(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupervisors = async () => {
    try {
      const res = await api.get('/users/supervisors/', { params: { nopage: true } });
      setSupervisors(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleCropComplete = (blob, previewUrl) => {
    setCroppedImageBlob(blob);
    setCropPreviewUrl(previewUrl);
    setShowCropper(false);
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
    admin: users.filter((u) => u.role === 'admin'),
    supervisor: users.filter((u) => u.role === 'supervisor'),
    contractor: users.filter((u) => u.role === 'contractor'),
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
    <div className="um-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="um-title">User Management</h1>
          <p className="um-subtitle">Manage system users, roles, and assignments</p>
        </div>
        <button className="btn-primary um-add-btn" onClick={openCreate}>
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      {/* Stats Row */}
      <div className="um-stats">
        {Object.entries(groupedUsers).map(([role, list]) => (
          <div key={role} className="um-stat-card" onClick={() => setFilterRole(role === filterRole ? '' : role)}>
            <div className="um-stat-icon" style={{ backgroundColor: ROLE_CONFIG[role]?.color + '20' }}>
              {role === 'admin' && <Shield size={20} color={ROLE_CONFIG[role]?.color} />}
              {role === 'supervisor' && <Briefcase size={20} color={ROLE_CONFIG[role]?.color} />}
              {role === 'contractor' && <Hammer size={20} color={ROLE_CONFIG[role]?.color} />}
            </div>
            <div>
              <p className="um-stat-count">{list.length}</p>
              <p className="um-stat-label">{ROLE_CONFIG[role]?.label}s</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="um-filter-bar">
        <span className="um-filter-label">Filter by role:</span>
        {['', 'admin', 'supervisor', 'contractor'].map((r) => (
          <button
            key={r || 'all'}
            className={`um-filter-btn ${filterRole === r ? 'active' : ''}`}
            onClick={() => setFilterRole(r)}
          >
            {r ? ROLE_CONFIG[r]?.label : 'All'}
          </button>
        ))}
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="um-loading">Loading users...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Batch / Supervisor</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={7} className="um-empty">No users found.</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="um-name-cell">
                    <div className="um-avatar" style={{ backgroundColor: ROLE_CONFIG[u.role]?.color + '20' }}>
                      {(u.first_name?.[0] || u.username[0]).toUpperCase()}
                    </div>
                    <div>
                      <p className="um-full-name">{u.first_name} {u.last_name}</p>
                      <p className="um-email-small">{u.email}</p>
                    </div>
                  </td>
                  <td><code className="um-code">{u.username}</code></td>
                  <td>
                    <span className={`login-role-badge ${ROLE_CONFIG[u.role]?.badge}`}>
                      {ROLE_CONFIG[u.role]?.label}
                    </span>
                  </td>
                  <td>
                    {u.role === 'supervisor' && u.batch_category && (
                      <span className="um-batch-tag">{BATCH_LABELS[u.batch_category]}</span>
                    )}
                    {u.role === 'contractor' && u.supervisor_name && (
                      <span className="um-supervisor-tag">{u.supervisor_name}</span>
                    )}
                    {u.role === 'contractor' && u.contractor_count !== null && (
                      <span className="um-count-tag">{u.contractor_count} contractor{u.contractor_count !== 1 ? 's' : ''}</span>
                    )}
                  </td>
                  <td>{u.email || '—'}</td>
                  <td>
                    <span className={`um-status ${u.is_active ? 'active' : 'inactive'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="um-actions">
                      <button className="um-action-btn edit" onClick={() => openEdit(u)} title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button className="um-action-btn delete" onClick={() => setDeleteConfirm(u)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'Create New User'}</h2>
              <button className="modal-close" onClick={closeModal}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {feedback && (
                <div className={`um-feedback ${feedback.type}`}>
                  {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {feedback.msg}
                </div>
              )}
              <form onSubmit={handleSave} className="um-form">
                
                {/* Profile Image Picker & Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', width: '90px', height: '90px' }}>
                    <img 
                      src={cropPreviewUrl || form.profile_image || 'https://via.placeholder.com/90?text=User'} 
                      alt="Profile" 
                      style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #a855f7' }}
                    />
                    <label 
                      style={{ 
                        position: 'absolute', bottom: 0, right: 0, 
                        backgroundColor: '#a855f7', color: '#fff', 
                        width: '28px', height: '28px', borderRadius: '50%', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        cursor: 'pointer', border: '2px solid #fff' 
                      }}
                      title="Upload Profile Image"
                    >
                      <UserPlus size={14} />
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileSelect} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Upload 1:1 Profile Picture</span>
                </div>

                <div className="um-form-row">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input name="first_name" value={form.first_name} onChange={handleChange} className="form-input" placeholder="First name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input name="last_name" value={form.last_name} onChange={handleChange} className="form-input" placeholder="Last name" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input name="username" value={form.username} onChange={handleChange} className="form-input" placeholder="username" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} className="form-input" placeholder="email@company.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} className="form-input" placeholder="+91 00000 00000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select name="role" value={form.role} onChange={handleChange} className="form-input" required>
                    <option value="admin">Admin</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="contractor">Contractor</option>
                  </select>
                </div>
                {form.role === 'supervisor' && (
                  <div className="form-group">
                    <label className="form-label">Batch Category *</label>
                    <select name="batch_category" value={form.batch_category} onChange={handleChange} className="form-input" required>
                      <option value="">Select batch category</option>
                      <option value="sanding">Sanding</option>
                      <option value="polish">Polish</option>
                      <option value="fitting">Fitting</option>
                      <option value="packaging">Packaging</option>
                    </select>
                  </div>
                )}
                {form.role === 'contractor' && (
                  <div className="form-group">
                    <label className="form-label">Supervisor *</label>
                    <select name="supervisor" value={form.supervisor} onChange={handleChange} className="form-input" required>
                      <option value="">Select supervisor</option>
                      {supervisors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({BATCH_LABELS[s.batch_category] || s.batch_category})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">{editingUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
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
                <div className="form-group um-active-toggle">
                  <label className="form-label">
                    <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                    &nbsp; Active Account
                  </label>
                </div>
                <div className="um-form-actions">
                  <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete User</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{deleteConfirm.first_name} {deleteConfirm.last_name} ({deleteConfirm.username})</strong>?</p>
              <p style={{ color: '#ef4444', marginTop: '0.5rem', fontSize: '0.875rem' }}>This action cannot be undone.</p>
              <div className="um-form-actions" style={{ marginTop: '1.5rem' }}>
                <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button className="btn-primary" style={{ backgroundColor: '#ef4444' }} onClick={() => handleDelete(deleteConfirm)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Overlay */}
      {showCropper && (
        <ImageCropper
          src={imgToCrop}
          onCrop={handleCropComplete}
          onCancel={() => setShowCropper(false)}
        />
      )}
    </div>
  );
}

// ─── ImageCropper subcomponent (HTML5 Canvas crop 1:1) ───────────────────────

function ImageCropper({ src, onCrop, onCancel }) {
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const imgRef = React.useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setStartPos({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - startPos.x,
      y: e.touches[0].clientY - startPos.y
    });
  };

  const handleApply = () => {
    const img = imgRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    const displayWidth = img.naturalWidth;
    const displayHeight = img.naturalHeight;
    const containerSize = 250;
    const scaleFactor = Math.min(containerSize / displayWidth, containerSize / displayHeight);
    
    const baseW = displayWidth * scaleFactor;
    const baseH = displayHeight * scaleFactor;
    
    const curW = baseW * zoom;
    const curH = baseH * zoom;
    
    const xInContainer = (containerSize - curW) / 2 + offset.x;
    const yInContainer = (containerSize - curH) / 2 + offset.y;
    
    const srcX = (25 - xInContainer) * (img.naturalWidth / curW);
    const srcY = (25 - yInContainer) * (img.naturalHeight / curH);
    
    const srcW = 200 * (img.naturalWidth / curW);
    const srcH = 200 * (img.naturalHeight / curH);

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, 300, 300);

    canvas.toBlob((blob) => {
      onCrop(blob, canvas.toDataURL('image/jpeg'));
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal-content" style={{ maxWidth: '350px', padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Crop Profile Picture (1:1)</h3>
        
        <div 
          style={{
            width: '250px',
            height: '250px',
            margin: '0 auto',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#111',
            borderRadius: '8px',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          <img
            ref={imgRef}
            src={src}
            alt="Source"
            draggable={false}
            style={{
              position: 'absolute',
              width: 'auto',
              height: 'auto',
              maxWidth: '100%',
              maxHeight: '100%',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              pointerEvents: 'none',
            }}
          />
          <div 
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
              borderRadius: '50%',
              border: '2px solid #fff',
              margin: '25px',
              pointerEvents: 'none',
            }}
          />
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Zoom:</label>
          <input 
            type="range" 
            min="1" 
            max="3" 
            step="0.05" 
            value={zoom} 
            onChange={e => setZoom(parseFloat(e.target.value))} 
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'end', gap: '0.75rem' }}>
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleApply}>Crop & Save</button>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
