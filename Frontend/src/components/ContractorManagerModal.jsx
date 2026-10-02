import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import {
  X, Users, Hammer, Briefcase, Plus, Edit, Search, Check, AlertCircle,
  Phone, Mail, Factory, Shield, Sparkles, CheckCircle2, UserCheck, ChevronRight
} from 'lucide-react';

const BATCH_CATEGORIES = [
  { value: 'sanding', label: 'Sanding' },
  { value: 'polish', label: 'Polish' },
  { value: 'fitting', label: 'Fitting' },
  { value: 'packaging', label: 'Packaging' },
];

export default function ContractorManagerModal({
  isOpen,
  onClose,
  onUpdated,
  unitsList,
  units,
  supervisorsList,
  supervisors,
  initialRole = 'contractor',
  initialEditPersonnel = null
}) {
  const [personnelList, setPersonnelList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'contractor' | 'supervisor'

  const [availableUnits, setAvailableUnits] = useState(unitsList || units || []);
  const [availableSupervisors, setAvailableSupervisors] = useState(supervisorsList || supervisors || []);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: initialRole,
    production_unit: '',
    supervisor: '',
    batch_category: 'sanding',
    password: '',
    is_active: true
  });

  const [userCustomizedUsername, setUserCustomizedUsername] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);

  // Fetch personnel and dropdown dependencies when modal opens
  const fetchPersonnel = async () => {
    setLoading(true);
    try {
      const [uRes, sRes, fRes] = await Promise.all([
        api.get('/users/', { params: { nopage: true } }),
        api.get('/users/supervisors/', { params: { nopage: true } }).catch(() => ({ data: [] })),
        api.get('/store/production-units/', { params: { nopage: true } }).catch(() => ({ data: [] }))
      ]);

      const allUsers = uRes.data.results || uRes.data || [];
      const staffOnly = allUsers.filter(u => u.role === 'contractor' || u.role === 'supervisor');
      setPersonnelList(staffOnly);

      const sups = sRes.data.results || sRes.data || [];
      if (sups.length > 0) setAvailableSupervisors(sups);

      const facUnits = fRes.data.results || fRes.data || [];
      if (facUnits.length > 0) setAvailableUnits(facUnits);
    } catch (err) {
      console.error('Failed to fetch personnel:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPersonnel();
      if (initialEditPersonnel) {
        handleOpenEdit(initialEditPersonnel);
      } else {
        setIsFormOpen(false);
        setEditingId(null);
      }
    }
  }, [isOpen, initialEditPersonnel]);

  // Keep available units and supervisors in sync if passed from parent
  useEffect(() => {
    if (unitsList || units) setAvailableUnits(unitsList || units);
  }, [unitsList, units]);

  useEffect(() => {
    if (supervisorsList || supervisors) setAvailableSupervisors(supervisorsList || supervisors);
  }, [supervisorsList, supervisors]);

  const handleOpenAdd = (defaultRoleType = 'contractor') => {
    setEditingId(null);
    setUserCustomizedUsername(false);
    setFieldErrors({});
    setGeneralError(null);

    const defaultUnitId = availableUnits.length > 0 ? availableUnits[0].id : '';
    const defaultSupId = availableSupervisors.length > 0 ? availableSupervisors[0].id : '';
    const genUser = `staff_${Math.floor(10000 + Math.random() * 90000)}`;

    setForm({
      username: genUser,
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role: defaultRoleType,
      production_unit: defaultUnitId,
      supervisor: defaultSupId,
      batch_category: 'sanding',
      password: 'Password@123',
      is_active: true
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingId(p.id);
    setUserCustomizedUsername(true);
    setFieldErrors({});
    setGeneralError(null);

    setForm({
      username: p.username || '',
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      email: p.email || '',
      phone: p.phone || '',
      role: p.role || 'contractor',
      production_unit: p.production_unit || '',
      supervisor: p.supervisor || '',
      batch_category: p.batch_category || 'sanding',
      password: '',
      is_active: p.is_active !== undefined ? p.is_active : true
    });
    setIsFormOpen(true);
  };

  const handleInputChange = (field, val) => {
    setForm(prev => {
      const updated = { ...prev, [field]: val };

      if (field === 'username') {
        setUserCustomizedUsername(true);
      }

      // Auto update username from name if not manually edited
      if (!editingId && !userCustomizedUsername && (field === 'first_name' || field === 'last_name')) {
        const fn = field === 'first_name' ? val : prev.first_name;
        const ln = field === 'last_name' ? val : prev.last_name;
        const combined = `${fn}_${ln}`.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (combined && combined !== '_') {
          updated.username = combined;
        }
      }

      return updated;
    });

    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
    if (generalError) setGeneralError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name.trim()) {
      setFieldErrors(prev => ({ ...prev, first_name: 'First name is required.' }));
      setGeneralError('Please enter first name.');
      return;
    }
    if (!form.username.trim()) {
      setFieldErrors(prev => ({ ...prev, username: 'Username is required.' }));
      setGeneralError('Please enter a username.');
      return;
    }
    if (!editingId && !form.password) {
      setFieldErrors(prev => ({ ...prev, password: 'Password is required for new staff accounts.' }));
      setGeneralError('Please provide a password for new account.');
      return;
    }

    setSaving(true);
    setFieldErrors({});
    setGeneralError(null);

    try {
      const payload = {
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        role: form.role,
        production_unit: form.production_unit || null,
        is_active: form.is_active
      };

      if (form.role === 'contractor') {
        payload.supervisor = form.supervisor || null;
        payload.batch_category = null;
      } else if (form.role === 'supervisor') {
        payload.supervisor = null;
        payload.batch_category = form.batch_category || 'sanding';
      }

      if (form.password) {
        payload.password = form.password;
      }

      let savedData = null;
      if (editingId) {
        const res = await api.patch(`/users/${editingId}/`, payload);
        savedData = res.data;
      } else {
        const res = await api.post('/users/', payload);
        savedData = res.data;
      }

      setIsFormOpen(false);
      fetchPersonnel();
      if (onUpdated) onUpdated(savedData);
    } catch (err) {
      console.error('Failed to save staff:', err);
      const resData = err.response?.data;
      if (resData && typeof resData === 'object') {
        const newErrs = {};
        Object.entries(resData).forEach(([k, v]) => {
          newErrs[k] = Array.isArray(v) ? v.join(' ') : String(v);
        });
        setFieldErrors(newErrs);
        if (resData.detail) {
          setGeneralError(resData.detail);
        } else if (resData.non_field_errors) {
          setGeneralError(Array.isArray(resData.non_field_errors) ? resData.non_field_errors.join(' ') : resData.non_field_errors);
        } else {
          const firstVal = Object.values(resData)[0];
          setGeneralError(Array.isArray(firstVal) ? firstVal.join(' ') : String(firstVal));
        }
      } else {
        setGeneralError(err.message || 'Server error while saving personnel details.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const filteredPersonnel = personnelList.filter(p => {
    if (roleFilter !== 'all' && p.role !== roleFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    const username = (p.username || '').toLowerCase();
    const phone = (p.phone || '').toLowerCase();
    const unitName = (p.production_unit_name || '').toLowerCase();
    const supName = (p.supervisor_name || '').toLowerCase();
    const stage = (p.batch_category || '').toLowerCase();
    return (
      fullName.includes(q) ||
      username.includes(q) ||
      phone.includes(q) ||
      unitName.includes(q) ||
      supName.includes(q) ||
      stage.includes(q)
    );
  });

  const contractorsCount = personnelList.filter(p => p.role === 'contractor').length;
  const supervisorsCount = personnelList.filter(p => p.role === 'supervisor').length;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
    >
      <div
        className="modal-content modal-content-xl"
        onClick={e => e.stopPropagation()}
        style={{
          width: '95vw',
          maxWidth: '1160px',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0
        }}
      >
        {/* ── Modal Header ── */}
        <div style={{
          padding: '1.25rem 1.75rem',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.12)'
            }}>
              <Hammer size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                  Contractors & Supervisors Directory
                </h2>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '3px 8px',
                  borderRadius: '20px',
                  border: '1px solid #e2e8f0'
                }}>
                  {personnelList.length} Registered
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0 0' }}>
                Manage production contractors, workshop supervisors, manufacturing unit assignments, and access credentials.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Body Content ── */}
        <div style={{ padding: '1.5rem 1.75rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {isFormOpen ? (
            /* ── Add / Edit Contractor & Supervisor Form (Enhanced Spacious Card) ── */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '880px', margin: '0 auto', width: '100%' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: form.role === 'contractor' ? '#15803d' : '#7e22ce' }}>
                    {editingId
                      ? `✏️ Edit ${form.role === 'contractor' ? 'Contractor' : 'Supervisor'} Profile`
                      : `✨ Create New ${form.role === 'contractor' ? 'Contractor' : 'Supervisor'} Profile`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  style={{
                    background: 'none',
                    border: '1px solid #cbd5e1',
                    padding: '5px 14px',
                    borderRadius: '8px',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  ← Back to Personnel List
                </button>
              </div>

              {/* General Error Alert */}
              {generalError && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 600 }}>{generalError}</span>
                </div>
              )}

              {/* ── Section 1: Designation / Role Selection ── */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <Shield size={16} color="#475569" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    1. Designation & Role
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => handleInputChange('role', 'contractor')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '0.9rem 1.15rem',
                      borderRadius: '12px',
                      border: form.role === 'contractor' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      backgroundColor: form.role === 'contractor' ? '#f0fdf4' : '#ffffff',
                      color: form.role === 'contractor' ? '#15803d' : '#64748b',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: form.role === 'contractor' ? '0 2px 8px rgba(22, 163, 74, 0.15)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: form.role === 'contractor' ? '#dcfce7' : '#f1f5f9',
                      color: form.role === 'contractor' ? '#15803d' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Hammer size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Contractor</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Assigned to production jobs & material receipts</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInputChange('role', 'supervisor')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '0.9rem 1.15rem',
                      borderRadius: '12px',
                      border: form.role === 'supervisor' ? '2px solid #9333ea' : '1px solid #e2e8f0',
                      backgroundColor: form.role === 'supervisor' ? '#faf5ff' : '#ffffff',
                      color: form.role === 'supervisor' ? '#7e22ce' : '#64748b',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: form.role === 'supervisor' ? '0 2px 8px rgba(147, 51, 234, 0.15)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: form.role === 'supervisor' ? '#f3e8ff' : '#f1f5f9',
                      color: form.role === 'supervisor' ? '#7e22ce' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Briefcase size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Supervisor</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Manages factory stages & overlooks contractors</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* ── Section 2: Personal & Contact Information ── */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <UserCheck size={16} color="#0369a1" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    2. Personal & Contact Details
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                  {/* First Name */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: fieldErrors.first_name ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh"
                      className="form-input"
                      value={form.first_name}
                      onChange={e => handleInputChange('first_name', e.target.value)}
                      style={{
                        height: '42px',
                        borderRadius: '8px',
                        borderColor: fieldErrors.first_name ? '#dc2626' : '#cbd5e1',
                        backgroundColor: fieldErrors.first_name ? '#fff5f5' : '#ffffff',
                        fontSize: '0.9rem'
                      }}
                    />
                    {fieldErrors.first_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.first_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '6px' }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sharma"
                      className="form-input"
                      value={form.last_name}
                      onChange={e => handleInputChange('last_name', e.target.value)}
                      style={{
                        height: '42px',
                        borderRadius: '8px',
                        borderColor: '#cbd5e1',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: fieldErrors.phone ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      Phone Number
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        placeholder="e.g. 9876543210"
                        className="form-input"
                        value={form.phone}
                        onChange={e => handleInputChange('phone', e.target.value)}
                        style={{
                          height: '42px',
                          paddingLeft: '34px',
                          borderRadius: '8px',
                          borderColor: fieldErrors.phone ? '#dc2626' : '#cbd5e1',
                          backgroundColor: fieldErrors.phone ? '#fff5f5' : '#ffffff',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                    {fieldErrors.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: fieldErrors.email ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      Email (Optional)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="email"
                        placeholder="e.g. ramesh@example.com"
                        className="form-input"
                        value={form.email}
                        onChange={e => handleInputChange('email', e.target.value)}
                        style={{
                          height: '42px',
                          paddingLeft: '34px',
                          borderRadius: '8px',
                          borderColor: fieldErrors.email ? '#dc2626' : '#cbd5e1',
                          backgroundColor: fieldErrors.email ? '#fff5f5' : '#ffffff',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                    {fieldErrors.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Section 3: Factory Unit & Work Assignment ── */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Factory size={16} color="#ea580c" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    3. Factory Unit & Work Assignment
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                  {/* Assigned Factory Unit */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '6px' }}>
                      Assigned Factory / Unit
                    </label>
                    <select
                      className="form-select"
                      value={form.production_unit}
                      onChange={e => handleInputChange('production_unit', e.target.value)}
                      style={{ height: '42px', borderRadius: '8px', borderColor: '#cbd5e1', fontSize: '0.9rem', width: '100%' }}
                    >
                      <option value="">Unassigned</option>
                      {availableUnits.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} {u.code ? `(${u.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Role Dependent: Reporting Supervisor OR Production Stage */}
                  {form.role === 'contractor' ? (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '6px' }}>
                        Reporting Supervisor
                      </label>
                      <select
                        className="form-select"
                        value={form.supervisor}
                        onChange={e => handleInputChange('supervisor', e.target.value)}
                        style={{ height: '42px', borderRadius: '8px', borderColor: '#cbd5e1', fontSize: '0.9rem', width: '100%' }}
                      >
                        <option value="">Unassigned</option>
                        {availableSupervisors.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.username}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '6px' }}>
                        Production Stage / Category
                      </label>
                      <select
                        className="form-select"
                        value={form.batch_category}
                        onChange={e => handleInputChange('batch_category', e.target.value)}
                        style={{ height: '42px', borderRadius: '8px', borderColor: '#cbd5e1', fontSize: '0.9rem', width: '100%' }}
                      >
                        {BATCH_CATEGORIES.map(b => (
                          <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Section 4: System Credentials & Access ── */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Shield size={16} color="#7c3aed" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    4. System Credentials & Status
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                  {/* Username */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: fieldErrors.username ? '#dc2626' : '#334155', margin: 0 }}>
                        Username *
                      </label>
                      {!editingId && !userCustomizedUsername && (
                        <span style={{ fontSize: '0.72rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                          <Sparkles size={11} /> Auto-generated
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ramesh_sharma"
                      className="form-input"
                      value={form.username}
                      onChange={e => handleInputChange('username', e.target.value)}
                      style={{
                        height: '42px',
                        borderRadius: '8px',
                        borderColor: fieldErrors.username ? '#dc2626' : '#cbd5e1',
                        backgroundColor: fieldErrors.username ? '#fff5f5' : '#ffffff',
                        fontSize: '0.9rem',
                        fontWeight: 600
                      }}
                    />
                    {fieldErrors.username && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.username}</span>
                      </div>
                    )}
                  </div>

                  {/* Password */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: fieldErrors.password ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      {editingId ? 'New Password (leave empty to keep current)' : 'Initial Password *'}
                    </label>
                    <input
                      type="text"
                      placeholder={editingId ? 'Enter new password if changing' : 'Password@123'}
                      className="form-input"
                      value={form.password}
                      onChange={e => handleInputChange('password', e.target.value)}
                      style={{
                        height: '42px',
                        borderRadius: '8px',
                        borderColor: fieldErrors.password ? '#dc2626' : '#cbd5e1',
                        backgroundColor: fieldErrors.password ? '#fff5f5' : '#ffffff',
                        fontSize: '0.9rem'
                      }}
                    />
                    {fieldErrors.password && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.password}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Account Toggle */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => handleInputChange('is_active', e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#16a34a', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                      Active Account (Authorized to receive raw materials and login to system)
                    </span>
                  </label>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsFormOpen(false)}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  style={{
                    backgroundColor: form.role === 'contractor' ? '#16a34a' : '#9333ea',
                    borderColor: form.role === 'contractor' ? '#16a34a' : '#9333ea',
                    padding: '0.65rem 1.5rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    boxShadow: form.role === 'contractor' ? '0 2px 6px rgba(22, 163, 74, 0.25)' : '0 2px 6px rgba(147, 51, 234, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {saving ? (
                    'Saving...'
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>{editingId ? 'Update Staff Profile' : (form.role === 'contractor' ? 'Create Contractor' : 'Create Supervisor')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ── Personnel Directory List & Table (Enhanced Structured View) ── */
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1rem' }}>
              {/* Search, Filters, & Action Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: '1 1 450px' }}>
                  {/* Search Input */}
                  <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '420px' }}>
                    <Search size={17} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search by name, username, phone, or unit..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{
                        height: '42px',
                        paddingLeft: '38px',
                        paddingRight: search ? '36px' : '14px',
                        fontSize: '0.88rem',
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        width: '100%'
                      }}
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '2px'
                        }}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {/* Role Filter Chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setRoleFilter('all')}
                      style={{
                        border: 'none',
                        backgroundColor: roleFilter === 'all' ? '#ffffff' : 'transparent',
                        color: roleFilter === 'all' ? '#0f172a' : '#64748b',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        padding: '6px 12px',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        boxShadow: roleFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                      }}
                    >
                      All ({personnelList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter('contractor')}
                      style={{
                        border: 'none',
                        backgroundColor: roleFilter === 'contractor' ? '#ffffff' : 'transparent',
                        color: roleFilter === 'contractor' ? '#15803d' : '#64748b',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        padding: '6px 12px',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        boxShadow: roleFilter === 'contractor' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                      }}
                    >
                      Contractors ({contractorsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter('supervisor')}
                      style={{
                        border: 'none',
                        backgroundColor: roleFilter === 'supervisor' ? '#ffffff' : 'transparent',
                        color: roleFilter === 'supervisor' ? '#7e22ce' : '#64748b',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        padding: '6px 12px',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        boxShadow: roleFilter === 'supervisor' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                      }}
                    >
                      Supervisors ({supervisorsCount})
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenAdd('contractor')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      height: '42px',
                      padding: '0 1.15rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      backgroundColor: '#16a34a',
                      borderColor: '#16a34a',
                      color: '#ffffff',
                      borderRadius: '10px',
                      border: 'none',
                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={16} /> Add Contractor
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAdd('supervisor')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      height: '42px',
                      padding: '0 1.15rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      backgroundColor: '#9333ea',
                      borderColor: '#9333ea',
                      color: '#ffffff',
                      borderRadius: '10px',
                      border: 'none',
                      boxShadow: '0 2px 6px rgba(147, 51, 234, 0.25)',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={16} /> Add Supervisor
                  </button>
                </div>
              </div>

              {/* Table Container */}
              <div style={{
                flex: 1,
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                overflow: 'auto',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                minHeight: '280px',
                maxHeight: 'calc(90vh - 220px)'
              }}>
                <table style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10
                    }}>
                      <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '240px' }}>
                        Staff / Name
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '120px' }}>
                        Role
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '150px' }}>
                        Factory Unit
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '140px' }}>
                        Phone
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '180px' }}>
                        Stage / Supervisor
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', minWidth: '100px' }}>
                        Status
                      </th>
                      <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', minWidth: '110px' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748b' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="spinner" style={{ width: '28px', height: '28px' }} />
                            <span style={{ fontSize: '0.88rem' }}>Loading personnel directory...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredPersonnel.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748b' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Users size={24} color="#94a3b8" />
                            </div>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>
                              No staff records found{search ? ` matching "${search}"` : ''}
                            </span>
                            {search && (
                              <button
                                type="button"
                                onClick={() => setSearch('')}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#16a34a',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  fontSize: '0.82rem',
                                  textDecoration: 'underline'
                                }}
                              >
                                Clear search filter
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPersonnel.map((p, idx) => {
                        const isContr = p.role === 'contractor';
                        return (
                          <tr
                            key={p.id || idx}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <td style={{ padding: '12px 18px', fontWeight: 700, color: '#0f172a' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '9px',
                                  backgroundColor: isContr ? '#f0fdf4' : '#faf5ff',
                                  color: isContr ? '#16a34a' : '#9333ea',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  {isContr ? <Hammer size={17} /> : <Briefcase size={17} />}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                    {p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.username}
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>@{p.username}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                backgroundColor: isContr ? '#dcfce7' : '#f3e8ff',
                                color: isContr ? '#15803d' : '#7e22ce'
                              }}>
                                {isContr ? 'Contractor' : 'Supervisor'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {p.production_unit_name ? (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#e0f2fe',
                                  color: '#0369a1',
                                  fontSize: '0.75rem',
                                  fontWeight: 700
                                }}>
                                  {p.production_unit_name}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Unassigned</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#334155', fontSize: '0.85rem' }}>
                              {p.phone || '—'}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>
                              {isContr ? (
                                <span>Supervisor: <strong style={{ color: '#0369a1' }}>{p.supervisor_name || 'Unassigned'}</strong></span>
                              ) : (
                                <span>Stage: <strong style={{ color: '#9333ea', textTransform: 'capitalize' }}>{p.batch_category || 'General'}</strong></span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: p.is_active ? '#f0fdf4' : '#fef2f2',
                                color: p.is_active ? '#16a34a' : '#dc2626'
                              }}>
                                {p.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(p)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff',
                                  color: '#334155',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                              >
                                <Edit size={13} /> Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
