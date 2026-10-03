import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Save, AlertCircle, CheckCircle, Package, Plus, Trash2,
  Layers, IndianRupee, FileText, X, Info, ShieldAlert, Check
} from 'lucide-react';
import api from '../api/axios';
import SearchableSelect from '../components/SearchableSelect';
import { FormSkeleton } from '../components/TableSkeleton';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { UnsavedChangesModal } from '../components/UnsavedChangesModal';

const createEmptyIssueRow = (defaultUnit = 'pcs') => ({
  id: `row-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  item: '',
  qty: '',
  unit: defaultUnit,
  rate: '',
  status: 'charge', // 'charge' (Chargeable) or 'free' (Non-Chargeable)
  total_amount: '',
  remark: ''
});

// Auto-calculate month_year string (e.g. "Oct-26") from date string
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

export default function StoreDailyIssuePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const urlUnit = queryParams.get('unit') || '';
  const urlItem = queryParams.get('item') || '';
  const urlQty = queryParams.get('qty') || '';

  const initialIssueDate = new Date().toISOString().split('T')[0];

  const [items, setItems] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [persons, setPersons] = useState([]);
  const [units, setUnits] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [unitNotice, setUnitNotice] = useState(null);

  const [formData, setFormData] = useState({
    voucher_no: `VCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    issue_date: initialIssueDate,
    month_year: getMonthYearFromDate(initialIssueDate),
    contractor: '',
    contractor_person: '',
    contractor_person_name: '',
    production_unit: urlUnit || '',
    remark: '',
    items: [
      {
        ...createEmptyIssueRow(),
        item: urlItem || '',
        qty: urlQty || ''
      }
    ]
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [toastNotification, setToastNotification] = useState(null);

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
    formType: 'store_issue',
    formLabel: 'Daily Issue',
    getFormTitle: (data) => `Daily Issue - Vch ${data?.voucher_no || 'New'} (${data?.items?.length || 1} items)`,
    getFormData: () => formData,
    targetPath: '/store-management/daily-issue',
    onSaveForm: async () => {
      const formEl = document.getElementById('store-daily-issue-form');
      if (formEl) {
        formEl.requestSubmit();
        return true;
      }
      return false;
    }
  });

  // Restore drafts (both legacy single-item & multi-item drafts)
  useEffect(() => {
    if (location.state?.draftData) {
      const d = location.state.draftData;
      if (!d.items || !Array.isArray(d.items) || d.items.length === 0) {
        setFormData({
          voucher_no: d.voucher_no || `VCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          issue_date: d.issue_date || initialIssueDate,
          month_year: d.month_year || getMonthYearFromDate(d.issue_date || initialIssueDate),
          contractor: d.contractor || '',
          contractor_person: d.contractor_person || '',
          contractor_person_name: d.contractor_person_name || '',
          production_unit: d.production_unit || '',
          remark: d.remark || '',
          items: [
            {
              id: 'row-1',
              item: d.item || '',
              qty: d.qty || '',
              unit: d.unit || 'pcs',
              rate: d.rate || '',
              status: d.status || 'charge',
              total_amount: (!isNaN(parseFloat(d.qty)) && !isNaN(parseFloat(d.rate))) ? (parseFloat(d.qty) * parseFloat(d.rate)).toFixed(2) : '',
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
  }, [location.state, setCurrentDraftId, setIsDirty, initialIssueDate]);

  // Fetch items available for the selected factory unit
  const fetchItemsForUnit = useCallback(async (unitId) => {
    if (!unitId) {
      setItems([]);
      return;
    }
    setLoadingItems(true);
    try {
      const res = await api.get('/store/items/', {
        params: {
          production_unit: unitId,
          available_for_unit: true,
          nopage: true
        }
      });
      const unitItems = res.data.results || res.data || [];
      setItems(unitItems);
    } catch (err) {
      console.error('Failed to load items for unit:', err);
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  // Initial mount: load contractors, workers, units
  useEffect(() => {
    Promise.allSettled([
      api.get('/users/', { params: { role: 'contractor', nopage: true } }),
      api.get('/store/contractor-persons/', { params: { nopage: true } }),
      api.get('/production-units/', { params: { nopage: true, ordering: 'created_at' } })
    ])
      .then(([contrRes, persRes, unitRes]) => {
        const contrData = contrRes.status === 'fulfilled' ? (contrRes.value.data.results || contrRes.value.data || []) : [];
        const persData = persRes.status === 'fulfilled' ? (persRes.value.data.results || persRes.value.data || []) : [];
        const unitData = unitRes.status === 'fulfilled' ? (unitRes.value.data.results || unitRes.value.data || []) : [];

        // Sort units chronologically (oldest / first added first, e.g. Unit #1)
        const sortedUnits = [...unitData].sort((a, b) => {
          if (a.created_at && b.created_at) {
            const diff = new Date(a.created_at) - new Date(b.created_at);
            if (diff !== 0) return diff;
          }
          return String(a.unit_code || a.name || '').localeCompare(String(b.unit_code || b.name || ''), undefined, { numeric: true });
        });

        setContractors(contrData);
        setPersons(persData);
        setUnits(sortedUnits);

        const oldestUnitId = sortedUnits.length > 0 ? sortedUnits[0].id : '';
        const activeUnit = urlUnit || oldestUnitId;
        const defaultContractor = contrData.length > 0 ? contrData[0] : null;

        setFormData(prev => ({
          ...prev,
          production_unit: prev.production_unit || activeUnit,
          contractor: defaultContractor ? defaultContractor.id : prev.contractor
        }));

        if (activeUnit) {
          fetchItemsForUnit(activeUnit);
        }
      })
      .catch(err => console.error('Failed to load daily issue initial data:', err))
      .finally(() => setLoadingData(false));
  }, [fetchItemsForUnit, urlUnit]);

  // Handle header field changes
  const handleHeaderFieldChange = (field, val) => {
    setIsDirty(true);
    setFormData(prev => ({ ...prev, [field]: val }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
    if (error) setError(null);
  };

  const handleDateChange = (val) => {
    setIsDirty(true);
    setFormData(prev => ({
      ...prev,
      issue_date: val,
      month_year: getMonthYearFromDate(val)
    }));
    if (formErrors.issue_date) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.issue_date;
        return copy;
      });
    }
    if (error) setError(null);
  };

  const handleUnitChange = (newUnitId) => {
    setIsDirty(true);
    setUnitNotice(null);
    setFormData(prev => ({ ...prev, production_unit: newUnitId }));
    fetchItemsForUnit(newUnitId);
    if (formErrors.production_unit) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy.production_unit;
        return copy;
      });
    }
  };

  // Row Manipulation
  const handleAddItemRow = (count = 1) => {
    setIsDirty(true);
    setFormData(prev => {
      const newRows = Array.from({ length: count }, () => createEmptyIssueRow());
      return {
        ...prev,
        items: [...prev.items, ...newRows]
      };
    });
  };

  const handleRemoveItemRow = (idx) => {
    setIsDirty(true);
    setFormData(prev => {
      if (prev.items.length <= 1) {
        return {
          ...prev,
          items: [createEmptyIssueRow()]
        };
      }
      const updated = prev.items.filter((_, i) => i !== idx);
      return { ...prev, items: updated };
    });

    if (formErrors.rowErrors && formErrors.rowErrors[idx]) {
      setFormErrors(prev => {
        const newRowErrors = { ...prev.rowErrors };
        delete newRowErrors[idx];
        return { ...prev, rowErrors: newRowErrors };
      });
    }
  };

  const handleRowFieldChange = (idx, field, val) => {
    setIsDirty(true);
    setFormData(prev => {
      const updated = [...prev.items];
      const target = { ...updated[idx], [field]: val };

      // Recalculate line total if qty or rate changed
      if (field === 'qty' || field === 'rate') {
        const q = parseFloat(field === 'qty' ? val : target.qty) || 0;
        const r = parseFloat(field === 'rate' ? val : target.rate) || 0;
        target.total_amount = (q * r).toFixed(2);
      }

      updated[idx] = target;
      return { ...prev, items: updated };
    });

    if (formErrors.rowErrors?.[idx]?.[field]) {
      setFormErrors(prev => {
        const rowErrCopy = { ...prev.rowErrors?.[idx] };
        delete rowErrCopy[field];
        return {
          ...prev,
          rowErrors: {
            ...prev.rowErrors,
            [idx]: rowErrCopy
          }
        };
      });
    }
    if (error) setError(null);
  };

  const handleRowItemChange = (idx, selectedItemId, itemObj) => {
    setIsDirty(true);
    setFormData(prev => {
      const updated = [...prev.items];
      const target = { ...updated[idx] };

      target.item = selectedItemId;
      if (itemObj) {
        target.unit = itemObj.unit || 'pcs';
        target.rate = itemObj.current_rate || itemObj.base_rate || '';
        target.status = itemObj.default_status || 'charge';

        const q = parseFloat(target.qty) || 0;
        const r = parseFloat(target.rate) || 0;
        target.total_amount = (q * r).toFixed(2);
      } else {
        target.unit = 'pcs';
        target.rate = '';
        target.total_amount = '';
      }

      updated[idx] = target;
      return { ...prev, items: updated };
    });

    if (formErrors.rowErrors?.[idx]?.item) {
      setFormErrors(prev => {
        const rowErrCopy = { ...prev.rowErrors?.[idx] };
        delete rowErrCopy.item;
        return {
          ...prev,
          rowErrors: {
            ...prev.rowErrors,
            [idx]: rowErrCopy
          }
        };
      });
    }
    if (error) setError(null);
  };

  // Live Reconciliation Computations
  const summaryTotals = useMemo(() => {
    let totalItems = 0;
    let totalQty = 0;
    let totalChargeable = 0;
    let totalNonChargeable = 0;
    let grandTotal = 0;

    formData.items.forEach(row => {
      const q = parseFloat(row.qty) || 0;
      const r = parseFloat(row.rate) || 0;
      const amt = q * r;

      if (row.item || q > 0) {
        totalItems += 1;
      }
      totalQty += q;
      grandTotal += amt;

      if (row.status === 'charge') {
        totalChargeable += amt;
      } else {
        totalNonChargeable += amt;
      }
    });

    return {
      totalItems,
      totalQty: totalQty.toFixed(2),
      totalChargeable: totalChargeable.toFixed(2),
      totalNonChargeable: totalNonChargeable.toFixed(2),
      grandTotal: grandTotal.toFixed(2)
    };
  }, [formData.items]);

  // Form Validation
  const validateForm = () => {
    const errors = {};
    const rowErrors = {};
    let hasRowErrors = false;

    if (!formData.contractor) {
      errors.contractor = 'Target Contractor / Supervisor is required.';
    }

    if (!formData.production_unit) {
      errors.production_unit = 'Factory Unit / Workshop is required.';
    }

    if (!formData.issue_date) {
      errors.issue_date = 'Issue date is required.';
    }

    if (!formData.items || formData.items.length === 0) {
      errors.items = 'Please add at least one material to issue.';
    }

    const accumulatedQtyPerItem = {};

    formData.items.forEach((row, idx) => {
      const rErr = {};
      const itemObj = items.find(i => String(i.id) === String(row.item));

      if (!row.item) {
        rErr.item = 'Store item is required.';
      }

      if (!row.qty || String(row.qty).trim() === '') {
        rErr.qty = 'Quantity is required.';
      } else {
        const q = parseFloat(row.qty);
        if (isNaN(q) || q <= 0) {
          rErr.qty = 'Quantity must be greater than 0.';
        } else if (q > 10000000) {
          rErr.qty = 'Quantity exceeds maximum limit (10,000,000).';
        } else if (itemObj) {
          const prevTotal = accumulatedQtyPerItem[row.item] || 0;
          const newTotal = prevTotal + q;
          accumulatedQtyPerItem[row.item] = newTotal;

          const unitBal = parseFloat(itemObj.unit_balance_stock_qty !== undefined ? itemObj.unit_balance_stock_qty : (itemObj.balance_stock_qty || 0));
          if (newTotal > unitBal) {
            rErr.qty = `Insufficient balance. Available: ${unitBal} ${itemObj.unit || row.unit}, Total Requested: ${newTotal}`;
          }
        }
      }

      if (row.rate !== '' && row.rate !== null && row.rate !== undefined) {
        const r = parseFloat(row.rate);
        if (isNaN(r) || r < 0) {
          rErr.rate = 'Rate cannot be negative.';
        }
      }

      if (Object.keys(rErr).length > 0) {
        rowErrors[idx] = rErr;
        hasRowErrors = true;
      }
    });

    if (hasRowErrors) {
      errors.rowErrors = rowErrors;
    }

    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const clientErrors = validateForm();

    if (Object.keys(clientErrors).length > 0) {
      setFormErrors(clientErrors);
      let firstMsg = clientErrors.contractor || clientErrors.production_unit || clientErrors.issue_date || clientErrors.items;
      if (!firstMsg && clientErrors.rowErrors) {
        const firstRowErr = Object.values(clientErrors.rowErrors)[0];
        firstMsg = Object.values(firstRowErr)[0];
      }
      setError(firstMsg || 'Please correct the highlighted errors before confirming issue.');
      setToastNotification({
        type: 'error',
        message: firstMsg || 'Validation failed. Check highlighted fields.'
      });
      return;
    }

    setSubmitting(true);
    setError(null);
    setFormErrors({});

    const selectedUnitObj = units.find(u => String(u.id) === String(formData.production_unit));
    const selectedContractorObj = contractors.find(c => String(c.id) === String(formData.contractor));
    const contractorLabel = formData.contractor_person_name || selectedContractorObj?.full_name || selectedContractorObj?.username || 'Contractor';

    const payload = {
      voucher_no: formData.voucher_no,
      issue_date: formData.issue_date,
      month_year: formData.month_year,
      contractor: formData.contractor,
      contractor_person: formData.contractor_person || null,
      contractor_person_name: formData.contractor_person_name || '',
      production_unit: formData.production_unit,
      remark: formData.remark,
      items: formData.items.map(r => ({
        item: r.item,
        qty: parseFloat(r.qty),
        unit: r.unit || 'pcs',
        rate: parseFloat(r.rate || 0),
        status: r.status || 'charge',
        remark: r.remark || ''
      }))
    };

    api.post('/store/daily-issues/bulk-issue/', payload)
      .then((res) => {
        if (currentDraftId) clearDraft(currentDraftId);
        setIsDirty(false);
        const count = res.data?.total_items || formData.items.length;
        setSuccessMsg(`Outward Issue Recorded! Successfully issued ${count} items to ${contractorLabel} at ${selectedUnitObj?.name || 'unit'}.`);
        setToastNotification({
          type: 'success',
          message: `Issued ${count} items successfully!`
        });
        setTimeout(() => navigate('/store-management'), 1300);
      })
      .catch(err => {
        console.error('Multi-item issue save failed:', err);
        const data = err.response?.data;
        if (data && typeof data === 'object') {
          setFormErrors(data);
          let firstErr = data.detail || data.contractor || data.production_unit || data.issue_date || data.items;
          if (!firstErr && data.row_errors) {
            const firstR = data.row_errors.find(r => r && Object.keys(r).length > 0);
            if (firstR) firstErr = Object.values(firstR)[0];
          }
          setError(firstErr || 'Failed to record store daily issue.');
          setToastNotification({
            type: 'error',
            message: firstErr || 'Validation failed. Check highlighted fields.'
          });
        } else {
          setError(err.message || 'Server error while recording outward issue.');
          setToastNotification({
            type: 'error',
            message: err.message || 'Server error occurred.'
          });
        }
      })
      .finally(() => setSubmitting(false));
  };

  const selectedUnitName = units.find(u => String(u.id) === String(formData.production_unit))?.name || 'Factory Unit';

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)', paddingBottom: '140px' }}>
      <style>{`
        .item-row:hover {
          background-color: #fafaf9;
        }
        .btn-add-row:hover {
          background-color: #f1f5f9 !important;
          border-color: #94a3b8 !important;
        }
        @media (max-width: 900px) {
          .issue-header-grid {
            grid-template-columns: 1fr !important;
          }
          .reconcile-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 1rem !important;
          }
          .reconcile-actions {
            width: 100% !important;
            justify-content: stretch !important;
          }
          .reconcile-actions button {
            flex: 1 !important;
            justify-content: center !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
            title="Back to Store Management"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Stock Outward • Multi-Item Counter Entry
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
              Daily Issue Entry (Contractor Material Outward)
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
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          color: '#991b1b',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          color: '#166534',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem'
        }}>
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {loadingData ? (
        <FormSkeleton fields={8} />
      ) : (
        <form id="store-daily-issue-form" onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* SECTION 1: ISSUE HEADER CARD */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
                <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} color="#ea580c" />
                  <span>1. Contractor & Issue Details</span>
                </h2>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Shared for all {formData.items.length} items issued below
                </span>
              </div>

              <div className="issue-header-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {/* Voucher No */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Voucher No / Base Ref
                  </label>
                  <input
                    type="text"
                    value={formData.voucher_no}
                    onChange={(e) => handleHeaderFieldChange('voucher_no', e.target.value)}
                    placeholder="e.g. VCH-2026-1024"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      backgroundColor: '#f8fafc',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Issue Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: formErrors.issue_date ? '#dc2626' : '#334155', marginBottom: '5px' }}>
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: formErrors.issue_date ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: formErrors.issue_date ? '#fff5f5' : '#ffffff',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  {formErrors.issue_date && (
                    <div style={{ color: '#dc2626', fontSize: '0.74rem', marginTop: '3px' }}>
                      {formErrors.issue_date}
                    </div>
                  )}
                </div>

                {/* Factory Unit / Workshop */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: formErrors.production_unit ? '#dc2626' : '#ea580c', marginBottom: '5px' }}>
                    <span>Factory Unit / Workshop *</span>
                    <span style={{ fontSize: '0.7rem', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                      Stock Source
                    </span>
                  </label>
                  <select
                    value={formData.production_unit}
                    onChange={(e) => handleUnitChange(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: formErrors.production_unit ? '2px solid #dc2626' : '2px solid #fdba74',
                      backgroundColor: formErrors.production_unit ? '#fff5f5' : '#fffaf5',
                      color: formErrors.production_unit ? '#dc2626' : '#9a3412',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- Select Factory Unit --</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  {formErrors.production_unit && (
                    <div style={{ color: '#dc2626', fontSize: '0.74rem', marginTop: '3px' }}>
                      {formErrors.production_unit}
                    </div>
                  )}
                </div>

                {/* Billing Month/Year */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '5px' }}>
                    Billing Month / Year
                  </label>
                  <input
                    type="text"
                    value={formData.month_year}
                    readOnly
                    disabled
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      boxSizing: 'border-box',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
              </div>

              {/* Contractor & Delegate Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                {/* Target Contractor */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: formErrors.contractor ? '#dc2626' : '#334155', marginBottom: '5px' }}>
                    Target Contractor / Supervisor *
                  </label>
                  <SearchableSelect
                    options={contractors.map(c => ({ ...c, name: c.full_name || c.username }))}
                    value={formData.contractor}
                    onChange={(val) => handleHeaderFieldChange('contractor', val)}
                    placeholder="Select Contractor / Supervisor..."
                    searchPlaceholder="Search contractor name..."
                    idKey="id"
                    titleKey="name"
                    pageSize={15}
                    hasError={Boolean(formErrors.contractor)}
                  />
                  {formErrors.contractor && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.74rem', marginTop: '3px' }}>
                      <AlertCircle size={12} />
                      <span>{formErrors.contractor}</span>
                    </div>
                  )}
                </div>

                {/* Authorized Worker / Delegate */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Authorized Worker / Delegate (Optional)
                  </label>
                  <input
                    type="text"
                    id="authorized-worker-input"
                    value={formData.contractor_person_name || ''}
                    onChange={(e) => handleHeaderFieldChange('contractor_person_name', e.target.value)}
                    placeholder="Enter worker or delegate name (e.g. Raju - worker Dinesh)..."
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      fontSize: '0.85rem',
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Issue Purpose / Note */}
                <div style={{ gridColumn: 'span 1' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Issue Purpose / Production Note
                  </label>
                  <input
                    type="text"
                    value={formData.remark}
                    onChange={(e) => handleHeaderFieldChange('remark', e.target.value)}
                    placeholder="e.g. Issued for Dining Chairs order #204 / Project requirement"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Unit Notice */}
              {unitNotice && (
                <div style={{
                  marginTop: '0.75rem',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  color: '#1e40af',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Info size={16} style={{ flexShrink: 0 }} />
                  <span>{unitNotice}</span>
                </div>
              )}
            </div>

            {/* SECTION 2: LINE ITEMS GRID */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{
                padding: '0.85rem 1.25rem',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                borderTopLeftRadius: '14px',
                borderTopRightRadius: '14px'
              }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package size={16} color="#ea580c" />
                    <span>2. Issued Materials List ({formData.items.length} {formData.items.length === 1 ? 'Item' : 'Items'})</span>
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Showing items with stock received in <strong>{selectedUnitName}</strong>
                  </span>
                </div>

                {/* Quick Add Buttons */}
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
                    <Plus size={14} color="#ea580c" />
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
                      <th style={{ width: '130px', padding: '0.75rem 0.75rem', textAlign: 'left', fontWeight: 700, fontSize: '0.8rem' }}>Issue Qty *</th>
                      <th style={{ width: '80px', padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem' }}>Unit</th>
                      <th style={{ width: '160px', padding: '0.75rem 0.75rem', textAlign: 'left', fontWeight: 700, fontSize: '0.8rem' }}>Charge Status</th>
                      <th style={{ width: '130px', padding: '0.75rem 0.75rem', textAlign: 'left', fontWeight: 700, fontSize: '0.8rem' }}>Rate (₹)</th>
                      <th style={{ width: '140px', padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: 700, fontSize: '0.8rem' }}>Line Total (₹)</th>
                      <th style={{ width: '50px', padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem' }}>Act</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((row, idx) => {
                      const rowErr = formErrors.rowErrors?.[idx] || {};
                      const selectedItemObj = items.find(i => String(i.id) === String(row.item));
                      const unitBal = selectedItemObj ? (selectedItemObj.unit_balance_stock_qty !== undefined ? selectedItemObj.unit_balance_stock_qty : (selectedItemObj.balance_stock_qty || 0)) : null;

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
                                placeholder={loadingItems ? "Loading items for this unit..." : "Select store item with available stock..."}
                                searchPlaceholder="Type item code or name..."
                                idKey="id"
                                codeKey="item_code"
                                titleKey="item_name"
                                pageSize={15}
                                hasError={Boolean(rowErr.item)}
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
                                {unitBal !== null && (
                                  <span style={{
                                    fontWeight: 700,
                                    color: unitBal > (selectedItemObj.reorder_level || 0) ? '#166534' : '#b45309'
                                  }}>
                                    • Stock in {selectedUnitName}: {unitBal} {selectedItemObj.unit}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Issue Qty */}
                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            <input
                              type="number"
                              step="0.01"
                              value={row.qty}
                              onChange={(e) => handleRowFieldChange(idx, 'qty', e.target.value)}
                              placeholder={unitBal !== null ? `Max: ${unitBal}` : "0.00"}
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

                          {/* Charge Status */}
                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            <select
                              value={row.status || 'charge'}
                              onChange={(e) => handleRowFieldChange(idx, 'status', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.55rem 0.65rem',
                                borderRadius: '7px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: row.status === 'charge' ? '#fffaf5' : '#f0fdf4',
                                color: row.status === 'charge' ? '#ea580c' : '#166534',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                boxSizing: 'border-box',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="charge">Chargeable (Debit)</option>
                              <option value="free">Free (Company Store)</option>
                            </select>
                          </td>

                          {/* Rate */}
                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            <input
                              type="number"
                              step="0.01"
                              value={row.rate}
                              onChange={(e) => handleRowFieldChange(idx, 'rate', e.target.value)}
                              onKeyDown={(e) => {
                                // If Tab on last row's rate, auto-create next row
                                if (e.key === 'Tab' && !e.shiftKey && idx === formData.items.length - 1) {
                                  handleAddItemRow(1);
                                }
                              }}
                              placeholder="0.00"
                              style={{
                                width: '100%',
                                padding: '0.55rem 0.65rem',
                                borderRadius: '7px',
                                border: `1.5px solid ${rowErr.rate ? '#dc2626' : '#cbd5e1'}`,
                                backgroundColor: rowErr.rate ? '#fff5f5' : '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                boxSizing: 'border-box'
                              }}
                            />
                            {rowErr.rate && (
                              <div style={{ color: '#dc2626', fontSize: '0.72rem', marginTop: '2px' }}>
                                {rowErr.rate}
                              </div>
                            )}
                          </td>

                          {/* Line Total */}
                          <td style={{ textAlign: 'right', padding: '0.65rem 0.75rem', fontWeight: 800, fontSize: '0.9rem' }}>
                            {row.total_amount ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ color: row.status === 'charge' ? '#ea580c' : '#166534' }}>
                                  ₹ {Number(row.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: row.status === 'charge' ? '#9a3412' : '#166534' }}>
                                  {row.status === 'charge' ? 'Debit' : 'Free / Store'}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>₹ 0.00</span>
                            )}
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
                  Tip: Press <kbd style={{ padding: '2px 5px', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#0f172a', fontWeight: 700, fontSize: '0.72rem' }}>Tab</kbd> on the last rate field to automatically add a new row
                </div>
              </div>
            </div>

          </div>

          {/* STICKY LIVE RECONCILIATION SUMMARY BAR */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            borderTop: '1.5px solid #e2e8f0',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
            padding: '0.85rem 1.5rem',
            zIndex: 900
          }}>
            <div style={{
              maxWidth: '1440px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              {/* Left: Summary Metrics */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Items Issued</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    {summaryTotals.totalItems} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>lines</span>
                  </div>
                </div>

                <div style={{ width: '1px', height: '32px', backgroundColor: '#e2e8f0' }} />

                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Quantity</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    {summaryTotals.totalQty} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>units</span>
                  </div>
                </div>

                <div style={{ width: '1px', height: '32px', backgroundColor: '#e2e8f0' }} />

                <div>
                  <div style={{ fontSize: '0.72rem', color: '#ea580c', fontWeight: 700, textTransform: 'uppercase' }}>Chargeable (Debit)</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ea580c' }}>
                    ₹ {Number(summaryTotals.totalChargeable).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ width: '1px', height: '32px', backgroundColor: '#e2e8f0' }} />

                <div>
                  <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>Free / Store Expense</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#166534' }}>
                    ₹ {Number(summaryTotals.totalNonChargeable).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ width: '1px', height: '32px', backgroundColor: '#e2e8f0' }} />

                <div>
                  <div style={{ fontSize: '0.72rem', color: '#0f172a', fontWeight: 700, textTransform: 'uppercase' }}>Grand Value</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    ₹ {Number(summaryTotals.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmExit('/store-management')) navigate('/store-management');
                  }}
                  style={{
                    padding: '0.6rem 1.15rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontWeight: 650,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDraft()}
                  style={{
                    padding: '0.6rem 1.15rem',
                    borderRadius: '8px',
                    border: '1px solid #ea580c',
                    backgroundColor: '#fff7ed',
                    color: '#c2410c',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <FileText size={15} />
                  <span>Save Draft</span>
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    fontWeight: 750,
                    fontSize: '0.9rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.75 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(234, 88, 12, 0.28)'
                  }}
                >
                  <Save size={16} />
                  <span>{submitting ? 'Recording Outward Issue...' : `Confirm & Issue ${formData.items.length} Items`}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      <UnsavedChangesModal
        isOpen={showExitModal}
        formLabel="Daily Issue"
        onSaveDraft={handleSaveDraft}
        onDiscard={handleDiscardAndExit}
        onCancel={handleCancelExit}
      />

      {/* Floating Toast Notification */}
      {toastNotification && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
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
          fontSize: '0.88rem'
        }}>
          {toastNotification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span style={{ flex: 1 }}>{toastNotification.message}</span>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px' }}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
