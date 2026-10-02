import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import {
  X, User, Users, Briefcase, Hammer, Phone, Mail, Factory,
  CheckCircle, AlertCircle, Shield, Sparkles
} from 'lucide-react';

const BATCH_CATEGORIES = [
  { value: 'sanding', label: 'Sanding' },
  { value: 'polish', label: 'Polish' },
  { value: 'fitting', label: 'Fitting' },
  { value: 'packaging', label: 'Packaging' },
];

export default function StorePersonnelModal({
  isOpen,
  onClose,
  onSuccess,
  onSaved,
  initialData = null,
  defaultRole = 'contractor',
  supervisorsList,
  supervisors,
  unitsList,
  units
}) {
  const finalUnits = unitsList || units || [];
  const finalSupervisors = supervisorsList || supervisors || [];
  const handleSuccess = onSuccess || onSaved;

  const isEdit = Boolean(initialData?.id);
  const prevIsOpenRef = useRef(false);
  const prevInitialIdRef = useRef(null);

  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: defaultRole,
    production_unit: '',
    supervisor: '',
    batch_category: '',
    password: '',
    is_active: true
  });

  const [userCustomizedUsername, setUserCustomizedUsername] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Initialize form data strictly when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      const isNewOpen = !prevIsOpenRef.current;
      const isDifferentInitial = (initialData?.id || null) !== prevInitialIdRef.current;

      if (isNewOpen || isDifferentInitial) {
        prevInitialIdRef.current = initialData?.id || null;
        setUserCustomizedUsername(false);
        setFieldErrors({});
        setError(null);

        if (initialData) {
          setFormData({
            username: initialData.username || '',
            first_name: initialData.first_name || '',
            last_name: initialData.last_name || '',
            email: initialData.email || '',
            phone: initialData.phone || '',
            role: initialData.role || defaultRole,
            production_unit: initialData.production_unit || '',
            supervisor: initialData.supervisor || '',
            batch_category: initialData.batch_category || '',
            password: '',
            is_active: initialData.is_active !== undefined ? initialData.is_active : true
          });
        } else {
          const genUser = `staff_${Math.floor(10000 + Math.random() * 90000)}`;
          setFormData({
            username: genUser,
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            role: defaultRole,
            production_unit: finalUnits.length > 0 ? finalUnits[0].id : '',
            supervisor: finalSupervisors.length > 0 ? finalSupervisors[0].id : '',
            batch_category: 'sanding',
            password: 'Password@123',
            is_active: true
          });
        }
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialData?.id, defaultRole]);

  // If units or supervisors load after modal opened, fill default if empty
  useEffect(() => {
    if (isOpen && !initialData && finalUnits.length > 0) {
      setFormData(prev => prev.production_unit ? prev : { ...prev, production_unit: finalUnits[0].id });
    }
  }, [isOpen, initialData, finalUnits.length]);

  useEffect(() => {
    if (isOpen && !initialData && finalSupervisors.length > 0 && formData.role === 'contractor') {
      setFormData(prev => prev.supervisor ? prev : { ...prev, supervisor: finalSupervisors[0].id });
    }
  }, [isOpen, initialData, finalSupervisors.length, formData.role]);

  if (!isOpen) return null;

  const handleChange = (field, val) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: val };

      if (field === 'username') {
        setUserCustomizedUsername(true);
      }

      // Auto generate username from first/last name if user hasn't explicitly entered a custom username
      if (!isEdit && !userCustomizedUsername && (field === 'first_name' || field === 'last_name')) {
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
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.first_name.trim()) {
      setFieldErrors(prev => ({ ...prev, first_name: 'First name is required.' }));
      setError('First name is required.');
      return;
    }
    if (!formData.username.trim()) {
      setFieldErrors(prev => ({ ...prev, username: 'Username is required.' }));
      setError('Username is required.');
      return;
    }
    if (!isEdit && !formData.password) {
      setFieldErrors(prev => ({ ...prev, password: 'Password is required for new staff accounts.' }));
      setError('Password is required for new staff accounts.');
      return;
    }

    setSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      const payload = {
        username: formData.username.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        role: formData.role,
        production_unit: formData.production_unit || null,
        is_active: formData.is_active
      };

      if (formData.role === 'contractor') {
        payload.supervisor = formData.supervisor || null;
        payload.batch_category = null;
      } else if (formData.role === 'supervisor') {
        payload.supervisor = null;
        payload.batch_category = formData.batch_category || 'sanding';
      }

      if (formData.password) {
        payload.password = formData.password;
      }

      let savedUser = null;
      if (isEdit) {
        const res = await api.patch(`/users/${initialData.id}/`, payload);
        savedUser = res.data;
      } else {
        const res = await api.post('/users/', payload);
        savedUser = res.data;
      }

      if (handleSuccess) handleSuccess(savedUser);
      onClose();
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
          setError(resData.detail);
        } else if (resData.non_field_errors) {
          setError(Array.isArray(resData.non_field_errors) ? resData.non_field_errors.join(' ') : resData.non_field_errors);
        } else {
          const firstVal = Object.values(resData)[0];
          setError(Array.isArray(firstVal) ? firstVal.join(' ') : String(firstVal));
        }
      } else {
        setError(err.message || 'Server error while saving personnel details.');
      }
    } finally {
      setSaving(false);
    }
  };

  const isContractor = formData.role === 'contractor';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: '95vw',
          maxWidth: '740px',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.28)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.35rem 1.75rem',
          backgroundColor: isContractor ? '#f0fdf4' : '#faf5ff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: isContractor ? '#22c55e' : '#a855f7',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {isContractor ? <Hammer size={22} /> : <Briefcase size={22} />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {isEdit
                  ? `Edit ${isContractor ? 'Contractor' : 'Supervisor'}`
                  : `Add New ${isContractor ? 'Contractor' : 'Supervisor'}`}
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Store personnel directory & manufacturing unit assignment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Top Error Alert */}
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Role Switcher */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Designation / Role *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => handleChange('role', 'contractor')}
                style={{
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: isContractor ? '2px solid #22c55e' : '1px solid #cbd5e1',
                  backgroundColor: isContractor ? '#f0fdf4' : '#ffffff',
                  color: isContractor ? '#15803d' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Hammer size={16} /> Contractor
              </button>
              <button
                type="button"
                onClick={() => handleChange('role', 'supervisor')}
                style={{
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: !isContractor ? '2px solid #a855f7' : '1px solid #cbd5e1',
                  backgroundColor: !isContractor ? '#faf5ff' : '#ffffff',
                  color: !isContractor ? '#7e22ce' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Briefcase size={16} /> Supervisor
              </button>
            </div>
          </div>

          {/* Names Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: fieldErrors.first_name ? '#dc2626' : '#334155', marginBottom: '4px' }}>
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={e => handleChange('first_name', e.target.value)}
                placeholder="e.g. Ramesh"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: fieldErrors.first_name ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: fieldErrors.first_name ? '#fff5f5' : '#ffffff',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
              {fieldErrors.first_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.76rem', marginTop: '4px' }}>
                  <AlertCircle size={12} />
                  <span>{fieldErrors.first_name}</span>
                </div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: fieldErrors.last_name ? '#dc2626' : '#334155', marginBottom: '4px' }}>
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={e => handleChange('last_name', e.target.value)}
                placeholder="e.g. Sharma"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: fieldErrors.last_name ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: fieldErrors.last_name ? '#fff5f5' : '#ffffff',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
              {fieldErrors.last_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.76rem', marginTop: '4px' }}>
                  <AlertCircle size={12} />
                  <span>{fieldErrors.last_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: fieldErrors.phone ? '#dc2626' : '#334155', marginBottom: '4px' }}>
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="e.g. 9876543210"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: fieldErrors.phone ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: fieldErrors.phone ? '#fff5f5' : '#ffffff',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
              {fieldErrors.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.76rem', marginTop: '4px' }}>
                  <AlertCircle size={12} />
                  <span>{fieldErrors.phone}</span>
                </div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: fieldErrors.email ? '#dc2626' : '#334155', marginBottom: '4px' }}>
                Email (Optional)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="e.g. ramesh@example.com"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: fieldErrors.email ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: fieldErrors.email ? '#fff5f5' : '#ffffff',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
              {fieldErrors.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.76rem', marginTop: '4px' }}>
                  <AlertCircle size={12} />
                  <span>{fieldErrors.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Unit & Role Specific Assignment */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Assigned Factory / Unit
              </label>
              <select
                value={formData.production_unit}
                onChange={e => handleChange('production_unit', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="">Select Factory Unit...</option>
                {finalUnits.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.unit_code})</option>
                ))}
              </select>
            </div>

            {isContractor ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Reporting Supervisor
                </label>
                <select
                  value={formData.supervisor}
                  onChange={e => handleChange('supervisor', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="">Unassigned</option>
                  {finalSupervisors.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.username} ({s.batch_category || 'Supervisor'})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Stage / Batch Category *
                </label>
                <select
                  value={formData.batch_category}
                  onChange={e => handleChange('batch_category', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {BATCH_CATEGORIES.map(b => (
                    <option key={b.value} value={b.value}>{b.label} Stage</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Account Credentials */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: fieldErrors.username ? '#dc2626' : '#334155', marginBottom: '4px' }}>
                Username *
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={e => handleChange('username', e.target.value)}
                placeholder="e.g. ramesh_sharma"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: fieldErrors.username ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: fieldErrors.username ? '#fff5f5' : '#ffffff',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
              {fieldErrors.username && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.76rem', marginTop: '4px' }}>
                  <AlertCircle size={12} />
                  <span>{fieldErrors.username}</span>
                </div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: fieldErrors.password ? '#dc2626' : '#334155', marginBottom: '4px' }}>
                {isEdit ? 'Change Password (Leave blank to keep)' : 'Initial Password *'}
              </label>
              <input
                type="text"
                value={formData.password}
                onChange={e => handleChange('password', e.target.value)}
                placeholder={isEdit ? '••••••••' : 'Password@123'}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: fieldErrors.password ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                  backgroundColor: fieldErrors.password ? '#fff5f5' : '#ffffff',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box'
                }}
              />
              {fieldErrors.password && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.76rem', marginTop: '4px' }}>
                  <AlertCircle size={12} />
                  <span>{fieldErrors.password}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.25rem' }}>
            <input
              type="checkbox"
              id="person-is-active"
              checked={formData.is_active}
              onChange={e => handleChange('is_active', e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="person-is-active" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
              Active Account (Able to login and receive materials)
            </label>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.65rem 1.4rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isContractor ? '#16a34a' : '#9333ea',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isContractor ? '0 2px 6px rgba(22, 163, 74, 0.3)' : '0 2px 6px rgba(147, 51, 234, 0.3)'
              }}
            >
              <CheckCircle size={16} />
              <span>{saving ? 'Saving...' : isEdit ? 'Save Changes' : `Create ${isContractor ? 'Contractor' : 'Supervisor'}`}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
