import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Undo2, Save, AlertCircle, CheckCircle, X, FileText } from 'lucide-react';
import api from '../api/axios';
import SearchableSelect from '../components/SearchableSelect';
import { FormSkeleton } from '../components/TableSkeleton';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import UnsavedChangesModal from '../components/UnsavedChangesModal';

export default function StoreMaterialReturnPage() {
  const navigate = useNavigate();
  const location = useLocation();

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

  const {
    isDirty,
    setIsDirty,
    showExitModal,
    confirmExit,
    handleSaveDraft,
    handleDiscardAndExit,
    handleCancelExit,
    currentDraftId,
    setCurrentDraftId,
    clearDraft
  } = useUnsavedChanges({
    formType: 'store_return',
    formLabel: 'Store Material Return',
    getFormTitle: (data) => `Material Return - Voucher ${data?.voucher_no || 'New'}`,
    getFormData: () => formData,
    targetPath: '/store-management/material-return',
    onSaveForm: async () => {
      const formEl = document.getElementById('store-material-return-form');
      if (formEl) {
        formEl.requestSubmit();
        return true;
      }
      return false;
    }
  });

  useEffect(() => {
    if (location.state?.draftData) {
      setFormData(location.state.draftData);
      setIsDirty(true);
      if (location.state.draftId) {
        setCurrentDraftId(location.state.draftId);
      }
    }
  }, [location.state]);

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => setToastNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

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

  const handleFieldChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    setIsDirty(true);
    if (formErrors[field]) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
    if (error) setError(null);
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    const computedMonthYear = getMonthYearFromDate(val);
    setFormData(prev => ({
      ...prev,
      return_date: val,
      month_year: computedMonthYear
    }));
    setIsDirty(true);
    if (formErrors.return_date) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.return_date;
        return copy;
      });
    }
    if (error) setError(null);
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
    setIsDirty(true);
    if (formErrors.item) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.item;
        return copy;
      });
    }
    if (error) setError(null);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.voucher_no || !formData.voucher_no.trim()) {
      errors.voucher_no = 'Return voucher number is required.';
    } else if (formData.voucher_no.trim().length > 100) {
      errors.voucher_no = 'Voucher number cannot exceed 100 characters.';
    }

    if (!formData.return_date) {
      errors.return_date = 'Return date is required.';
    }

    if (!formData.contractor) {
      errors.contractor = 'Please select a contractor returning the material.';
    }

    if (!formData.item) {
      errors.item = 'Please select a Store Item to return.';
    }

    const q = parseFloat(formData.qty);
    if (formData.qty === '' || formData.qty === null || formData.qty === undefined || isNaN(q)) {
      errors.qty = 'Returned quantity is required.';
    } else if (q <= 0) {
      errors.qty = 'Returned quantity must be greater than zero.';
    } else if (q > 10000000) {
      errors.qty = 'Quantity exceeds maximum limit (10,000,000).';
    }

    if (formData.rate !== '' && formData.rate !== null && formData.rate !== undefined) {
      const r = parseFloat(formData.rate);
      if (isNaN(r) || r < 0) {
        errors.rate = 'Return rate cannot be negative.';
      }
    }

    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFormErrors(clientErrors);
      const firstMsg = Object.values(clientErrors)[0];
      setError(firstMsg || 'Please resolve highlighted errors below.');
      setToastNotification({
        type: 'error',
        message: firstMsg || 'Please resolve highlighted errors before confirming.'
      });
      return;
    }

    setSubmitting(true);
    setError(null);
    setFormErrors({});

    api.post('/store/material-returns/', formData)
      .then(() => {
        clearDraft();
        setSuccessMsg('Store Material Return recorded successfully! Inventory stock credited.');
        setToastNotification({
          type: 'success',
          message: 'Store Material Return recorded successfully!'
        });
        setTimeout(() => navigate('/store-management'), 1200);
      })
      .catch(err => {
        console.error('Material return submission failed:', err);
        const data = err.response?.data;
        if (data && typeof data === 'object') {
          const backendErrors = {};
          Object.entries(data).forEach(([key, val]) => {
            backendErrors[key] = Array.isArray(val) ? val.join(' ') : String(val);
          });
          setFormErrors(backendErrors);
          const firstErr = Object.values(backendErrors)[0];
          setError(firstErr || 'Failed to save material return.');
          setToastNotification({
            type: 'error',
            message: firstErr || 'Validation failed. Check highlighted fields.'
          });
        } else {
          setError(err.message || 'Server error while recording return.');
          setToastNotification({
            type: 'error',
            message: err.message || 'Server error occurred.'
          });
        }
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
            onClick={() => {
              if (confirmExit('/store-management')) navigate('/store-management');
            }}
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
          <form id="store-material-return-form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Row 1: Voucher & Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.voucher_no ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                  Return Voucher No *
                </label>
                <input
                  type="text"
                  value={formData.voucher_no}
                  onChange={(e) => handleFieldChange('voucher_no', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: formErrors.voucher_no ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                    backgroundColor: formErrors.voucher_no ? '#fff5f5' : '#ffffff',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
                {formErrors.voucher_no && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                    <AlertCircle size={13} />
                    <span>{formErrors.voucher_no}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.return_date ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                  Return Date *
                </label>
                <input
                  type="date"
                  value={formData.return_date}
                  onChange={handleDateChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: formErrors.return_date ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                    backgroundColor: formErrors.return_date ? '#fff5f5' : '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
                {formErrors.return_date && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                    <AlertCircle size={13} />
                    <span>{formErrors.return_date}</span>
                  </div>
                )}
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
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.contractor ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                  Target Contractor / Supervisor Returning Material *
                </label>
                <SearchableSelect
                  options={contractors.map(c => ({ ...c, name: `${c.full_name || c.username} (@${c.username})` }))}
                  value={formData.contractor}
                  onChange={(val) => {
                    const cId = typeof val === 'object' ? val.id : val;
                    handleFieldChange('contractor', cId);
                  }}
                  placeholder="Search contractor returning material..."
                  idKey="id"
                  titleKey="name"
                  pageSize={15}
                  hasError={Boolean(formErrors.contractor)}
                />
                {formErrors.contractor && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                    <AlertCircle size={13} />
                    <span>{formErrors.contractor}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.production_unit ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                  Factory Unit / Department
                </label>
                <select
                  value={formData.production_unit}
                  onChange={(e) => handleFieldChange('production_unit', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: formErrors.production_unit ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                    backgroundColor: formErrors.production_unit ? '#fff5f5' : '#ffffff',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select Factory Unit (Optional)</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                {formErrors.production_unit && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                    <AlertCircle size={13} />
                    <span>{formErrors.production_unit}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Row 3: Store Item & Current Stock */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: formErrors.item ? '#dc2626' : '#334155' }}>
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
                hasError={Boolean(formErrors.item)}
              />
              {formErrors.item && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                  <AlertCircle size={13} />
                  <span>{formErrors.item}</span>
                </div>
              )}
            </div>

            {/* Row 4: Returned Qty, Rate & Credit Status */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.qty ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                  Returned Qty ({formData.unit}) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={formData.qty}
                  onChange={(e) => handleFieldChange('qty', e.target.value)}
                  placeholder="0.00"
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: formErrors.qty ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                    backgroundColor: formErrors.qty ? '#fff5f5' : '#ffffff',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
                {formErrors.qty && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                    <AlertCircle size={13} />
                    <span>{formErrors.qty}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.rate ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                  Return Rate (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => handleFieldChange('rate', e.target.value)}
                  placeholder="0.00"
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: formErrors.rate ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                    backgroundColor: formErrors.rate ? '#fff5f5' : '#ffffff',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
                {formErrors.rate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                    <AlertCircle size={13} />
                    <span>{formErrors.rate}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Chargeability Credit Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
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
                onChange={(e) => handleFieldChange('remark', e.target.value)}
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
                onClick={() => {
                  if (confirmExit('/store-management')) navigate('/store-management');
                }}
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
                type="button"
                onClick={() => handleSaveDraft()}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <FileText size={16} /> Save as Draft
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
                  opacity: submitting ? 0.7 : 1,
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

      <UnsavedChangesModal
        isOpen={showExitModal}
        formLabel="Store Material Return"
        onSaveDraft={handleSaveDraft}
        onDiscard={handleDiscardAndExit}
        onCancel={handleCancelExit}
      />

      {/* Floating Toast Notification */}
      {toastNotification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: toastNotification.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${toastNotification.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          color: toastNotification.type === 'error' ? '#991b1b' : '#166534',
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          zIndex: 9999,
          maxWidth: '420px',
          fontSize: '0.9rem'
        }}>
          {toastNotification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span style={{ flex: 1 }}>{toastNotification.message}</span>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
