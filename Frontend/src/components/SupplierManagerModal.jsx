import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { X, Building2, Plus, Edit, Trash2, Search, Check, AlertCircle } from 'lucide-react';

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
    (s.gstin || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: 850, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Building2 color="#8b5a2b" size={24}/> Supplier Master Directory (CRUD)
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Create, update, and manage supplier profiles, GSTINs, and default freight cartage rates.
            </p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20}/></button>
        </div>

        <div className="modal-body" style={{ padding: '1rem 0 0 0' }}>
          {isFormOpen ? (
            /* ── Add / Edit Supplier Form ── */
            <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#8b5a2b', margin: 0 }}>
                  {editingId ? '✏️ Edit Supplier Profile' : 'Create New Supplier Profile'}
                </h3>
                <button type="button" onClick={() => setIsFormOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem' }}>
                  Cancel
                </button>
              </div>

              {fieldErrors.general && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{fieldErrors.general}</span>
                </div>
              )}

              <div className="form-grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Supplier Name *</label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    placeholder="e.g. Pinkcity Handicrafts"
                    style={{
                      borderColor: fieldErrors.name ? '#dc2626' : undefined,
                      backgroundColor: fieldErrors.name ? '#fff5f5' : undefined
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

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 9829012345"
                    style={{
                      borderColor: fieldErrors.phone ? '#dc2626' : undefined,
                      backgroundColor: fieldErrors.phone ? '#fff5f5' : undefined
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

                <div className="form-group">
                  <label className="form-label">GSTIN / UIN</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 08ABCDE1234F1Z5"
                    style={{
                      borderColor: fieldErrors.gstin ? '#dc2626' : undefined,
                      backgroundColor: fieldErrors.gstin ? '#fff5f5' : undefined
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

                <div className="form-group">
                  <label className="form-label">State Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rajasthan"
                    style={{
                      borderColor: fieldErrors.state_name ? '#dc2626' : undefined,
                      backgroundColor: fieldErrors.state_name ? '#fff5f5' : undefined
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
                      borderColor: fieldErrors.cartage_gst_rate ? '#dc2626' : undefined,
                      backgroundColor: fieldErrors.cartage_gst_rate ? '#fff5f5' : undefined
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

                <div className="form-group">
                  <label className="form-label">Cartage Ledger Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="PUR. CARTAGE GST @ 18% -  3 %"
                    style={{
                      borderColor: fieldErrors.cartage_ledger_name ? '#dc2626' : undefined,
                      backgroundColor: fieldErrors.cartage_ledger_name ? '#fff5f5' : undefined
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

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Full Address</label>
                  <textarea
                    rows={2}
                    className="form-input"
                    placeholder="Enter supplier factory/office address..."
                    style={{
                      borderColor: fieldErrors.address ? '#dc2626' : undefined,
                      backgroundColor: fieldErrors.address ? '#fff5f5' : undefined
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsFormOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving} style={{ backgroundColor: '#8b5a2b', borderColor: '#8b5a2b' }}>
                  {saving ? 'Saving...' : (editingId ? 'Update Supplier Profile' : 'Save New Supplier')}
                </button>
              </div>
            </form>
          ) : (
            /* ── Supplier List Header Bar ── */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search supplier name, phone, gstin..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
                  />
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleOpenAdd}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', backgroundColor: '#8b5a2b', color: '#fff' }}
                >
                  <Plus size={16}/>Add New Supplier
                </button>
              </div>

              {/* Supplier Directory Table */}
              <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>Supplier Name</th>
                      <th>Phone</th>
                      <th>GSTIN</th>
                      <th>State</th>
                      <th>Cartage GST %</th>
                      <th>Address</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>Loading suppliers...</td></tr>
                    ) : filteredSuppliers.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>No suppliers found. Click "+ Add New Supplier" to create one.</td></tr>
                    ) : filteredSuppliers.map(sup => (
                      <tr key={sup.id}>
                        <td style={{ fontWeight: 800, color: '#1e293b' }}>{sup.name}</td>
                        <td>{sup.phone || '—'}</td>
                        <td>{sup.gstin || '—'}</td>
                        <td>{sup.state_name || '—'}</td>
                        <td style={{ fontWeight: 700, color: '#8b5a2b' }}>{sup.cartage_gst_rate || '18'}%</td>
                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sup.address || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleOpenEdit(sup)}
                              title="Edit Supplier Profile"
                              style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <Edit size={14}/>
                            </button>
                            <button
                              onClick={() => handleDelete(sup)}
                              title="Delete Supplier"
                              style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
