import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  Building2, Search, Plus, Edit, Trash2, ArrowLeft, Phone, MapPin,
  FileText, ShieldCheck, Check, RefreshCw, X, AlertCircle
} from 'lucide-react';

export default function SupplierManagement() {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');

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
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field] || errors.general) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        delete next.general;
        return next;
      });
    }
  };

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers/', { params: { nopage: true } });
      setSuppliers(res.data.results || res.data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

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
    setErrors({});
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
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDelete = async (sup) => {
    if (window.confirm(`Are you sure you want to delete supplier "${sup.name}"?`)) {
      try {
        await api.delete(`/suppliers/${sup.id}/`);
        setSuccessMsg(`Supplier "${sup.name}" deleted successfully.`);
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchSuppliers();
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.detail || 'Failed to delete supplier.');
      }
    }
  };

  const validateForm = () => {
    const errs = {};
    const hasRepeating = (str) => /(.)\1{3,}/i.test(str);
    const hasLongWord = (str, len = 30) => str.split(/\s+/).some(w => w.length > len);

    // Supplier Name
    const name = form.name.trim();
    if (!name) {
      errs.name = 'Supplier Name is required.';
    } else if (name.length < 2) {
      errs.name = 'Supplier Name must be at least 2 characters.';
    } else if (name.length > 200) {
      errs.name = 'Supplier Name cannot exceed 200 characters.';
    } else if (hasRepeating(name)) {
      errs.name = 'Supplier Name contains excessive repetitive characters.';
    } else if (hasLongWord(name, 30)) {
      errs.name = 'Supplier Name contains an excessively long continuous word.';
    } else if ((name.match(/[A-Za-z]/g) || []).length < 2) {
      errs.name = 'Supplier Name must contain at least 2 alphabetic characters.';
    } else if (!/^[A-Za-z0-9\s.,&'\-()/@#]+$/.test(name)) {
      errs.name = 'Supplier Name contains invalid characters.';
    } else {
      const duplicate = suppliers.find(s =>
        s.name && s.name.trim().toLowerCase() === name.toLowerCase() &&
        String(s.id) !== String(editingId || '')
      );
      if (duplicate) {
        errs.name = `Supplier '${name}' already exists in Supplier Master.`;
      }
    }

    // Phone Number
    const phone = form.phone.trim();
    if (phone) {
      if (phone.length > 50) {
        errs.phone = 'Phone number cannot exceed 50 characters.';
      } else if (!/^\+?[0-9\s\-()]{7,20}$/.test(phone)) {
        errs.phone = "Please enter a valid phone number (digits, optional '+', hyphens).";
      } else {
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 7) {
          errs.phone = 'Phone number must contain at least 7 digits.';
        } else if (/^(\d)\1+$/.test(digits)) {
          errs.phone = 'Phone number cannot consist of identical repeating digits.';
        }
      }
    }

    // GSTIN
    const gstin = form.gstin.trim().toUpperCase();
    if (gstin) {
      if (gstin.length > 50) {
        errs.gstin = 'GSTIN cannot exceed 50 characters.';
      } else {
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstinRegex.test(gstin) && !/^[A-Z0-9]{15}$/.test(gstin)) {
          errs.gstin = 'GSTIN must be a valid 15-character format (e.g. 08ABCDE1234F1Z5).';
        }
      }
    }

    // State Name
    const stateName = form.state_name.trim();
    if (stateName) {
      if (stateName.length < 2) {
        errs.state_name = 'State Name must be at least 2 characters.';
      } else if (stateName.length > 100) {
        errs.state_name = 'State Name cannot exceed 100 characters.';
      } else if (!/^[A-Za-z\s.\-]+$/.test(stateName)) {
        errs.state_name = 'State Name can only contain letters, spaces, and hyphens.';
      } else if (hasRepeating(stateName)) {
        errs.state_name = 'State Name contains excessive repetitive characters.';
      }
    }

    // Cartage GST Rate
    if (form.cartage_gst_rate !== '' && form.cartage_gst_rate !== null && form.cartage_gst_rate !== undefined) {
      const rate = parseFloat(form.cartage_gst_rate);
      if (isNaN(rate)) {
        errs.cartage_gst_rate = 'Cartage GST Rate must be a valid number.';
      } else if (rate < 0) {
        errs.cartage_gst_rate = 'Cartage GST Rate cannot be negative.';
      } else if (rate > 100) {
        errs.cartage_gst_rate = 'Cartage GST Rate cannot exceed 100.00%.';
      } else if (String(form.cartage_gst_rate).replace('.', '').length > 5) {
        errs.cartage_gst_rate = 'Ensure that there are no more than 5 digits in total.';
      }
    }

    // Cartage Ledger Name
    const ledger = form.cartage_ledger_name.trim();
    if (!ledger) {
      errs.cartage_ledger_name = 'Cartage Ledger Name is required.';
    } else if (ledger.length < 2) {
      errs.cartage_ledger_name = 'Cartage Ledger Name must be at least 2 characters.';
    } else if (ledger.length > 200) {
      errs.cartage_ledger_name = 'Cartage Ledger Name cannot exceed 200 characters.';
    } else if (hasRepeating(ledger)) {
      errs.cartage_ledger_name = 'Cartage Ledger Name contains excessive repetitive characters.';
    } else if (hasLongWord(ledger, 40)) {
      errs.cartage_ledger_name = 'Cartage Ledger Name contains an excessively long continuous word.';
    }

    // Address
    const address = form.address.trim();
    if (address) {
      if (address.length > 500) {
        errs.address = 'Address cannot exceed 500 characters.';
      } else if (hasLongWord(address, 40)) {
        errs.address = 'Address contains an excessively long continuous word.';
      }
    }

    if (Object.keys(errs).length > 0) {
      errs.general = 'Please correct the highlighted errors below.';
      setErrors(errs);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setErrors({});

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

      if (editingId) {
        await api.put(`/suppliers/${editingId}/`, payload);
        setSuccessMsg(`Supplier "${payload.name}" updated successfully.`);
      } else {
        await api.post('/suppliers/', payload);
        setSuccessMsg(`New supplier "${payload.name}" created successfully.`);
      }
      setTimeout(() => setSuccessMsg(''), 3000);
      setIsFormOpen(false);
      fetchSuppliers();
    } catch (err) {
      console.error(err);
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
        setErrors(newErrors);
      } else {
        setErrors({ general: 'Failed to save supplier details. Please check your inputs.' });
      }
    } finally {
      setSaving(false);
    }
  };

  // States list for filtering
  const statesList = Array.from(new Set(suppliers.map(s => s.state_name).filter(Boolean)));

  const filteredSuppliers = suppliers.filter(s => {
    const matchSearch =
      (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.phone || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.gstin || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.address || '').toLowerCase().includes(search.toLowerCase());
    const matchState = !stateFilter || s.state_name === stateFilter;
    return matchSearch && matchState;
  });

  return (
    <div className="page-container" style={{ padding: '1.5rem 2rem', backgroundColor: '#fcfaf7', minHeight: '100vh' }}>
      {/* ── Top Header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Building2 color="#8b5a2b" size={32}/> Supplier Master Directory
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '0.25rem' }}>
              Manage supplier profiles, GSTIN registrations, and default freight cartage tax settings.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn-primary"
              onClick={handleOpenAdd}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#8b5a2b', color: '#ffffff', fontWeight: 700, padding: '0.55rem 1.2rem', borderRadius: '10px' }}
            >
              <Plus size={18}/>Add New Supplier
            </button>
            <button
              className="btn-secondary"
              onClick={fetchSuppliers}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '10px' }}
            >
              <RefreshCw size={16}/> Refresh
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.88rem', marginBottom: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Check size={18}/> {successMsg}
        </div>
      )}

      {/* ── KPI Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '1.1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Registered Suppliers</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginTop: '0.3rem' }}>{suppliers.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#8b5a2b', marginTop: '0.2rem' }}>Active Vendor Profiles</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '1.1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>GSTIN Verified</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', marginTop: '0.3rem' }}>
            {suppliers.filter(s => s.gstin).length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.2rem' }}>Registered GST Vendors</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '1.1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>States Covered</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.3rem' }}>{statesList.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '0.2rem' }}>Unique State Jurisdictions</div>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search supplier by name, phone, GSTIN, address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '38px', height: '42px' }}
          />
        </div>

        {statesList.length > 0 && (
          <div style={{ minWidth: '180px' }}>
            <select
              className="form-input"
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              style={{ height: '42px' }}
            >
              <option value="">All States ({statesList.length})</option>
              {statesList.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Add / Edit Supplier Form Drawer / Card ── */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#ffffff', border: '2px solid #8b5a2b', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 4px 16px rgba(139,90,43,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#8b5a2b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={22}/> {editingId ? '✏️ Edit Supplier Profile' : 'Create New Supplier Profile'}
            </h3>
            <button type="button" onClick={() => setIsFormOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
              ✕ Close Form
            </button>
          </div>

          {errors.general && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1.5px solid #fca5a5',
              color: '#991b1b',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              fontSize: '0.88rem',
              marginBottom: '1.25rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
              <span>{errors.general}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Supplier Name *</label>
              <input
                required
                type="text"
                className="form-input"
                placeholder="e.g. Pinkcity Handicrafts Ltd"
                style={{
                  height: '42px',
                  borderColor: errors.name ? '#dc2626' : undefined,
                  backgroundColor: errors.name ? '#fff5f5' : undefined
                }}
                value={form.name}
                onChange={e => handleInputChange('name', e.target.value)}
              />
              {errors.name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 08824223476"
                style={{
                  height: '42px',
                  borderColor: errors.phone ? '#dc2626' : undefined,
                  backgroundColor: errors.phone ? '#fff5f5' : undefined
                }}
                value={form.phone}
                onChange={e => handleInputChange('phone', e.target.value)}
              />
              {errors.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  <span>{errors.phone}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">GSTIN / UIN</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 08ABCDE1234F1Z5"
                style={{
                  height: '42px',
                  borderColor: errors.gstin ? '#dc2626' : undefined,
                  backgroundColor: errors.gstin ? '#fff5f5' : undefined
                }}
                value={form.gstin}
                onChange={e => handleInputChange('gstin', e.target.value.toUpperCase())}
              />
              {errors.gstin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  <span>{errors.gstin}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">State Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Rajasthan"
                style={{
                  height: '42px',
                  borderColor: errors.state_name ? '#dc2626' : undefined,
                  backgroundColor: errors.state_name ? '#fff5f5' : undefined
                }}
                value={form.state_name}
                onChange={e => handleInputChange('state_name', e.target.value)}
              />
              {errors.state_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  <span>{errors.state_name}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Cartage GST Rate (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="form-input"
                placeholder="18.00"
                style={{
                  height: '42px',
                  borderColor: errors.cartage_gst_rate ? '#dc2626' : undefined,
                  backgroundColor: errors.cartage_gst_rate ? '#fff5f5' : undefined
                }}
                value={form.cartage_gst_rate}
                onChange={e => handleInputChange('cartage_gst_rate', e.target.value)}
              />
              {errors.cartage_gst_rate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  <span>{errors.cartage_gst_rate}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Cartage Ledger Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="PUR. CARTAGE GST @ 18% -  3 %"
                style={{
                  height: '42px',
                  borderColor: errors.cartage_ledger_name ? '#dc2626' : undefined,
                  backgroundColor: errors.cartage_ledger_name ? '#fff5f5' : undefined
                }}
                value={form.cartage_ledger_name}
                onChange={e => handleInputChange('cartage_ledger_name', e.target.value)}
              />
              {errors.cartage_ledger_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  <span>{errors.cartage_ledger_name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Full Address</label>
            <textarea
              rows={2}
              className="form-input"
              placeholder="Enter supplier factory / office address..."
              style={{
                borderColor: errors.address ? '#dc2626' : undefined,
                backgroundColor: errors.address ? '#fff5f5' : undefined
              }}
              value={form.address}
              onChange={e => handleInputChange('address', e.target.value)}
            />
            {errors.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                <span>{errors.address}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem' }}>
            <button type="button" className="btn-secondary" onClick={() => setIsFormOpen(false)} style={{ padding: '0.55rem 1.4rem', borderRadius: '10px' }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving} style={{ backgroundColor: '#8b5a2b', borderColor: '#8b5a2b', padding: '0.55rem 1.8rem', borderRadius: '10px', fontWeight: 800 }}>
              {saving ? 'Saving Profile...' : (editingId ? '✓ Update Supplier Profile' : '✓ Save New Supplier')}
            </button>
          </div>
        </form>
      )}

      {/* ── Supplier Data View (Desktop Table + Mobile Cards) ── */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1.5px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            Loading supplier master records...
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94a3b8' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto' }}>
              <Building2 size={28} color="#cbd5e1"/>
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#475569' }}>No suppliers found</div>
            <div style={{ fontSize: '0.82rem', marginTop: '0.2rem' }}>
              Click <strong>"+ Add New Supplier"</strong> above to create a new supplier profile.
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table (Visible > 768px) */}
            <div className="table-container desktop-only">
              <table className="data-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>SUPPLIER NAME</th>
                    <th>PHONE</th>
                    <th>GSTIN</th>
                    <th>STATE</th>
                    <th>CARTAGE GST %</th>
                    <th>ADDRESS</th>
                    <th style={{ textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map(sup => (
                    <tr key={sup.id}>
                      <td style={{ fontWeight: 800, color: '#1e293b' }}>{sup.name}</td>
                      <td>
                        {sup.phone ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            📞 {sup.phone}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {sup.gstin ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#334155', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {sup.gstin}
                          </span>
                        ) : '—'}
                      </td>
                      <td>{sup.state_name || '—'}</td>
                      <td style={{ fontWeight: 800, color: '#8b5a2b' }}>{sup.cartage_gst_rate || '18.00'}%</td>
                      <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sup.address || '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleOpenEdit(sup)}
                            title="Edit Supplier Profile"
                            style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 700 }}
                          >
                            <Edit size={14}/> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(sup)}
                            title="Delete Supplier"
                            style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 700 }}
                          >
                            <Trash2 size={14}/> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Visible <= 768px) */}
            <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredSuppliers.map(sup => (
                <div key={sup.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>{sup.name}</h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8b5a2b', backgroundColor: '#fffcf7', border: '1px solid #f3e8d5', padding: '2px 8px', borderRadius: '6px' }}>
                      Cartage GST: {sup.cartage_gst_rate || '18'}%
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.85rem' }}>
                    {sup.phone && <div>📞 {sup.phone}</div>}
                    {sup.gstin && <div>GSTIN: <strong style={{ color: '#334155' }}>{sup.gstin}</strong></div>}
                    {sup.state_name && <div>State: {sup.state_name}</div>}
                    {sup.address && <div style={{ fontSize: '0.78rem', color: '#475569' }}>📍 {sup.address}</div>}
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                    <button
                      onClick={() => handleOpenEdit(sup)}
                      style={{ flex: 1, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '6px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                    >
                      <Edit size={14}/> Edit Profile
                    </button>
                    <button
                      onClick={() => handleDelete(sup)}
                      style={{ flex: 1, backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '6px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                    >
                      <Trash2 size={14}/> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
