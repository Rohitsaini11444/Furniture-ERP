import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  X, Building2, Plus, Edit, Trash2, Search, Check, AlertCircle,
  Phone, MapPin, Receipt, FileText, CheckCircle2, RotateCcw, Percent
} from 'lucide-react';

export default function SupplierManagerModal({ isOpen, onClose, onUpdated }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    phone: '',
    gstin: '',
    state_name: '',
    cartage_gst_rate: '18.00',
    cartage_ledger_name: 'PUR. CARTAGE GST @ 18% -  3 %',
    address: '',
  });

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers/', { params: { nopage: true } });
      setSuppliers(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
    }
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field] || fieldErrors.general) {
      setFieldErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        const remainingFieldErrors = Object.keys(copy).filter(k => k !== 'general');
        if (remainingFieldErrors.length === 0) {
          delete copy.general;
        }
        return copy;
      });
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      name: '',
      phone: '',
      gstin: '',
      state_name: '',
      cartage_gst_rate: '18.00',
      cartage_ledger_name: 'PUR. CARTAGE GST @ 18% -  3 %',
      address: '',
    });
    setFieldErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (sup) => {
    setEditingId(sup.id);
    setForm({
      name: sup.name || '',
      phone: sup.phone || '',
      gstin: sup.gstin || '',
      state_name: sup.state_name || '',
      cartage_gst_rate: sup.cartage_gst_rate !== undefined ? String(sup.cartage_gst_rate) : '18.00',
      cartage_ledger_name: sup.cartage_ledger_name || 'PUR. CARTAGE GST @ 18% -  3 %',
      address: sup.address || '',
    });
    setFieldErrors({});
    setIsFormOpen(true);
  };

  const handleDelete = async (sup) => {
    if (window.confirm(`Are you sure you want to delete supplier "${sup.name}"?`)) {
      try {
        await api.delete(`/suppliers/${sup.id}/`);
        fetchSuppliers();
        if (onUpdated) onUpdated();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.detail || 'Failed to delete supplier.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFieldErrors({ name: 'Supplier Name is required.', general: 'Please correct the highlighted errors below.' });
      return;
    }

    setSaving(true);
    setFieldErrors({});

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        phone: form.phone.trim(),
        gstin: form.gstin.trim().toUpperCase(),
        state_name: form.state_name.trim(),
        cartage_ledger_name: form.cartage_ledger_name.trim(),
        address: form.address.trim(),
      };

      let savedSup = null;
      if (editingId) {
        const res = await api.put(`/suppliers/${editingId}/`, payload);
        savedSup = res.data;
      } else {
        const res = await api.post('/suppliers/', payload);
        savedSup = res.data;
      }
      setIsFormOpen(false);
      fetchSuppliers();
      if (onUpdated) onUpdated(savedSup);
    } catch (err) {
      console.error('Failed to save supplier:', err);
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const newErrors = {};
        Object.entries(data).forEach(([k, v]) => {
          newErrors[k] = Array.isArray(v) ? v.join(' ') : String(v);
        });
        if (data.detail) {
          newErrors.general = data.detail;
        } else if (data.non_field_errors) {
          newErrors.general = Array.isArray(data.non_field_errors) ? data.non_field_errors.join(' ') : data.non_field_errors;
        } else if (Object.keys(newErrors).length > 0) {
          newErrors.general = 'Please correct the highlighted errors below.';
        } else {
          newErrors.general = 'Failed to save supplier details. Please check your inputs.';
        }
        setFieldErrors(newErrors);
      } else {
        setFieldErrors({ general: 'Failed to save supplier details. Please check your inputs.' });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const filteredSuppliers = suppliers.filter(s =>
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.gstin || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.state_name || '').toLowerCase().includes(search.toLowerCase())
  );

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
        className="modal-content modal-content-xl supplier-modal-content"
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
              backgroundColor: '#fef3c7',
              border: '1px solid #fde68a',
              color: '#b45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(180, 83, 9, 0.12)'
            }}>
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                  Supplier Master Directory
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
                  {suppliers.length} Registered
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '3px 0 0 0' }}>
                Create, update, and manage supplier profiles, GSTIN identifiers, and default freight cartage rates.
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
            /* ── Add / Edit Supplier Form (Structured Multi-Section Card) ── */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#8b5a2b' }}>
                    {editingId ? '✏️ Edit Supplier Profile' : '✨ Create New Supplier Profile'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  style={{
                    background: 'none',
                    border: '1px solid #cbd5e1',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600
                  }}
                >
                  Cancel & Back to List
                </button>
              </div>

              {/* General Top Alert */}
              {fieldErrors.general && (
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
                  <AlertCircle size={17} style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 600 }}>{fieldErrors.general}</span>
                </div>
              )}

              {/* ── Section 1: Business Identity & Contact ── */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Building2 size={16} color="#8b5a2b" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    1. Company & Contact Details
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  {/* Supplier Name */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: fieldErrors.name ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      Supplier Company Name *
                    </label>
                    <input
                      required
                      type="text"
                      className="form-input"
                      placeholder="e.g. Pinkcity Handicrafts & Raw Materials"
                      style={{
                        height: '42px',
                        borderRadius: '8px',
                        borderColor: fieldErrors.name ? '#dc2626' : '#cbd5e1',
                        backgroundColor: fieldErrors.name ? '#fff5f5' : '#ffffff',
                        fontSize: '0.9rem',
                        fontWeight: 600
                      }}
                      value={form.name}
                      onChange={e => handleInputChange('name', e.target.value)}
                    />
                    {fieldErrors.name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: fieldErrors.phone ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      Phone / Mobile Number
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. +91 9829012345"
                      style={{
                        height: '42px',
                        borderRadius: '8px',
                        borderColor: fieldErrors.phone ? '#dc2626' : '#cbd5e1',
                        backgroundColor: fieldErrors.phone ? '#fff5f5' : '#ffffff',
                        fontSize: '0.9rem'
                      }}
                      value={form.phone}
                      onChange={e => handleInputChange('phone', e.target.value)}
                    />
                    {fieldErrors.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Full Address */}
                  <div className="form-group" style={{ gridColumn: '1 / -1', margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: fieldErrors.address ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      Full Factory / Warehouse Address
                    </label>
                    <textarea
                      rows={2}
                      className="form-input"
                      placeholder="Enter supplier factory, unit or dispatch office address..."
                      style={{
                        borderRadius: '8px',
                        borderColor: fieldErrors.address ? '#dc2626' : '#cbd5e1',
                        backgroundColor: fieldErrors.address ? '#fff5f5' : '#ffffff',
                        fontSize: '0.88rem',
                        padding: '0.65rem 0.85rem'
                      }}
                      value={form.address}
                      onChange={e => handleInputChange('address', e.target.value)}
                    />
                    {fieldErrors.address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Section 2: Taxation & Freight Cartage Ledger ── */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Receipt size={16} color="#8b5a2b" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    2. Taxation & Cartage Freight Defaults
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                  {/* GSTIN / UIN */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: fieldErrors.gstin ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      GSTIN / Tax ID
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 08ABCDE1234F1Z5"
                      style={{
                        height: '42px',
                        borderRadius: '8px',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        borderColor: fieldErrors.gstin ? '#dc2626' : '#cbd5e1',
                        backgroundColor: fieldErrors.gstin ? '#fff5f5' : '#ffffff',
                        fontSize: '0.88rem'
                      }}
                      value={form.gstin}
                      onChange={e => handleInputChange('gstin', e.target.value.toUpperCase())}
                    />
                    {fieldErrors.gstin && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.gstin}</span>
                      </div>
                    )}
                  </div>

                  {/* State Name */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: fieldErrors.state_name ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      State Name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Rajasthan"
                      style={{
                        height: '42px',
                        borderRadius: '8px',
                        borderColor: fieldErrors.state_name ? '#dc2626' : '#cbd5e1',
                        backgroundColor: fieldErrors.state_name ? '#fff5f5' : '#ffffff',
                        fontSize: '0.9rem'
                      }}
                      value={form.state_name}
                      onChange={e => handleInputChange('state_name', e.target.value)}
                    />
                    {fieldErrors.state_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.state_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Cartage GST Rate */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: fieldErrors.cartage_gst_rate ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      Cartage GST Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="form-input"
                      placeholder="18.00"
                      style={{
                        height: '42px',
                        borderRadius: '8px',
                        borderColor: fieldErrors.cartage_gst_rate ? '#dc2626' : '#cbd5e1',
                        backgroundColor: fieldErrors.cartage_gst_rate ? '#fff5f5' : '#ffffff',
                        fontSize: '0.9rem'
                      }}
                      value={form.cartage_gst_rate}
                      onChange={e => handleInputChange('cartage_gst_rate', e.target.value)}
                    />
                    {fieldErrors.cartage_gst_rate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.cartage_gst_rate}</span>
                      </div>
                    )}
                  </div>

                  {/* Cartage Ledger Name */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: fieldErrors.cartage_ledger_name ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                      Cartage Ledger Name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="PUR. CARTAGE GST @ 18% -  3 %"
                      style={{
                        height: '42px',
                        borderRadius: '8px',
                        borderColor: fieldErrors.cartage_ledger_name ? '#dc2626' : '#cbd5e1',
                        backgroundColor: fieldErrors.cartage_ledger_name ? '#fff5f5' : '#ffffff',
                        fontSize: '0.88rem'
                      }}
                      value={form.cartage_ledger_name}
                      onChange={e => handleInputChange('cartage_ledger_name', e.target.value)}
                    />
                    {fieldErrors.cartage_ledger_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{fieldErrors.cartage_ledger_name}</span>
                      </div>
                    )}
                  </div>
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
                    backgroundColor: '#8b5a2b',
                    borderColor: '#8b5a2b',
                    padding: '0.65rem 1.5rem',
                    borderRadius: '10px',
                    fontWeight: 700,
                    boxShadow: '0 2px 6px rgba(139, 90, 43, 0.25)'
                  }}
                >
                  {saving ? 'Saving...' : (editingId ? 'Update Supplier Profile' : 'Save New Supplier')}
                </button>
              </div>
            </form>
          ) : (
            /* ── Supplier Directory List & Table (Enhanced Structured View) ── */
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1rem' }}>
              {/* Search & Action Bar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: '520px' }}>
                  <Search size={17} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by supplier name, phone, GSTIN, state..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      height: '42px',
                      paddingLeft: '38px',
                      paddingRight: search ? '36px' : '14px',
                      fontSize: '0.88rem',
                      borderRadius: '10px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #cbd5e1'
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

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleOpenAdd}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    height: '42px',
                    padding: '0 1.25rem',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    backgroundColor: '#8b5a2b',
                    borderColor: '#8b5a2b',
                    color: '#ffffff',
                    borderRadius: '10px',
                    boxShadow: '0 2px 6px rgba(139, 90, 43, 0.25)',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={18} /> Add New Supplier
                </button>
              </div>

              {/* Table Container with Explicit Widths and Clean Structure */}
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
                <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10
                    }}>
                      <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '240px' }}>
                        Supplier Name
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '140px' }}>
                        Phone
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '170px' }}>
                        GSTIN / UIN
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '120px' }}>
                        State
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '180px' }}>
                        Cartage Rate & Ledger
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '200px' }}>
                        Address
                      </th>
                      <th style={{ padding: '12px 18px', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', minWidth: '110px' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748b' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="spinner" style={{ width: '28px', height: '28px' }} />
                            <span style={{ fontSize: '0.88rem' }}>Loading suppliers directory...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredSuppliers.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748b' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Building2 size={24} color="#94a3b8" />
                            </div>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>
                              {search ? `No suppliers match "${search}"` : 'No registered suppliers yet'}
                            </span>
                            <span style={{ fontSize: '0.82rem', color: '#94a3b8', maxWidth: '300px' }}>
                              {search ? 'Try clearing your search or checking for typos.' : 'Click below to register your first supplier profile.'}
                            </span>
                            {search ? (
                              <button
                                type="button"
                                onClick={() => setSearch('')}
                                style={{
                                  marginTop: '0.25rem',
                                  padding: '4px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff',
                                  color: '#475569',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Clear Search
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleOpenAdd}
                                className="btn-primary"
                                style={{
                                  marginTop: '0.25rem',
                                  padding: '6px 14px',
                                  fontSize: '0.82rem',
                                  backgroundColor: '#8b5a2b'
                                }}
                              >
                                + Add First Supplier
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSuppliers.map((sup, idx) => (
                        <tr
                          key={sup.id}
                          style={{
                            borderBottom: idx < filteredSuppliers.length - 1 ? '1px solid #f1f5f9' : 'none',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#faf8f5'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {/* Supplier Name */}
                          <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                backgroundColor: '#fef3c7',
                                color: '#b45309',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                flexShrink: 0
                              }}>
                                {(sup.name?.[0] || 'S').toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                                {sup.name}
                              </span>
                            </div>
                          </td>

                          {/* Phone */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: '0.85rem', color: sup.phone ? '#1e293b' : '#94a3b8' }}>
                            {sup.phone ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <Phone size={13} color="#64748b" />
                                {sup.phone}
                              </span>
                            ) : '—'}
                          </td>

                          {/* GSTIN / UIN */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                            {sup.gstin ? (
                              <span style={{
                                fontFamily: 'monospace',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                color: '#0f172a',
                                letterSpacing: '0.04em'
                              }}>
                                {sup.gstin}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            )}
                          </td>

                          {/* State */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: '0.85rem', color: sup.state_name ? '#334155' : '#94a3b8', fontWeight: 600 }}>
                            {sup.state_name || '—'}
                          </td>

                          {/* Cartage Rate & Ledger */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{
                                display: 'inline-block',
                                width: 'fit-content',
                                fontWeight: 800,
                                color: '#b45309',
                                backgroundColor: '#fef3c7',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.78rem'
                              }}>
                                {sup.cartage_gst_rate !== undefined ? `${sup.cartage_gst_rate}%` : '18.00%'}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#64748b', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sup.cartage_ledger_name}>
                                {sup.cartage_ledger_name || 'PUR. CARTAGE GST @ 18%'}
                              </span>
                            </div>
                          </td>

                          {/* Address */}
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle', fontSize: '0.82rem', color: '#64748b', maxWidth: '220px' }}>
                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sup.address}>
                              {sup.address || '—'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleOpenEdit(sup)}
                                title="Edit Supplier Profile"
                                style={{
                                  backgroundColor: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  color: '#1d4ed8',
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dbeafe'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(sup)}
                                title="Delete Supplier"
                                style={{
                                  backgroundColor: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  color: '#dc2626',
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
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

