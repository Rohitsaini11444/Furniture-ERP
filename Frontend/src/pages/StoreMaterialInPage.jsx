import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Save, AlertCircle, CheckCircle, Warehouse, FileText,
  X, Plus, Trash2, Layers, IndianRupee, Package, Calculator, Check
} from 'lucide-react';
import api from '../api/axios';
import SearchableSelect from '../components/SearchableSelect';
import SupplierManagerModal from '../components/SupplierManagerModal';
import { FormSkeleton } from '../components/TableSkeleton';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { UnsavedChangesModal } from '../components/UnsavedChangesModal';

const createEmptyRow = (defaultUnit = 'pcs') => ({
  id: `row-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  item: '',
  qty: '',
  unit: defaultUnit,
  bill_rate: '',
  total_amount: '',
  remark: ''
});

export default function StoreMaterialInPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    voucher_no: `ST-IN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    inward_date: new Date().toISOString().split('T')[0],
    month_year: '',
    bill_no: '',
    supplier: '',
    production_unit: '',
    remark: '',
    items: [createEmptyRow()]
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => setToastNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  const {
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
    formType: 'store_in',
    formLabel: 'Store Material In',
    getFormTitle: (data) => `Material In - Inv ${data?.bill_no || data?.voucher_no || 'New'} (${data?.items?.length || 1} items)`,
    getFormData: () => formData,
    targetPath: '/store-management/material-in',
    onSaveForm: async () => {
      const formEl = document.getElementById('store-material-in-form');
      if (formEl) {
        formEl.requestSubmit();
        return true;
      }
      return false;
    }
  });

  // Restore drafts (supporting both legacy single-item & multi-item drafts)
  useEffect(() => {
    if (location.state?.draftData) {
      const d = location.state.draftData;
      if (!d.items || !Array.isArray(d.items) || d.items.length === 0) {
        setFormData({
          voucher_no: d.voucher_no || `ST-IN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          inward_date: d.inward_date || new Date().toISOString().split('T')[0],
          month_year: d.month_year || '',
          bill_no: d.bill_no || '',
          supplier: d.supplier || '',
          production_unit: d.production_unit || '',
          remark: d.remark || '',
          items: [
            {
              id: 'row-1',
              item: d.item || '',
              qty: d.qty || '',
              unit: d.unit || 'pcs',
              bill_rate: d.bill_rate || '',
              total_amount: d.total_amount || '',
              remark: ''
            }
          ]
        });
      } else {
        setFormData(d);
      }
      setIsDirty(true);
      if (location.state.draftId) {
        setCurrentDraftId(location.state.draftId);
      }
    }
  }, [location.state]);

  // Load items, suppliers, production units (ordered oldest-first)
  useEffect(() => {
    Promise.allSettled([
      api.get('/store/items/', { params: { nopage: true } }),
      api.get('/suppliers/', { params: { nopage: true } }),
      api.get('/production-units/', { params: { nopage: true, ordering: 'created_at' } })
    ])
      .then(([itemsRes, suppRes, unitRes]) => {
        const itemData = itemsRes.status === 'fulfilled' ? (itemsRes.value.data.results || itemsRes.value.data || []) : [];
        const suppData = suppRes.status === 'fulfilled' ? (suppRes.value.data.results || suppRes.value.data || []) : [];
        const unitData = unitRes.status === 'fulfilled' ? (unitRes.value.data.results || unitRes.value.data || []) : [];

        // Sort units chronologically (oldest / first added first e.g. Unit #1)
        const sortedUnits = [...unitData].sort((a, b) => {
          if (a.created_at && b.created_at) {
            const diff = new Date(a.created_at) - new Date(b.created_at);
            if (diff !== 0) return diff;
          }
          return String(a.unit_code || a.name || '').localeCompare(String(b.unit_code || b.name || ''), undefined, { numeric: true });
        });

        setItems(itemData);
        setSuppliers(suppData);
        setUnits(sortedUnits);

        setFormData(prev => {
          const updated = { ...prev };
          if (!updated.supplier && suppData.length > 0) {
            updated.supplier = suppData[0].id;
          }
          if (!updated.production_unit && sortedUnits.length > 0) {
            const savedUnit = localStorage.getItem('preferred_store_unit');
            const validSaved = savedUnit && sortedUnits.some(u => String(u.id) === String(savedUnit));
            updated.production_unit = validSaved ? savedUnit : sortedUnits[0].id;
          }
          return updated;
        });
      })
      .catch(err => console.error('Failed to load material in initial data:', err))
      .finally(() => setLoadingData(false));
  }, []);

  const handleSupplierUpdated = async (savedSupplier) => {
    try {
      const suppRes = await api.get('/suppliers/', { params: { nopage: true } });
      const suppData = suppRes.data.results || suppRes.data || [];
      setSuppliers(suppData);
      if (savedSupplier?.id) {
        setFormData(prev => ({ ...prev, supplier: savedSupplier.id }));
        if (formErrors.supplier) {
          setFormErrors(prev => ({ ...prev, supplier: null }));
        }
      }
    } catch (e) {
      console.error('Failed to refresh suppliers:', e);
    }
  };

  const handleHeaderFieldChange = (field, value) => {
    setIsDirty(true);
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
    if (error) setError(null);
  };

  // Row item selection
  const handleRowItemChange = (idx, val, selectedObj) => {
    setIsDirty(true);
    const itemId = typeof val === 'object' && val?.target ? val.target.value : (typeof val === 'object' ? val?.id : val);
    const selectedItem = selectedObj || items.find(i => String(i.id) === String(itemId));

    setFormData(prev => {
      const updatedItems = [...prev.items];
      const target = { ...updatedItems[idx] };

      if (selectedItem) {
        target.item = selectedItem.id;
        target.unit = selectedItem.unit || 'pcs';
        target.bill_rate = selectedItem.current_rate || selectedItem.base_rate || '';
        const q = parseFloat(target.qty || 0);
        const r = parseFloat(target.bill_rate || 0);
        target.total_amount = (q && r) ? (q * r).toFixed(2) : '';
      } else {
        target.item = itemId;
      }

      updatedItems[idx] = target;
      return { ...prev, items: updatedItems };
    });

    if (formErrors.rowErrors && formErrors.rowErrors[idx]?.item) {
      setFormErrors(prev => {
        const copy = { ...prev };
        const copyRows = { ...copy.rowErrors };
        delete copyRows[idx]?.item;
        copy.rowErrors = copyRows;
        return copy;
      });
    }
  };

  // Row field change (qty, bill_rate, remark)
  const handleRowFieldChange = (idx, field, val) => {
    setIsDirty(true);
    setFormData(prev => {
      const updatedItems = [...prev.items];
      const target = { ...updatedItems[idx], [field]: val };

      if (field === 'qty' || field === 'bill_rate') {
        const q = parseFloat(target.qty || 0);
        const r = parseFloat(target.bill_rate || 0);
        target.total_amount = (!isNaN(q) && !isNaN(r) && q > 0 && r >= 0) ? (q * r).toFixed(2) : '';
      }

      updatedItems[idx] = target;
      return { ...prev, items: updatedItems };
    });

    if (formErrors.rowErrors && formErrors.rowErrors[idx]?.[field]) {
      setFormErrors(prev => {
        const copy = { ...prev };
        const copyRows = { ...copy.rowErrors };
        delete copyRows[idx]?.[field];
        copy.rowErrors = copyRows;
        return copy;
      });
    }
  };

  // Add rows
  const handleAddItemRow = (count = 1) => {
    setIsDirty(true);
    setFormData(prev => {
      const newRows = Array.from({ length: count }, () => createEmptyRow());
      return { ...prev, items: [...prev.items, ...newRows] };
    });
  };

  // Remove row
  const handleRemoveItemRow = (idx) => {
    setIsDirty(true);
    setFormData(prev => {
      if (prev.items.length <= 1) {
        return { ...prev, items: [createEmptyRow()] };
      }
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== idx)
      };
    });
    if (formErrors.rowErrors && formErrors.rowErrors[idx]) {
      setFormErrors(prev => {
        const copy = { ...prev };
        const copyRows = { ...copy.rowErrors };
        delete copyRows[idx];
        copy.rowErrors = copyRows;
        return copy;
      });
    }
  };

  // Summary totals calculation
  const summaryTotals = useMemo(() => {
    let totalItems = 0;
    let totalQty = 0;
    let grandTotal = 0;

    formData.items.forEach(r => {
      if (r.item) totalItems += 1;
      const q = parseFloat(r.qty || 0);
      const rate = parseFloat(r.bill_rate || 0);
      if (!isNaN(q) && q > 0) totalQty += q;
      if (!isNaN(q) && !isNaN(rate) && q > 0 && rate >= 0) {
        grandTotal += (q * rate);
      }
    });

    return {
      rowCount: formData.items.length,
      filledItemsCount: totalItems,
      totalQty: totalQty.toFixed(2),
      grandTotal: grandTotal.toFixed(2)
    };
  }, [formData.items]);

  const validateForm = () => {
    const errors = {};
    const rowErrors = {};

    if (!formData.voucher_no || !formData.voucher_no.trim()) {
      errors.voucher_no = 'Voucher series is required.';
    }

    if (!formData.inward_date) {
      errors.inward_date = 'Inward date is required.';
    }

    if (!formData.bill_no || !formData.bill_no.trim()) {
      errors.bill_no = 'Supplier Bill / Invoice # is required.';
    } else if (formData.bill_no.trim().length > 100) {
      errors.bill_no = 'Bill number cannot exceed 100 characters.';
    }

    if (!formData.supplier) {
      errors.supplier = 'Supplier is required.';
    }

    if (!formData.production_unit) {
      errors.production_unit = 'Destination Factory Unit is required.';
    }

    if (!formData.items || formData.items.length === 0) {
      errors.items = 'Please add at least one item.';
    } else {
      formData.items.forEach((row, idx) => {
        const rErr = {};
        if (!row.item) {
          rErr.item = 'Store item is required';
        }

        const q = parseFloat(row.qty);
        if (row.qty === '' || row.qty === null || row.qty === undefined || isNaN(q)) {
          rErr.qty = 'Qty required';
        } else if (q <= 0) {
          rErr.qty = 'Must be > 0';
        } else if (q > 10000000) {
          rErr.qty = 'Exceeds limit';
        }

        const r = parseFloat(row.bill_rate);
        if (row.bill_rate === '' || row.bill_rate === null || row.bill_rate === undefined || isNaN(r)) {
          rErr.bill_rate = 'Rate required';
        } else if (r < 0) {
          rErr.bill_rate = 'Negative rate invalid';
        }

        if (Object.keys(rErr).length > 0) {
          rowErrors[idx] = rErr;
        }
      });
    }

    if (Object.keys(rowErrors).length > 0) {
      errors.rowErrors = rowErrors;
    }

    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFormErrors(clientErrors);
      const firstRowIdx = Object.keys(clientErrors.rowErrors || {})[0];
      const msg = clientErrors.bill_no || clientErrors.supplier || clientErrors.production_unit || clientErrors.items ||
        (firstRowIdx !== undefined ? `Please resolve errors in item line #${parseInt(firstRowIdx, 10) + 1}.` : 'Please resolve highlighted errors before confirming.');
      setError(msg);
      setToastNotification({
        type: 'error',
        message: msg
      });
      return;
    }

    setSubmitting(true);
    setError(null);
    setFormErrors({});

    const payload = {
      voucher_no: formData.voucher_no,
      bill_no: formData.bill_no.trim(),
      inward_date: formData.inward_date,
      supplier: formData.supplier,
      production_unit: formData.production_unit,
      remark: formData.remark,
      items: formData.items.map(r => ({
        item: r.item,
        qty: parseFloat(r.qty),
        unit: r.unit || 'pcs',
        bill_rate: parseFloat(r.bill_rate),
        remark: r.remark || ''
      }))
    };

    api.post('/store/material-in/bulk-inward/', payload)
      .then((res) => {
        if (currentDraftId) clearDraft(currentDraftId);
        setIsDirty(false);
        const count = res.data?.count || payload.items.length;
        const successText = `Successfully recorded inward receipt for ${count} items under Bill #${payload.bill_no}! Stock balance credited.`;
        setSuccessMsg(successText);
        setToastNotification({
          type: 'success',
          message: successText
        });
        setTimeout(() => navigate('/store-management'), 1300);
      })
      .catch(err => {
        console.error('Material inward bulk save failed:', err);
        const data = err.response?.data;
        if (data && typeof data === 'object') {
          const backendErrors = {};
          if (data.row_errors && Array.isArray(data.row_errors)) {
            const rErrs = {};
            data.row_errors.forEach(re => {
              rErrs[re.row - 1] = re.errors;
            });
            backendErrors.rowErrors = rErrs;
          }
          Object.entries(data).forEach(([key, val]) => {
            if (key !== 'row_errors') {
              backendErrors[key] = Array.isArray(val) ? val.join(' ') : String(val);
            }
          });
          setFormErrors(backendErrors);
          setError(data.detail || Object.values(backendErrors)[0] || 'Failed to record store material inward.');
          setToastNotification({
            type: 'error',
            message: data.detail || 'Validation failed. Check highlighted fields.'
          });
        } else {
          setError(err.message || 'Server error while recording inward receipt.');
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
        @media (max-width: 900px) {
          .mat-in-grid-header {
            grid-template-columns: 1fr !important;
          }
          .mat-in-action-btns {
            flex-direction: column-reverse !important;
            width: 100% !important;
          }
          .mat-in-action-btns button {
            width: 100% !important;
            justify-content: center !important;
            padding: 0.8rem 1rem !important;
          }
        }
        .item-row:hover {
          background-color: #f8fafc;
        }
        .btn-add-row:hover {
          background-color: #f1f5f9 !important;
          border-color: #94a3b8 !important;
        }
      `}</style>

      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
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
            title="Return to Store Management"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Stock Credit (Inward)
              </span>
              <span style={{ fontSize: '0.72rem', backgroundColor: '#dcfce7', color: '#166534', padding: '1px 8px', borderRadius: '12px', fontWeight: 700 }}>
                Multi-Item Invoice Mode
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              Material In (Credit Stock) Entry
            </h1>
          </div>
        </div>

        {/* Quick helper tip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#64748b' }}>
          <FileText size={16} color="#0284c7" />
          <span>Add multiple items from a single supplier bill simultaneously</span>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '0.9rem 1.25rem',
          marginBottom: '1.25rem',
          color: '#991b1b',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '0.9rem 1.25rem',
          marginBottom: '1.25rem',
          color: '#166534',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <CheckCircle size={20} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form Container */}
      {loadingData ? (
        <FormSkeleton fields={8} />
      ) : (
        <form id="store-material-in-form" onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* SECTION 1: INVOICE & SUPPLIER HEADER */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            padding: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
              <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Warehouse size={16} color="#8b5a2b" />
                <span>1. Invoice & Supplier Details (Enter Once Per Bill)</span>
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Fields marked with * are required
              </span>
            </div>

            <div className="mat-in-grid-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
              
              {/* Supplier Bill / Invoice # */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.bill_no ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                  Supplier Bill / Invoice # *
                </label>
                <input
                  type="text"
                  value={formData.bill_no}
                  onChange={(e) => handleHeaderFieldChange('bill_no', e.target.value)}
                  placeholder="e.g. GP/2026-27/737"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: `1.5px solid ${formErrors.bill_no ? '#dc2626' : '#cbd5e1'}`,
                    backgroundColor: formErrors.bill_no ? '#fff5f5' : '#ffffff',
                    fontWeight: 700,
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                />
                {formErrors.bill_no && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.76rem', marginTop: '4px' }}>
                    <AlertCircle size={13} /> <span>{formErrors.bill_no}</span>
                  </div>
                )}
              </div>

              {/* Inward Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: formErrors.inward_date ? '#dc2626' : '#334155', marginBottom: '6px' }}>
                  Invoice / Inward Date *
                </label>
                <input
                  type="date"
                  value={formData.inward_date}
                  onChange={(e) => handleHeaderFieldChange('inward_date', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: `1.5px solid ${formErrors.inward_date ? '#dc2626' : '#cbd5e1'}`,
                    backgroundColor: formErrors.inward_date ? '#fff5f5' : '#ffffff',
                    fontWeight: 600,
                    boxSizing: 'border-box'
                  }}
                />
                {formErrors.inward_date && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.76rem', marginTop: '4px' }}>
                    <AlertCircle size={13} /> <span>{formErrors.inward_date}</span>
                  </div>
                )}
              </div>

              {/* Supplier Selection */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: formErrors.supplier ? '#dc2626' : '#334155' }}>
                    Supplier Name *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSupplierModal(true)}
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#ea580c',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '1px 4px'
                    }}
                    title="Create New Supplier Profile"
                  >
                    <Plus size={13} />
                    <span>New Supplier</span>
                  </button>
                </div>
                <div style={{ borderRadius: '8px', border: formErrors.supplier ? '1.5px solid #dc2626' : 'none' }}>
                  <SearchableSelect
                    options={suppliers}
                    value={formData.supplier}
                    onChange={(val) => handleHeaderFieldChange('supplier', val)}
                    placeholder="Select Supplier (e.g. Gourav Pneumatics)..."
                    searchPlaceholder="Search supplier name..."
                    idKey="id"
                    titleKey="name"
                    pageSize={15}
                  />
                </div>
                {formErrors.supplier && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.76rem', marginTop: '4px' }}>
                    <AlertCircle size={13} /> <span>{formErrors.supplier}</span>
                  </div>
                )}
              </div>

              {/* Destination Factory Unit */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: formErrors.production_unit ? '#dc2626' : '#ea580c', marginBottom: '6px' }}>
                  <span>Destination Factory Unit *</span>
                  <span style={{ fontSize: '0.72rem', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '1px 6px', borderRadius: '4px' }}>
                    Stock Destination
                  </span>
                </label>
                <select
                  value={formData.production_unit}
                  onChange={(e) => {
                    handleHeaderFieldChange('production_unit', e.target.value);
                    try {
                      localStorage.setItem('preferred_store_unit', e.target.value);
                    } catch (err) {}
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: `1.5px solid ${formErrors.production_unit ? '#dc2626' : '#fed7aa'}`,
                    backgroundColor: formErrors.production_unit ? '#fff5f5' : '#fffaf5',
                    color: formErrors.production_unit ? '#dc2626' : '#9a3412',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select Factory Unit</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                {formErrors.production_unit && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.76rem', marginTop: '4px' }}>
                    <AlertCircle size={13} /> <span>{formErrors.production_unit}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Storage Remarks / Transport Details */}
            <div style={{ marginTop: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                Storage Location / Delivery Note / Remarks (Optional)
              </label>
              <input
                type="text"
                value={formData.remark}
                onChange={(e) => handleHeaderFieldChange('remark', e.target.value)}
                placeholder="e.g. Dispatched by Hand / Delivery Note Ref #102 / Stored in Bin A-4"
                style={{
                  width: '100%',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* SECTION 2: LINE ITEMS GRID */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '0.85rem 1.25rem',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={16} color="#0284c7" />
                  <span>2. Received Items Breakdown ({formData.items.length} {formData.items.length === 1 ? 'Item' : 'Items'})</span>
                </h2>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Add each item from the physical invoice with quantity and rate
                </span>
              </div>

              {/* Quick Add Row Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleAddItemRow(1)}
                  className="btn-add-row"
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 150ms ease'
                  }}
                >
                  <Plus size={14} color="#0284c7" />
                  <span>Add Item Row</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItemRow(5)}
                  className="btn-add-row"
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 150ms ease'
                  }}
                  title="Add 5 blank rows at once"
                >
                  <Layers size={13} color="#ea580c" />
                  <span>+5 Rows</span>
                </button>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ overflowX: 'auto', minHeight: '160px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
                  <tr>
                    <th style={{ width: '40px', padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem' }}>#</th>
                    <th style={{ minWidth: '360px', padding: '0.75rem 0.75rem', textAlign: 'left', fontWeight: 700, fontSize: '0.8rem' }}>Store Item *</th>
                    <th style={{ width: '130px', padding: '0.75rem 0.75rem', textAlign: 'left', fontWeight: 700, fontSize: '0.8rem' }}>Quantity *</th>
                    <th style={{ width: '80px', padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem' }}>Unit</th>
                    <th style={{ width: '150px', padding: '0.75rem 0.75rem', textAlign: 'left', fontWeight: 700, fontSize: '0.8rem' }}>Bill Rate (₹) *</th>
                    <th style={{ width: '150px', padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: 700, fontSize: '0.8rem' }}>Line Total (₹)</th>
                    <th style={{ width: '50px', padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem' }}>Act</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((row, idx) => {
                    const rowErr = formErrors.rowErrors?.[idx] || {};
                    const selectedItemObj = items.find(i => String(i.id) === String(row.item));

                    return (
                      <tr key={row.id || idx} className="item-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {/* Row Index */}
                        <td style={{ textAlign: 'center', padding: '0.65rem 0.5rem', fontWeight: 700, color: '#94a3b8', fontSize: '0.8rem' }}>
                          {idx + 1}
                        </td>

                        {/* Store Item Selector */}
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <div>
                            <SearchableSelect
                              options={items}
                              value={row.item}
                              onChange={(val, obj) => handleRowItemChange(idx, val, obj)}
                              placeholder="Select or search item by code / name..."
                              searchPlaceholder="Type item code or name..."
                              idKey="id"
                              codeKey="item_code"
                              titleKey="item_name"
                              pageSize={15}
                              hasError={!!rowErr.item}
                            />
                          </div>
                          {rowErr.item && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#dc2626', fontSize: '0.74rem', marginTop: '3px' }}>
                              <AlertCircle size={12} /> <span>{rowErr.item}</span>
                            </div>
                          )}
                          {selectedItemObj && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>Code: <strong>{selectedItemObj.item_code}</strong></span>
                              {selectedItemObj.category_name && <span>• {selectedItemObj.category_name}</span>}
                              {selectedItemObj.current_rate && <span>• Master Rate: ₹{selectedItemObj.current_rate}</span>}
                            </div>
                          )}
                        </td>

                        {/* Quantity */}
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <input
                            type="number"
                            step="0.01"
                            value={row.qty}
                            onChange={(e) => handleRowFieldChange(idx, 'qty', e.target.value)}
                            placeholder="0.00"
                            style={{
                              width: '100%',
                              padding: '0.55rem 0.65rem',
                              borderRadius: '7px',
                              border: `1.5px solid ${rowErr.qty ? '#dc2626' : '#cbd5e1'}`,
                              backgroundColor: rowErr.qty ? '#fff5f5' : '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              boxSizing: 'border-box'
                            }}
                          />
                          {rowErr.qty && (
                            <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>
                              {rowErr.qty}
                            </div>
                          )}
                        </td>

                        {/* Unit Badge */}
                        <td style={{ textAlign: 'center', padding: '0.65rem 0.5rem' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase'
                          }}>
                            {row.unit || 'pcs'}
                          </span>
                        </td>

                        {/* Bill Unit Rate */}
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <input
                            type="number"
                            step="0.01"
                            value={row.bill_rate}
                            onChange={(e) => handleRowFieldChange(idx, 'bill_rate', e.target.value)}
                            onKeyDown={(e) => {
                              // If user presses Tab on last row, auto-create next row
                              if (e.key === 'Tab' && !e.shiftKey && idx === formData.items.length - 1) {
                                handleAddItemRow(1);
                              }
                            }}
                            placeholder="0.00"
                            style={{
                              width: '100%',
                              padding: '0.55rem 0.65rem',
                              borderRadius: '7px',
                              border: `1.5px solid ${rowErr.bill_rate ? '#dc2626' : '#cbd5e1'}`,
                              backgroundColor: rowErr.bill_rate ? '#fff5f5' : '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              boxSizing: 'border-box'
                            }}
                          />
                          {rowErr.bill_rate && (
                            <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>
                              {rowErr.bill_rate}
                            </div>
                          )}
                        </td>

                        {/* Line Total */}
                        <td style={{ textAlign: 'right', padding: '0.65rem 0.75rem', fontWeight: 800, color: '#16a34a', fontSize: '0.9rem' }}>
                          {row.total_amount ? `₹ ${Number(row.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₹ 0.00'}
                        </td>

                        {/* Actions (Remove Row) */}
                        <td style={{ textAlign: 'center', padding: '0.65rem 0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            disabled={formData.items.length === 1 && !row.item && !row.qty}
                            title="Remove this item row"
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '6px',
                              border: '1px solid #fee2e2',
                              backgroundColor: '#fff1f2',
                              color: '#dc2626',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 150ms ease'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Add Row Bar */}
            <div style={{
              padding: '0.65rem 1.25rem',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              borderBottomLeftRadius: '14px',
              borderBottomRightRadius: '14px'
            }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Tip: Press <kbd style={{ padding: '2px 5px', borderRadius: '4px', backgroundColor: '#e2e8f0', fontSize: '0.72rem', fontWeight: 700, color: '#0f172a' }}>Tab</kbd> on the last rate field to automatically add a new row
              </div>
            </div>
          </div>

          {/* SECTION 3: RECONCILIATION SUMMARY BAR (Matches Physical Invoice) */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '2px solid #bbf7d0',
            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={18} color="#0284c7" />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b', letterSpacing: '0.03em' }}>
                    Total Line Items
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {summaryTotals.filledItemsCount} of {summaryTotals.rowCount} rows
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={18} color="#ea580c" />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b', letterSpacing: '0.03em' }}>
                    Total Inward Quantity
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {Number(summaryTotals.totalQty).toLocaleString('en-IN')} units
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IndianRupee size={18} color="#16a34a" />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: '#16a34a', letterSpacing: '0.03em' }}>
                    Invoice Subtotal / Inward Total
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#166534' }}>
                    ₹ {Number(summaryTotals.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calculator size={15} color="#16a34a" />
              <span>Verify this total matches the paper invoice before confirming</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mat-in-action-btns" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e2e8f0'
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
                border: '1px solid #16a34a',
                backgroundColor: '#f0fdf4',
                color: '#166534',
                fontWeight: 650,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
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
                backgroundColor: '#16a34a',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.92rem',
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
              }}
            >
              <Save size={18} />
              <span>{submitting ? 'Recording Inward...' : `Confirm & Save All ${summaryTotals.filledItemsCount || ''} Items`}</span>
            </button>
          </div>

        </form>
      )}

      <UnsavedChangesModal
        isOpen={showExitModal}
        formLabel="Store Material In"
        onSaveDraft={handleSaveDraft}
        onDiscard={handleDiscardAndExit}
        onCancel={handleCancelExit}
      />

      {/* Floating Toast Notification */}
      {toastNotification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: toastNotification.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 500,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {toastNotification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{toastNotification.message}</span>
          <button
            onClick={() => setToastNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              marginLeft: '8px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Supplier Management CRUD Modal */}
      <SupplierManagerModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onUpdated={handleSupplierUpdated}
      />
    </div>
  );
}
