import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Undo2, Save, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import SearchableSelect from '../components/SearchableSelect';
import { FormSkeleton } from '../components/TableSkeleton';

export default function StoreMaterialReturnPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [units, setUnits] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedItemObj, setSelectedItemObj] = useState(null);

  // Auto-calculate month_year string (e.g. "Aug-26") from date string
  const getMonthYearFromDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[d.getMonth()];
      const year = String(d.getFullYear()).slice(-2);
      return `${month}-${year}`;
    } catch (e) {
      return '';
    }
  };

  const initialDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    voucher_no: `ST-RET-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    return_date: initialDate,
    month_year: getMonthYearFromDate(initialDate),
    contractor: '',
    item: '',
    qty: '',
    unit: 'pcs',
    rate: '',
    status: 'charge',
    production_unit: '',
    remark: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      api.get('/store/items/'),
      api.get('/users/', { params: { role: 'contractor' } }),
      api.get('/production-units/')
    ])
      .then(([itemsRes, contrRes, unitRes]) => {
        const itemData = itemsRes.status === 'fulfilled' ? (itemsRes.value.data.results || itemsRes.value.data || []) : [];
        const contrData = contrRes.status === 'fulfilled' ? (contrRes.value.data.results || contrRes.value.data || []) : [];
        const unitData = unitRes.status === 'fulfilled' ? (unitRes.value.data.results || unitRes.value.data || []) : [];

        setItems(itemData);
        setContractors(contrData);
        setUnits(unitData);

        if (contrData.length > 0) {
          setFormData(prev => ({ ...prev, contractor: contrData[0].id }));
        }

        if (itemData.length > 0) {
          const firstI = itemData[0];
          setSelectedItemObj(firstI);
          setFormData(prev => ({
            ...prev,
            item: firstI.id,
            unit: firstI.unit,
            rate: firstI.current_rate || firstI.base_rate || '',
            status: firstI.default_status || 'charge'
          }));
        }

        if (unitData.length > 0) {
          setFormData(prev => ({ ...prev, production_unit: unitData[0].id }));
        }
      })
      .catch(err => console.error('Failed to load store return initial data:', err))
      .finally(() => setLoadingData(false));
  }, []);

  const handleDateChange = (e) => {
    const val = e.target.value;
    const computedMonthYear = getMonthYearFromDate(val);
    setFormData(prev => ({
      ...prev,
      return_date: val,
      month_year: computedMonthYear
    }));
  };

  const handleItemChange = (val, selectedObj) => {
    const itemId = typeof val === 'object' ? val.id : val;
    const found = selectedObj || items.find(i => String(i.id) === String(itemId));
    setSelectedItemObj(found || null);

    if (found) {
      setFormData(prev => ({
        ...prev,
        item: itemId,
        unit: found.unit,
        rate: found.current_rate || found.base_rate || '',
        status: found.default_status || 'charge'
      }));
    } else {
      setFormData(prev => ({ ...prev, item: itemId }));
    }
  };

  const parseFieldErrors = (err) => {
    const data = err.response?.data;
    if (!data) return 'Network error or server unavailable.';
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (data.error) return data.error;

    if (typeof data === 'object') {
      const errorMsgs = [];
      Object.keys(data).forEach(field => {
        const errs = Array.isArray(data[field]) ? data[field] : [data[field]];
        const fieldName = field.replace('_', ' ').toUpperCase();
        errorMsgs.push(`${fieldName}: ${errs.join(' ')}`);
      });
      if (errorMsgs.length > 0) return errorMsgs.join(' | ');
    }
    return 'Failed to save material return. Please check all inputs.';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.contractor) {
      setError('CONTRACTOR: Please select a target contractor returning the material.');
      return;
    }
    if (!formData.item) {
      setError('STORE ITEM: Please select an item to return.');
      return;
    }
    if (!formData.qty || parseFloat(formData.qty) <= 0) {
      setError('RETURNED QTY: Returned quantity must be greater than 0.');
      return;
    }

    setSubmitting(true);
    api.post('/store/material-returns/', formData)
      .then(() => {
        setSuccessMsg('Store Material Return recorded successfully! Inventory stock credited.');
        setTimeout(() => navigate('/store-management'), 1200);
      })
      .catch(err => {
        console.error('Material return submission failed:', err);
        setError(parseFieldErrors(err));
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
      <style>{`
        @media (max-width: 768px) {
          .return-form-grid {
            grid-template-columns: 1fr !important;
          }
          .return-action-btns {
            flex-direction: column-reverse !important;
            width: 100% !important;
          }
          .return-action-btns button {
            width: 100% !important;
            justify-content: center !important;
            padding: 0.8rem 1rem !important;
          }
        }
      `}</style>

      {/* Top Navigation & Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            type="button"
            onClick={() => navigate('/store-management')}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Stock Inward Return
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              ↩ Record Store Material Return
            </h1>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          color: '#991b1b',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          color: '#166534',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <CheckCircle size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form Container */}
      {loadingData ? (
        <FormSkeleton fields={8} />
      ) : (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '1.75rem'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Row 1: Voucher & Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Return Voucher No *
                </label>
                <input
                  type="text"
                  value={formData.voucher_no}
                  onChange={(e) => setFormData({ ...formData, voucher_no: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Return Date *
                </label>
                <input
                  type="date"
                  value={formData.return_date}
                  onChange={handleDateChange}
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Billing Month / Year
                </label>
                <input
                  type="text"
                  value={formData.month_year}
                  readOnly
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    fontWeight: 700,
                    cursor: 'not-allowed',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Row 2: Target Contractor */}
            <div className="return-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Target Contractor / Supervisor Returning Material *
                </label>
                <SearchableSelect
                  options={contractors.map(c => ({ ...c, name: `${c.full_name || c.username} (@${c.username})` }))}
                  value={formData.contractor}
                  onChange={(val) => setFormData(prev => ({ ...prev, contractor: typeof val === 'object' ? val.id : val }))}
                  placeholder="Search contractor returning material..."
                  idKey="id"
                  titleKey="name"
                  pageSize={15}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Factory Unit / Department
                </label>
                <select
                  value={formData.production_unit}
                  onChange={(e) => setFormData({ ...formData, production_unit: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                >
                  <option value="">Select Factory Unit (Optional)</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Store Item & Current Stock */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  Returned Store Item *
                </label>
                {selectedItemObj && (
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#166534',
                    backgroundColor: '#f0fdf4',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid #bbf7d0'
                  }}>
                    Current Balance Stock: {selectedItemObj.balance_stock_qty || 0} {selectedItemObj.unit}
                  </span>
                )}
              </div>

              <SearchableSelect
                options={items}
                value={formData.item}
                onChange={handleItemChange}
                placeholder="Select Store Item..."
                searchPlaceholder="Search item code, name, category..."
                idKey="id"
                codeKey="item_code"
                titleKey="item_name"
                pageSize={15}
              />
            </div>

            {/* Row 4: Returned Qty, Rate & Credit Status */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Returned Qty ({formData.unit}) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={formData.qty}
                  onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                  placeholder="0.00"
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Return Rate (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  placeholder="0.00"
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Chargeability Credit Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                >
                  <option value="charge">Chargeable (Deduct / Credit Contractor Bill)</option>
                  <option value="non_charge">Non-Chargeable Return</option>
                </select>
              </div>
            </div>

            {/* Row 5: Return Reason */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Return Remark / Reason
              </label>
              <input
                type="text"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="Reason for return (e.g. Unused stock returned after batch completion)"
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>

            {/* Buttons */}
            <div className="return-action-btns" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid #f1f5f9'
            }}>
              <button
                type="button"
                onClick={() => navigate('/store-management')}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.65rem 1.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#d97706',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 4px rgba(217, 119, 6, 0.2)'
                }}
              >
                <Save size={18} />
                <span>{submitting ? 'Recording Return...' : 'Confirm Material Return'}</span>
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
}
