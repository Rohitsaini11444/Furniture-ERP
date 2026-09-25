import React, { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  Search, Download, Plus, ArrowLeft, ChevronRight, Package, Warehouse,
  Tag, CheckCircle2, AlertCircle, Building2, Factory, Wrench, Palette,
  PackageCheck, ClipboardCheck, Boxes, Layers, RefreshCw, CheckCircle,
  XCircle, Clock, User, Users, AlertTriangle, ArrowRight, X, FileText, ChevronDown,
  Edit3, Trash2, RotateCcw, Sparkles
} from 'lucide-react';
import Pagination from '../components/Pagination';
import { TableSkeleton, CardSkeleton } from '../components/TableSkeleton';
import { OrderBySelect, ORDER_OPTIONS_DATE_QTY } from '../components/OrderBySelect';
import { StatusSelect, STOCK_STATUS_FILTER_OPTIONS, STOCK_STATUS_FORM_OPTIONS } from '../components/StatusSelect';
import CustomSelect from '../components/CustomSelect';
import StockOriginModal from '../components/StockOriginModal';
import { useAuth } from '../context/AuthContext';

function Stock() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core Data State
  const [stockItems, setStockItems] = useState([]);
  const [productionJobs, setProductionJobs] = useState([]);
  const [units, setUnits] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active View Tabs & Unit Filters
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'sanding' | 'polishing' | 'packaging' | 'qc'
  const [selectedUnitId, setSelectedUnitId] = useState('all');

  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  
  // Selection & Pagination
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal State for Add/Edit Stock
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toastNotification, setToastNotification] = useState(null);

  // Stock Origin Drill-Down Modal state
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [activeStageKey, setActiveStageKey] = useState('raw');
  const [activeStageTitle, setActiveStageTitle] = useState('Raw Stock');

  // Sliding Indicator State for Factory Units & Stock Navigation
  const unitTabRefs = React.useRef({});
  const [unitIndicatorStyle, setUnitIndicatorStyle] = useState({ opacity: 0 });

  const navTabRefs = React.useRef({});
  const [navIndicatorStyle, setNavIndicatorStyle] = useState({ opacity: 0 });

  // Measure active Factory Unit tab position
  useLayoutEffect(() => {
    const activeEl = unitTabRefs.current[selectedUnitId];
    if (activeEl) {
      setUnitIndicatorStyle({
        width: `${activeEl.offsetWidth}px`,
        transform: `translate3d(${activeEl.offsetLeft}px, ${activeEl.offsetTop}px, 0)`,
        height: `${activeEl.offsetHeight}px`,
        opacity: 1
      });
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedUnitId, units, stockItems]);

  // Measure active Stock Navigation sub-tab position
  useLayoutEffect(() => {
    const activeEl = navTabRefs.current[activeTab];
    if (activeEl) {
      setNavIndicatorStyle({
        width: `${activeEl.offsetWidth}px`,
        transform: `translate3d(${activeEl.offsetLeft}px, 0, 0)`,
        opacity: 1
      });
    }
  }, [activeTab]);
 
  useEffect(() => {
    const handleResize = () => {
      const activeUnitEl = unitTabRefs.current[selectedUnitId];
      if (activeUnitEl) {
        setUnitIndicatorStyle({
          width: `${activeUnitEl.offsetWidth}px`,
          transform: `translate3d(${activeUnitEl.offsetLeft}px, ${activeUnitEl.offsetTop}px, 0)`,
          height: `${activeUnitEl.offsetHeight}px`,
          opacity: 1
        });
      }
      const activeNavEl = navTabRefs.current[activeTab];
      if (activeNavEl) {
        setNavIndicatorStyle({
          width: `${activeNavEl.offsetWidth}px`,
          transform: `translate3d(${activeNavEl.offsetLeft}px, 0, 0)`,
          opacity: 1
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedUnitId, activeTab]);

  // Modal State for Stage Batch Job Assignment
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    stage: 'sanding',
    stock_item: '',
    contractor: '',
    assigned_qty: '',
    contractor_notes: ''
  });

  // Modal State for QC Inspection
  const [showQCModal, setShowQCModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [qcForm, setQCForm] = useState({
    passed_qty: '',
    rejected_qty: 0,
    notes: ''
  });

  const isSupervisor = user?.role === 'admin' || user?.role === 'supervisor';

  const emptyForm = {
    style_no: '',
    item_name: '',
    quantity: '',
    unit: 'pcs',
    unit_price: '',
    location: 'Main Store',
    status: 'In Stock',
    buyer: '',
    sample: '',
    remarks: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  // ── Unified Data Fetching ──
  const fetchData = useCallback(() => {
    setLoading(true);
    const params = {
      page: currentPage,
      ordering: ordering,
    };
    if (searchTerm) params.search = searchTerm;
    if (statusFilter) params.status = statusFilter;
    if (buyerFilter) params.buyer = buyerFilter;

    Promise.all([
      api.get('/stock/', { params }),
      api.get('/production-units/')
    ])
      .then(([stockRes, unitRes]) => {
        const sData = stockRes.data.results || stockRes.data || [];
        setStockItems(sData);
        if (stockRes.data.count !== undefined) {
          setTotalPages(Math.ceil(stockRes.data.count / itemsPerPage));
        } else {
          setTotalPages(1);
        }

        const uData = unitRes.data.results || unitRes.data || [];
        setUnits(uData);

        // Fetch modal options in background (non-blocking)
        Promise.allSettled([
          api.get('/buyers/', { params: { nopage: true } }),
          api.get('/samples/dropdown/'),
          isSupervisor ? api.get('/users/', { params: { role: 'contractor', nopage: true } }) : Promise.resolve({ data: [] })
        ]).then(([bRes, smpRes, conRes]) => {
          if (bRes.status === 'fulfilled') setBuyers(bRes.value.data.results || bRes.value.data || []);
          if (smpRes.status === 'fulfilled') setSamples(smpRes.value.data.results || smpRes.value.data || []);
          if (conRes.status === 'fulfilled') setContractors(conRes.value.data.results || conRes.value.data || []);
        });
      })
      .catch(err => console.error('Failed to fetch merged stock data:', err))
      .finally(() => setLoading(false));
  }, [currentPage, ordering, statusFilter, buyerFilter, isSupervisor, searchTerm, itemsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, buyerFilter, ordering]);

  // Unit-filtered items
  const unitFilteredStock = selectedUnitId === 'all'
    ? stockItems
    : stockItems.filter(s => s.production_unit === selectedUnitId);

  const unitFilteredJobs = selectedUnitId === 'all'
    ? productionJobs
    : productionJobs.filter(j => j.production_unit === selectedUnitId);

  // Live Stage Totals
  const rawStockTotal = unitFilteredStock.filter(s => s.stock_type === 'raw').reduce((acc, curr) => acc + (parseFloat(curr.quantity) || 0), 0);
  const sandedStockTotal = unitFilteredStock.filter(s => s.stock_type === 'sanded').reduce((acc, curr) => acc + (parseFloat(curr.quantity) || 0), 0);
  const polishedStockTotal = unitFilteredStock.filter(s => s.stock_type === 'polished').reduce((acc, curr) => acc + (parseFloat(curr.quantity) || 0), 0);
  const packagedStockTotal = unitFilteredStock.filter(s => s.stock_type === 'packaged').reduce((acc, curr) => acc + (parseFloat(curr.quantity) || 0), 0);

  // Overall Stock Summary
  const totalStockItemsCount = unitFilteredStock.length;
  const totalPassedQuantity = unitFilteredStock.reduce((acc, i) => acc + (parseFloat(i.quantity) || 0), 0);
  const estimatedStockValue = unitFilteredStock.reduce((acc, i) => acc + ((parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0)), 0);

  const openStageModal = (key, title) => {
    setActiveStageKey(key);
    setActiveStageTitle(title);
    setShowOriginModal(true);
  };

  const handleDownloadExcel = () => {
    api.get('/stock/export-excel/', { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Inventory_Stock.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('Failed to export excel', err);
        alert('Failed to download Stock Excel. Please try again.');
      });
  };

  // ── Stage Batch Job Assignment Handlers ──
  const handleOpenAssignModal = (stage = 'sanding', defaultStock = null) => {
    const defaultStockId = defaultStock ? defaultStock.id : (unitFilteredStock.length > 0 ? unitFilteredStock[0].id : '');
    setAssignForm({
      stage: stage,
      stock_item: defaultStockId,
      contractor: contractors.length > 0 ? contractors[0].id : '',
      assigned_qty: defaultStock ? defaultStock.quantity : '',
      contractor_notes: ''
    });
    setShowAssignModal(true);
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    const sourceStock = stockItems.find(s => s.id === assignForm.stock_item);
    if (!sourceStock) return alert('Please select a valid source stock item.');
    if (parseFloat(assignForm.assigned_qty) > parseFloat(sourceStock.quantity)) {
      return alert(`Insufficient stock. Max available: ${sourceStock.quantity} ${sourceStock.unit}`);
    }

    const payload = {
      stage: assignForm.stage,
      stock_item: sourceStock.id,
      style_no: sourceStock.style_no,
      item_name: sourceStock.item_name,
      contractor: assignForm.contractor,
      assigned_qty: assignForm.assigned_qty,
      unit: sourceStock.unit,
      buyer_master: sourceStock.buyer_master,
      sample: sourceStock.sample,
      buyer: sourceStock.buyer,
      contractor_notes: assignForm.contractor_notes
    };

    api.post('/production-jobs/', payload)
      .then(() => {
        setShowAssignModal(false);
        fetchData();
      })
      .catch(err => {
        alert(err.response?.data?.detail || err.response?.data?.assigned_qty?.[0] || 'Assignment failed.');
      });
  };

  // ── Quality Check & Contractor Inspection Handlers ──
  const handleRequestQC = (jobId) => {
    const notes = prompt('Enter work completion notes for supervisor inspection (optional):') || '';
    api.post(`/production-jobs/${jobId}/request-qc/`, { contractor_notes: notes })
      .then(() => fetchData())
      .catch(err => alert(err.response?.data?.detail || 'Request failed.'));
  };

  const handleOpenQCModal = (job) => {
    setSelectedJob(job);
    const remainingToInspect = Math.max(0, parseFloat(job.assigned_qty || 0) - parseFloat(job.passed_qty || 0));
    setQCForm({
      passed_qty: remainingToInspect,
      rejected_qty: 0,
      notes: ''
    });
    setShowQCModal(true);
  };

  const handleQCSubmit = (e) => {
    e.preventDefault();
    if (!selectedJob) return;

    const pass = parseFloat(qcForm.passed_qty) || 0;
    const rej = parseFloat(qcForm.rejected_qty) || 0;
    const currentPassed = parseFloat(selectedJob.passed_qty || 0);
    const assigned = parseFloat(selectedJob.assigned_qty || 0);

    if (pass + rej <= 0) return alert('Please enter valid passed or rejected quantities.');
    if ((currentPassed + pass + rej) > assigned) {
      return alert(`Total passed (${currentPassed + pass}) + rejected (${rej}) cannot exceed assigned quantity (${assigned}).`);
    }

    api.post(`/production-jobs/${selectedJob.id}/perform-qc/`, {
      passed_qty: pass,
      rejected_qty: rej,
      notes: qcForm.notes
    })
      .then(() => {
        setShowQCModal(false);
        fetchData();
      })
      .catch(err => alert(err.response?.data?.detail || 'QC failed.'));
  };

  // Stock Add/Edit Form Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name] || errors.general) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        const remaining = Object.keys(next).filter(k => k !== 'general');
        if (remaining.length === 0) {
          delete next.general;
        }
        return next;
      });
    }
  };

  const openCreateModal = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setErrors({});
    setSubmitting(false);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setFormData({
      style_no: item.style_no || '',
      item_name: item.item_name || '',
      quantity: item.quantity !== undefined && item.quantity !== null ? item.quantity : '',
      unit: item.unit || 'pcs',
      unit_price: item.unit_price !== undefined && item.unit_price !== null ? item.unit_price : '',
      location: item.location || 'Main Store',
      status: item.status || 'In Stock',
      buyer: item.buyer || '',
      sample: item.sample || '',
      remarks: item.remarks || '',
    });
    setEditingId(item.id);
    setErrors({});
    setSubmitting(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(emptyForm);
    setErrors({});
    setSubmitting(false);
  };

  const validateForm = () => {
    const errs = {};

    // Style No
    if (!formData.style_no || !formData.style_no.trim()) {
      errs.style_no = 'Style No. is required.';
    } else if (formData.style_no.trim().length > 100) {
      errs.style_no = 'Style No. cannot exceed 100 characters.';
    }

    // Item Name
    if (!formData.item_name || !formData.item_name.trim()) {
      errs.item_name = 'Item / Product Name is required.';
    } else if (formData.item_name.trim().length > 255) {
      errs.item_name = 'Item / Product Name cannot exceed 255 characters.';
    }

    // Stock Quantity
    const qtyStr = formData.quantity !== null && formData.quantity !== undefined ? String(formData.quantity).trim() : '';
    if (!qtyStr) {
      errs.quantity = 'Stock quantity is required.';
    } else {
      const qtyNum = Number(qtyStr);
      if (isNaN(qtyNum)) {
        errs.quantity = 'Stock quantity must be a valid number.';
      } else if (qtyNum < 0) {
        errs.quantity = 'Stock quantity cannot be negative.';
      } else {
        const parts = qtyStr.split('.');
        const wholeDigits = parts[0].replace('-', '');
        const decimalDigits = parts[1] || '';
        if (wholeDigits.length > 10) {
          errs.quantity = 'Quantity cannot exceed 10 digits before decimal (max 9,999,999,999.99).';
        } else if (decimalDigits.length > 2) {
          errs.quantity = 'Quantity cannot have more than 2 decimal places.';
        } else if (wholeDigits.length + decimalDigits.length > 12) {
          errs.quantity = 'Quantity cannot exceed 12 digits in total.';
        }
      }
    }

    // Unit
    if (!formData.unit || !formData.unit.trim()) {
      errs.unit = 'Unit is required (e.g. pcs, set, kg).';
    } else if (formData.unit.trim().length > 30) {
      errs.unit = 'Unit cannot exceed 30 characters.';
    }

    // Unit Price (optional)
    const priceStr = formData.unit_price !== null && formData.unit_price !== undefined ? String(formData.unit_price).trim() : '';
    if (priceStr) {
      const priceNum = Number(priceStr);
      if (isNaN(priceNum)) {
        errs.unit_price = 'Unit price must be a valid number.';
      } else if (priceNum < 0) {
        errs.unit_price = 'Unit price cannot be negative.';
      } else {
        const parts = priceStr.split('.');
        const wholeDigits = parts[0].replace('-', '');
        const decimalDigits = parts[1] || '';
        if (wholeDigits.length > 10) {
          errs.unit_price = 'Unit price cannot exceed 10 digits before decimal (max 9,999,999,999.99).';
        } else if (decimalDigits.length > 2) {
          errs.unit_price = 'Unit price cannot have more than 2 decimal places.';
        } else if (wholeDigits.length + decimalDigits.length > 12) {
          errs.unit_price = 'Unit price cannot exceed 12 digits in total.';
        }
      }
    }

    // Storage Location
    if (formData.location && formData.location.trim().length > 150) {
      errs.location = 'Storage location cannot exceed 150 characters.';
    }

    // Status
    const validStatuses = ['In Stock', 'Low Stock', 'Reserved', 'Out of Stock'];
    if (!formData.status || !validStatuses.includes(formData.status)) {
      errs.status = 'Please select a valid stock status.';
    }

    if (Object.keys(errs).length > 0) {
      errs.general = 'Please correct the highlighted errors below before saving.';
      setErrors(errs);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setErrors({});

    const payload = {
      ...formData,
      style_no: formData.style_no.trim(),
      item_name: formData.item_name.trim(),
      unit: formData.unit.trim(),
      location: formData.location ? formData.location.trim() : 'Main Store',
      quantity: formData.quantity,
      unit_price: (formData.unit_price !== '' && formData.unit_price !== null && formData.unit_price !== undefined) ? formData.unit_price : null,
      remarks: formData.remarks ? formData.remarks.trim() : '',
    };
    if (!payload.buyer) delete payload.buyer;
    if (!payload.sample) delete payload.sample;
    if (payload.unit_price === null) delete payload.unit_price;

    const request = editingId
      ? api.put(`/stock/${editingId}/`, payload)
      : api.post('/stock/', payload);

    request
      .then(() => {
        closeModal();
        fetchData();
        setToastNotification({
          type: 'success',
          text: editingId ? `Stock item "${payload.style_no}" updated successfully!` : `Stock item "${payload.style_no}" added to stock successfully!`
        });
        setTimeout(() => setToastNotification(null), 4000);
      })
      .catch(err => {
        console.error('Failed to save stock item', err);
        const data = err.response?.data;
        if (data && typeof data === 'object') {
          const newErrors = {};
          Object.entries(data).forEach(([key, val]) => {
            if (Array.isArray(val)) {
              newErrors[key] = val.join(' ');
            } else if (typeof val === 'object' && val !== null) {
              newErrors[key] = Object.values(val).flat().join(' ');
            } else {
              newErrors[key] = String(val);
            }
          });
          if (data.detail) {
            newErrors.general = data.detail;
          } else if (data.non_field_errors) {
            newErrors.general = Array.isArray(data.non_field_errors)
              ? data.non_field_errors.join(' ')
              : data.non_field_errors;
          } else {
            newErrors.general = 'Please correct the highlighted errors below.';
          }
          setErrors(newErrors);
        } else {
          setErrors({ general: 'Failed to save stock item. Please check your connection and try again.' });
        }
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from Stock?`)) {
      api.delete(`/stock/${id}/`)
        .then(() => fetchData())
        .catch(err => console.error('Failed to delete stock item', err));
    }
  };

  const toggleSelectRow = (rowId, e) => {
    if (e) e.stopPropagation();
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRowIds(new Set(stockItems.map(s => s.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Stock':
        return (
          <span style={{
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            fontSize: '0.68rem',
            fontWeight: 750,
            padding: '1.5px 7px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
            IN STOCK
          </span>
        );
      case 'Low Stock':
        return (
          <span style={{
            backgroundColor: '#fffbeb',
            color: '#92400e',
            border: '1px solid #fde68a',
            fontSize: '0.68rem',
            fontWeight: 750,
            padding: '1.5px 7px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
            LOW STOCK
          </span>
        );
      case 'Reserved':
        return (
          <span style={{
            backgroundColor: '#f5f3ff',
            color: '#5b21b6',
            border: '1px solid #ddd6fe',
            fontSize: '0.68rem',
            fontWeight: 750,
            padding: '1.5px 7px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'inline-block' }} />
            RESERVED
          </span>
        );
      case 'Out of Stock':
        return (
          <span style={{
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            fontSize: '0.68rem',
            fontWeight: 750,
            padding: '1.5px 7px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
            OUT OF STOCK
          </span>
        );
      default:
        return (
          <span style={{
            backgroundColor: '#f8fafc',
            color: '#475569',
            border: '1px solid #e2e8f0',
            fontSize: '0.68rem',
            fontWeight: 750,
            padding: '1.5px 7px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#94a3b8', display: 'inline-block' }} />
            {status || 'UNKNOWN'}
          </span>
        );
    }
  };

  const getJobsByStage = (stageName) => {
    return unitFilteredJobs.filter(j => j.stage === stageName && (!searchTerm || j.style_no?.toLowerCase().includes(searchTerm.toLowerCase()) || j.item_name?.toLowerCase().includes(searchTerm.toLowerCase())));
  };

  const qcPendingJobs = unitFilteredJobs.filter(j => j.status === 'qc_requested');

  return (
    <div style={{ padding: '0 0.5rem 2rem' }}>
      {showModal ? (
        <div style={{ padding: '1rem', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
          <style>{`
            @media (max-width: 1024px) {
              .stock-form-grid {
                grid-template-columns: repeat(2, 1fr) !important;
              }
            }
            @media (max-width: 640px) {
              .stock-form-grid {
                grid-template-columns: 1fr !important;
              }
              .stock-action-btns {
                flex-direction: column-reverse !important;
                width: 100% !important;
              }
              .stock-action-btns button {
                width: 100% !important;
                justify-content: center !important;
              }
            }
          `}</style>

          {/* Header bar matching Daily Issue / Samples / BuyerPIs / POs */}
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
                onClick={closeModal}
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
                  transition: 'all 0.15s ease'
                }}
                title="Back to Stock Registry"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8b5a2b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Production & Stock Pipeline
                  </span>
                </div>
                <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  {editingId ? 'Edit Stock Item' : 'Add New Stock Item'}
                  {editingId && formData.style_no && (
                    <span style={{ backgroundColor: '#fff3e0', color: '#b45309', padding: '0.2rem 0.65rem', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 700, border: '1px solid #fed7aa' }}>
                      {formData.style_no}
                    </span>
                  )}
                </h1>
              </div>
            </div>
          </div>

          {/* Full-Width Form Card Container */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            padding: '1.75rem',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {errors.general && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1.5px solid #fca5a5',
                color: '#991b1b',
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                fontSize: '0.9rem',
                marginBottom: '1.5rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem'
              }}>
                <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
                <span>{errors.general}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1.25rem',
                backgroundColor: '#fafaf9',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.15rem' }}>
                  <Package size={18} color="#8b5a2b" />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    Item & Specification Details
                  </h3>
                </div>

                {/* Row 1: Core Attributes (4 Columns) */}
                <div className="stock-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Style No *</label>
                    <input
                      required
                      type="text"
                      name="style_no"
                      maxLength={100}
                      className="form-input"
                      style={{
                        borderColor: errors.style_no ? '#dc2626' : undefined,
                        backgroundColor: errors.style_no ? '#fff5f5' : undefined
                      }}
                      value={formData.style_no}
                      onChange={handleChange}
                      placeholder="e.g. STY-2026-X"
                    />
                    {errors.style_no && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{errors.style_no}</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Item / Product Name *</label>
                    <input
                      required
                      type="text"
                      name="item_name"
                      maxLength={255}
                      className="form-input"
                      style={{
                        borderColor: errors.item_name ? '#dc2626' : undefined,
                        backgroundColor: errors.item_name ? '#fff5f5' : undefined
                      }}
                      value={formData.item_name}
                      onChange={handleChange}
                      placeholder="e.g. Sheesham Wood Chair"
                    />
                    {errors.item_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{errors.item_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Stock Quantity *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      max="9999999999.99"
                      name="quantity"
                      className="form-input"
                      style={{
                        borderColor: errors.quantity ? '#dc2626' : undefined,
                        backgroundColor: errors.quantity ? '#fff5f5' : undefined
                      }}
                      value={formData.quantity}
                      onChange={handleChange}
                      placeholder="e.g. 50"
                    />
                    {errors.quantity ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{errors.quantity}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.74rem', color: '#78716c', marginTop: '3px' }}>
                        Max 10 whole digits + 2 decimals
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Unit *</label>
                    <input
                      required
                      type="text"
                      name="unit"
                      maxLength={30}
                      className="form-input"
                      style={{
                        borderColor: errors.unit ? '#dc2626' : undefined,
                        backgroundColor: errors.unit ? '#fff5f5' : undefined
                      }}
                      value={formData.unit}
                      onChange={handleChange}
                      placeholder="e.g. pcs / set"
                    />
                    {errors.unit && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{errors.unit}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: Commercials & Storage (4 Columns) */}
                <div className="stock-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Unit Price (INR/USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="9999999999.99"
                      name="unit_price"
                      className="form-input"
                      style={{
                        borderColor: errors.unit_price ? '#dc2626' : undefined,
                        backgroundColor: errors.unit_price ? '#fff5f5' : undefined
                      }}
                      value={formData.unit_price}
                      onChange={handleChange}
                      placeholder="e.g. 120.00"
                    />
                    {errors.unit_price ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{errors.unit_price}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.74rem', color: '#78716c', marginTop: '3px' }}>
                        Optional (Max 10 digits + 2 dec)
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Storage Location</label>
                    <input
                      type="text"
                      name="location"
                      maxLength={150}
                      className="form-input"
                      style={{
                        borderColor: errors.location ? '#dc2626' : undefined,
                        backgroundColor: errors.location ? '#fff5f5' : undefined
                      }}
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g. Main Store Raw Zone"
                    />
                    {errors.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{errors.location}</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <StatusSelect
                      label="Status"
                      required
                      options={STOCK_STATUS_FORM_OPTIONS}
                      value={formData.status}
                      onChange={val => handleChange({ target: { name: 'status', value: val } })}
                    />
                    {errors.status && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>{errors.status}</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Associated Buyer (Optional)</label>
                    <CustomSelect
                      name="buyer"
                      value={formData.buyer}
                      onChange={handleChange}
                      options={[
                        { value: '', label: 'Select Buyer...' },
                        ...buyers.map(b => ({ value: b.id, label: b.code ? `${b.name} (${b.code})` : b.name }))
                      ]}
                      placeholder="Select Buyer..."
                    />
                  </div>
                </div>

                {/* Row 3: Remarks (Full Width) */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Remarks / Storage Notes</label>
                  <textarea
                    name="remarks"
                    className="form-input"
                    rows="2"
                    style={{
                      borderColor: errors.remarks ? '#dc2626' : undefined,
                      backgroundColor: errors.remarks ? '#fff5f5' : undefined
                    }}
                    value={formData.remarks}
                    onChange={handleChange}
                    placeholder="Any specific storage instructions or notes..."
                  ></textarea>
                  {errors.remarks && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
                      <AlertCircle size={13} style={{ flexShrink: 0 }} />
                      <span>{errors.remarks}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="stock-action-btns" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.85rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                  disabled={submitting}
                  style={{ padding: '0.65rem 1.6rem', borderRadius: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                  style={{
                    padding: '0.65rem 2.2rem',
                    borderRadius: '10px',
                    fontWeight: 800,
                    backgroundColor: '#5c3a21',
                    borderColor: '#5c3a21',
                    color: '#ffffff',
                    opacity: submitting ? 0.7 : 1,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Saving...' : (editingId ? 'Save Changes' : 'Add to Stock')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* ── Page Header Bar (Title & Right Action CTAs) ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #5c3a21 0%, #3e2413 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
                boxShadow: '0 3px 8px rgba(92, 58, 33, 0.22)'
              }}>
                <Boxes size={19} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <h2 style={{
                    margin: 0,
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    color: '#1c1917',
                    letterSpacing: '-0.025em',
                    lineHeight: 1.15
                  }}>
                    Inventory Stock Registry
                  </h2>
                  <span style={{
                    backgroundColor: '#f5ede3',
                    color: '#5c3a21',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '5px',
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase'
                  }}>
                    Live Inventory
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#78716c' }}>
                  Track passed stock, factory units, availability and manufacturing stage assignments across all units.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-subtle-motion"
                onClick={() => navigate('/units')}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#44403c',
                  border: '1px solid #e7e5e4',
                  borderRadius: '9px',
                  padding: '0.42rem 0.85rem',
                  fontSize: '0.8rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                <Factory size={15} color="#78716c" />
                <span>Manage Factory Units</span>
              </button>

              <button
                type="button"
                className="btn-subtle-motion"
                onClick={handleDownloadExcel}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  borderRadius: '9px',
                  padding: '0.42rem 0.85rem',
                  fontSize: '0.8rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 1px 2px rgba(22, 163, 74, 0.04)'
                }}
              >
                <Download size={15} color="#16a34a" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                className="btn-subtle-motion"
                onClick={openCreateModal}
                style={{
                  background: 'linear-gradient(135deg, #5c3a21 0%, #3e2413 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9px',
                  padding: '0.42rem 1.1rem',
                  fontSize: '0.8rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 8px rgba(92, 58, 33, 0.25)'
                }}
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Add Stock Item</span>
              </button>
            </div>
          </div>

          {/* ── Factory Production Unit Horizontal Bar ── */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e7e5e4',
            borderRadius: '12px',
            padding: '0.45rem 0.95rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}>
            {/* Title & Icon on Left */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.84rem',
              fontWeight: 750,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              <Factory size={16} color="#334155" />
              <span>Factory Production Unit</span>
            </div>
            
            {/* Unit Pills Inline */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              flex: 1
            }}>
              <button
                key="all"
                type="button"
                className="btn-subtle-motion"
                onClick={() => setSelectedUnitId('all')}
                style={{
                  padding: '0.32rem 0.85rem',
                  borderRadius: '999px',
                  border: selectedUnitId === 'all' ? 'none' : '1px solid #e2e8f0',
                  backgroundColor: selectedUnitId === 'all' ? '#5c3a21' : '#f1f5f9',
                  color: selectedUnitId === 'all' ? '#ffffff' : '#1e293b',
                  fontWeight: selectedUnitId === 'all' ? 750 : 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: selectedUnitId === 'all' ? '0 2px 5px rgba(92, 58, 33, 0.22)' : 'none',
                  transition: 'all 150ms ease'
                }}
              >
                <span>All Units</span>
                <span style={{
                  padding: '1px 6px',
                  borderRadius: '999px',
                  fontSize: '0.68rem',
                  fontWeight: 750,
                  backgroundColor: selectedUnitId === 'all' ? 'rgba(255, 255, 255, 0.22)' : '#e2e8f0',
                  color: selectedUnitId === 'all' ? '#ffffff' : '#475569',
                  transition: 'all 150ms ease'
                }}>
                  {stockItems.length}
                </span>
              </button>

              {units.map((u) => {
                const isSel = selectedUnitId === u.id;
                const uStockCount = stockItems.filter(s => s.production_unit === u.id).length;

                return (
                  <button
                    key={u.id}
                    type="button"
                    className="btn-subtle-motion"
                    onClick={() => setSelectedUnitId(u.id)}
                    style={{
                      padding: '0.32rem 0.85rem',
                      borderRadius: '999px',
                      border: isSel ? 'none' : '1px solid #e2e8f0',
                      backgroundColor: isSel ? '#5c3a21' : '#f1f5f9',
                      color: isSel ? '#ffffff' : '#1e293b',
                      fontWeight: isSel ? 750 : 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: isSel ? '0 2px 5px rgba(92, 58, 33, 0.22)' : 'none',
                      transition: 'all 150ms ease'
                    }}
                  >
                    <span>{u.name}</span>
                    <span style={{
                      padding: '1px 6px',
                      borderRadius: '999px',
                      fontSize: '0.68rem',
                      fontWeight: 750,
                      backgroundColor: isSel ? 'rgba(255, 255, 255, 0.22)' : '#e2e8f0',
                      color: isSel ? '#ffffff' : '#475569',
                      transition: 'all 150ms ease'
                    }}>
                      {uStockCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stock Origin Breakdown Modal */}
          <StockOriginModal
            isOpen={showOriginModal}
            onClose={() => setShowOriginModal(false)}
            stockType={activeStageKey}
            stageTitle={activeStageTitle}
          />

          {/* ── Stock Stages Section & 4 Color-Coded Cards ── */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.45rem'
            }}>
              <div style={{
                fontSize: '0.84rem',
                fontWeight: 800,
                color: '#1c1917',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}>
                <Boxes size={15} color="#5c3a21" />
                <span>Manufacturing Stages & Pipeline Stock</span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.65rem'
            }}>
              {/* Stage 1: Raw Stock */}
              <div
                className="stock-stage-card-animated stock-stage-card-interactive"
                onClick={() => navigate('/stock/details/raw')}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #bae6fd',
                  borderTop: '3.5px solid #0284c7',
                  borderRadius: '10px',
                  padding: '0.7rem 0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                  boxShadow: '0 1px 3px rgba(2, 132, 199, 0.04)',
                  animationDelay: '100ms'
                }}
              >
                {/* Left: Icon Box */}
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileText size={22} strokeWidth={2} />
                </div>

                {/* Middle: Badge, Title, Qty */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: '2px' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: '#0284c7',
                      backgroundColor: '#e0f2fe',
                      padding: '1.5px 7px',
                      borderRadius: '999px',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase'
                    }}>
                      Stage 1
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.84rem',
                    fontWeight: 650,
                    color: '#334155',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2
                  }}>
                    Raw Stock Details
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 850, color: '#0284c7', lineHeight: 1 }}>
                      {rawStockTotal.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>
                      pcs
                    </span>
                  </div>
                </div>

                {/* Right: Chevron */}
                <div className="stage-card-arrow" style={{ flexShrink: 0, color: '#0284c7', display: 'flex', alignItems: 'center' }}>
                  <ChevronRight size={22} strokeWidth={2.6} />
                </div>
              </div>

              {/* Stage 2: Sanded Stock */}
              <div
                className="stock-stage-card-animated stock-stage-card-interactive"
                onClick={() => navigate('/stock/details/sanded')}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #fde68a',
                  borderTop: '3.5px solid #d97706',
                  borderRadius: '10px',
                  padding: '0.7rem 0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                  boxShadow: '0 1px 3px rgba(217, 119, 6, 0.04)',
                  animationDelay: '135ms'
                }}
              >
                {/* Left: Icon Box */}
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Users size={22} strokeWidth={2} />
                </div>

                {/* Middle: Badge, Title, Qty */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: '2px' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: '#d97706',
                      backgroundColor: '#fef3c7',
                      padding: '1.5px 7px',
                      borderRadius: '999px',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase'
                    }}>
                      Stage 2
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.84rem',
                    fontWeight: 650,
                    color: '#334155',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2
                  }}>
                    Sanded Stock Details
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 850, color: '#d97706', lineHeight: 1 }}>
                      {sandedStockTotal.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>
                      pcs
                    </span>
                  </div>
                </div>

                {/* Right: Chevron */}
                <div className="stage-card-arrow" style={{ flexShrink: 0, color: '#d97706', display: 'flex', alignItems: 'center' }}>
                  <ChevronRight size={22} strokeWidth={2.6} />
                </div>
              </div>

              {/* Stage 3: Polished Stock */}
              <div
                className="stock-stage-card-animated stock-stage-card-interactive"
                onClick={() => navigate('/stock/details/polished')}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e9d5ff',
                  borderTop: '3.5px solid #7c3aed',
                  borderRadius: '10px',
                  padding: '0.7rem 0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                  boxShadow: '0 1px 3px rgba(124, 58, 237, 0.04)',
                  animationDelay: '170ms'
                }}
              >
                {/* Left: Icon Box */}
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#f3e8ff',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileText size={22} strokeWidth={2} />
                </div>

                {/* Middle: Badge, Title, Qty */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: '2px' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: '#7c3aed',
                      backgroundColor: '#f3e8ff',
                      padding: '1.5px 7px',
                      borderRadius: '999px',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase'
                    }}>
                      Stage 3
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.84rem',
                    fontWeight: 650,
                    color: '#334155',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2
                  }}>
                    Polished Stock Details
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 850, color: '#7c3aed', lineHeight: 1 }}>
                      {polishedStockTotal.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>
                      pcs
                    </span>
                  </div>
                </div>

                {/* Right: Chevron */}
                <div className="stage-card-arrow" style={{ flexShrink: 0, color: '#7c3aed', display: 'flex', alignItems: 'center' }}>
                  <ChevronRight size={22} strokeWidth={2.6} />
                </div>
              </div>

              {/* Stage 4: Finished Goods */}
              <div
                className="stock-stage-card-animated stock-stage-card-interactive"
                onClick={() => navigate('/stock/details/packaged')}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #bbf7d0',
                  borderTop: '3.5px solid #16a34a',
                  borderRadius: '10px',
                  padding: '0.7rem 0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                  boxShadow: '0 1px 3px rgba(22, 163, 74, 0.04)',
                  animationDelay: '205ms'
                }}
              >
                {/* Left: Icon Box */}
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Package size={22} strokeWidth={2} />
                </div>

                {/* Middle: Badge, Title, Qty */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: '2px' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: '#16a34a',
                      backgroundColor: '#dcfce7',
                      padding: '1.5px 7px',
                      borderRadius: '999px',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase'
                    }}>
                      Packaged
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.84rem',
                    fontWeight: 650,
                    color: '#334155',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2
                  }}>
                    Finished Goods
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                    <span style={{ fontSize: '1.3rem', fontWeight: 850, color: '#16a34a', lineHeight: 1 }}>
                      {packagedStockTotal.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>
                      pcs
                    </span>
                  </div>
                </div>

                {/* Right: Chevron */}
                <div className="stage-card-arrow" style={{ flexShrink: 0, color: '#16a34a', display: 'flex', alignItems: 'center' }}>
                  <ChevronRight size={22} strokeWidth={2.6} />
                </div>
              </div>
            </div>
          </div>

          {/* ── 3 Summary KPI Cards Row ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.65rem',
            marginBottom: '0.75rem'
          }}>
            {/* Card 1 */}
            <div className="stat-card-animated" style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '0.55rem 0.85rem',
              border: '1px solid #e7e5e4',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              animationDelay: '100ms'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Package size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Stock Items
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 850, color: '#1c1917', marginTop: '1px', lineHeight: 1.1 }}>
                  {totalStockItemsCount}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#78716c', marginTop: '1px' }}>
                  Unique style items in registry
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="stat-card-animated" style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '0.55rem 0.85rem',
              border: '1px solid #e7e5e4',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              animationDelay: '150ms'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FileText size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Passed Quantity
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 850, color: '#1c1917', marginTop: '1px', lineHeight: 1.1 }}>
                  {totalPassedQuantity.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>pcs</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#78716c', marginTop: '1px' }}>
                  Audited manufacturing volume
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="stat-card-animated" style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '0.55rem 0.85rem',
              border: '1px solid #e7e5e4',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              animationDelay: '200ms'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Tag size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Estimated Stock Value
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 850, color: '#1c1917', marginTop: '1px', lineHeight: 1.1 }}>
                  ₹{estimatedStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#78716c', marginTop: '1px' }}>
                  Calculated from recorded unit prices
                </div>
              </div>
            </div>
          </div>

          {/* ── Main Navigation Sub-Tabs ── */}
          <div className="stock-nav-container">
            {/* Sliding Indicator Backdrop */}
            <div className="stock-nav-sliding-underline" style={navIndicatorStyle} />

            <button
              ref={el => navTabRefs.current['stock'] = el}
              onClick={() => setActiveTab('stock')}
              style={{
                position: 'relative',
                zIndex: 2,
                padding: '0.38rem 0.8rem',
                borderRadius: '7px',
                border: 'none',
                background: 'none',
                fontWeight: activeTab === 'stock' ? 750 : 600,
                color: activeTab === 'stock' ? '#ffffff' : '#57534e',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap',
                transition: 'color 180ms ease'
              }}
            >
              <Boxes size={14} />
              <span>Stock Levels</span>
              <span style={{
                padding: '1px 6px',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 750,
                backgroundColor: activeTab === 'stock' ? 'rgba(255,255,255,0.25)' : '#f5f5f4',
                color: activeTab === 'stock' ? '#ffffff' : '#78716c'
              }}>
                {unitFilteredStock.length}
              </span>
            </button>

            <button
              ref={el => navTabRefs.current['sanding'] = el}
              onClick={() => setActiveTab('sanding')}
              style={{
                position: 'relative',
                zIndex: 2,
                padding: '0.38rem 0.8rem',
                borderRadius: '7px',
                border: 'none',
                background: 'none',
                fontWeight: activeTab === 'sanding' ? 750 : 600,
                color: activeTab === 'sanding' ? '#ffffff' : '#57534e',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap',
                transition: 'color 180ms ease'
              }}
            >
              <Wrench size={14} />
              <span>Sanding Stage</span>
              <span style={{
                padding: '1px 6px',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 750,
                backgroundColor: activeTab === 'sanding' ? 'rgba(255,255,255,0.25)' : '#f5f5f4',
                color: activeTab === 'sanding' ? '#ffffff' : '#78716c'
              }}>
                {getJobsByStage('sanding').length}
              </span>
            </button>

            <button
              ref={el => navTabRefs.current['polishing'] = el}
              onClick={() => setActiveTab('polishing')}
              style={{
                position: 'relative',
                zIndex: 2,
                padding: '0.38rem 0.8rem',
                borderRadius: '7px',
                border: 'none',
                background: 'none',
                fontWeight: activeTab === 'polishing' ? 750 : 600,
                color: activeTab === 'polishing' ? '#ffffff' : '#57534e',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap',
                transition: 'color 180ms ease'
              }}
            >
              <Palette size={14} />
              <span>Polishing Stage</span>
              <span style={{
                padding: '1px 6px',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 750,
                backgroundColor: activeTab === 'polishing' ? 'rgba(255,255,255,0.25)' : '#f5f5f4',
                color: activeTab === 'polishing' ? '#ffffff' : '#78716c'
              }}>
                {getJobsByStage('polishing').length}
              </span>
            </button>

            <button
              ref={el => navTabRefs.current['packaging'] = el}
              onClick={() => setActiveTab('packaging')}
              style={{
                position: 'relative',
                zIndex: 2,
                padding: '0.38rem 0.8rem',
                borderRadius: '7px',
                border: 'none',
                background: 'none',
                fontWeight: activeTab === 'packaging' ? 750 : 600,
                color: activeTab === 'packaging' ? '#ffffff' : '#57534e',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap',
                transition: 'color 180ms ease'
              }}
            >
              <PackageCheck size={14} />
              <span>Packaging Stage</span>
              <span style={{
                padding: '1px 6px',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 750,
                backgroundColor: activeTab === 'packaging' ? 'rgba(255,255,255,0.25)' : '#f5f5f4',
                color: activeTab === 'packaging' ? '#ffffff' : '#78716c'
              }}>
                {getJobsByStage('packaging').length}
              </span>
            </button>

            {isSupervisor && (
              <button
                ref={el => navTabRefs.current['qc'] = el}
                onClick={() => setActiveTab('qc')}
                style={{
                  position: 'relative',
                  zIndex: 2,
                  padding: '0.38rem 0.8rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: 'none',
                  fontWeight: activeTab === 'qc' ? 750 : 600,
                  color: activeTab === 'qc' ? '#ffffff' : '#57534e',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                  transition: 'color 180ms ease'
                }}
              >
                <ClipboardCheck size={14} />
                <span>QC Requests</span>
                <span style={{
                  padding: '1px 6px',
                  borderRadius: '999px',
                  fontSize: '0.68rem',
                  fontWeight: 750,
                  backgroundColor: activeTab === 'qc' ? 'rgba(255,255,255,0.25)' : qcPendingJobs.length > 0 ? '#fee2e2' : '#f5f5f4',
                  color: activeTab === 'qc' ? '#ffffff' : qcPendingJobs.length > 0 ? '#dc2626' : '#78716c'
                }}>
                  {qcPendingJobs.length}
                </span>
              </button>
            )}
          </div>

          {/* ── Search & Filter Controls Bar ── */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '0.5rem 0.85rem',
            border: '1px solid #e7e5e4',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            marginBottom: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.65rem', flexWrap: 'wrap' }}>
              
              {/* Left Search Bar */}
              <div className="stock-search-input-wrap" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flex: '1 1 260px',
                maxWidth: '380px',
                backgroundColor: '#ffffff',
                border: '1px solid #e7e5e4',
                borderRadius: '8px',
                padding: '0 0.75rem',
                height: '36px'
              }}>
                <Search size={15} color="#a8a29e" />
                <input
                  type="text"
                  placeholder="Search by style no., product name..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    width: '100%',
                    fontSize: '0.82rem',
                    color: '#1c1917'
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    style={{ background: 'none', border: 'none', color: '#a8a29e', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Right Responsive Dropdowns */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                {activeTab === 'stock' && (
                  <>
                    <div style={{ flex: '1 1 125px', minWidth: '115px', maxWidth: '155px' }}>
                      <StatusSelect
                        options={STOCK_STATUS_FILTER_OPTIONS}
                        value={statusFilter}
                        onChange={setStatusFilter}
                      />
                    </div>

                    <div style={{ flex: '1 1 125px', minWidth: '115px', maxWidth: '155px' }}>
                      <CustomSelect
                        value={buyerFilter}
                        onChange={e => setBuyerFilter(e.target.value)}
                        options={[
                          { value: '', label: 'All Buyers' },
                          ...buyers.map(b => ({ value: b.id, label: b.code ? `${b.name} (${b.code})` : b.name }))
                        ]}
                        placeholder="All Buyers"
                      />
                    </div>
                  </>
                )}

                <div style={{ flex: '1 1 125px', minWidth: '115px', maxWidth: '155px' }}>
                  <OrderBySelect
                    options={ORDER_OPTIONS_DATE_QTY}
                    value={ordering}
                    onChange={setOrdering}
                  />
                </div>

                {(searchTerm || statusFilter || buyerFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('');
                      setBuyerFilter('');
                    }}
                    style={{
                      backgroundColor: '#f5f5f4',
                      border: '1px solid #e7e5e4',
                      borderRadius: '8px',
                      padding: '0 0.75rem',
                      height: '36px',
                      fontSize: '0.78rem',
                      fontWeight: 650,
                      color: '#57534e',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <RotateCcw size={13} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* ── TAB CONTENT WRAPPER ── */}
          <div key={activeTab} className="stock-tab-content-wrapper">
            {/* ── TAB CONTENT 1: Inventory Stock Items Table ── */}
            {activeTab === 'stock' && (
              <div className="po-desktop-table table-fade-slide-in">
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e7e5e4',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  overflow: 'hidden'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#faf8f5', borderBottom: '1px solid #e7e5e4' }}>
                        <th style={{ padding: '0.45rem 0.75rem', width: '36px' }}>
                          <input
                            type="checkbox"
                            checked={selectedRowIds.size === unitFilteredStock.length && unitFilteredStock.length > 0}
                            onChange={toggleSelectAll}
                            style={{ cursor: 'pointer', accentColor: '#5c3a21' }}
                          />
                        </th>
                        <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.69rem', fontWeight: 750, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STYLE NO.</th>
                        <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.69rem', fontWeight: 750, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ITEM / PRODUCT NAME</th>
                        <th style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontSize: '0.69rem', fontWeight: 750, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>QUANTITY</th>
                        <th style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontSize: '0.69rem', fontWeight: 750, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>UNIT PRICE</th>
                        <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.69rem', fontWeight: 750, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>LOCATION</th>
                        <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.69rem', fontWeight: 750, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STATUS</th>
                        <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.69rem', fontWeight: 750, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>BUYER REF</th>
                        <th style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontSize: '0.69rem', fontWeight: 750, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <TableSkeleton rows={6} cols={9} hasImage={false} />
                      ) : unitFilteredStock.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: '#78716c' }}>
                            <div style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '50%',
                              backgroundColor: '#f5f5f4',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: '0 auto 0.75rem auto',
                              color: '#a8a29e'
                            }}>
                              <Package size={24} />
                            </div>
                            <div style={{ fontWeight: 750, fontSize: '0.92rem', color: '#1c1917', marginBottom: '0.25rem' }}>No stock items found</div>
                            <div style={{ fontSize: '0.8rem', color: '#78716c' }}>Try adjusting your search terms or filters to find what you're looking for.</div>
                          </td>
                        </tr>
                      ) : (
                        unitFilteredStock.map((item, idx) => (
                          <tr
                            key={item.id}
                            className="table-row-stagger stock-table-row"
                            style={{
                              borderBottom: '1px solid #f5f5f4',
                              animationDelay: `${Math.min(idx * 20, 200)}ms`
                            }}
                          >
                          <td style={{ padding: '0.35rem 0.75rem' }}>
                            <input
                              type="checkbox"
                              checked={selectedRowIds.has(item.id)}
                              onChange={(e) => toggleSelectRow(item.id, e)}
                              style={{ cursor: 'pointer', accentColor: '#5c3a21' }}
                            />
                          </td>
                          <td style={{ padding: '0.35rem 0.75rem' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '1.5px 6px',
                              borderRadius: '5px',
                              backgroundColor: '#f5ede3',
                              color: '#5c3a21',
                              fontFamily: 'ui-monospace, monospace',
                              fontWeight: 750,
                              fontSize: '0.76rem',
                              letterSpacing: '0.01em'
                            }}>
                              {item.style_no}
                            </span>
                          </td>
                          <td style={{ padding: '0.35rem 0.75rem' }}>
                            <div style={{ fontWeight: 700, color: '#1c1917', fontSize: '0.82rem' }}>
                              {item.item_name}
                            </div>
                            {item.description && (
                              <div style={{ fontSize: '0.72rem', color: '#78716c', marginTop: '1px', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.35rem 0.75rem', textAlign: 'right' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'baseline',
                              gap: '3px',
                              fontWeight: 800,
                              color: '#047857',
                              fontSize: '0.82rem',
                              backgroundColor: '#ecfdf5',
                              padding: '1.5px 6px',
                              borderRadius: '5px'
                            }}>
                              <span>{parseFloat(item.quantity).toFixed(2)}</span>
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#059669' }}>{item.unit}</span>
                            </span>
                          </td>
                          <td style={{ padding: '0.35rem 0.75rem', textAlign: 'right', fontWeight: 650, color: '#1c1917', fontSize: '0.82rem' }}>
                            {item.unit_price ? `₹${parseFloat(item.unit_price).toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td style={{ padding: '0.35rem 0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Warehouse size={13} color="#78716c" style={{ flexShrink: 0 }} />
                              <div>
                                <div style={{ fontWeight: 650, color: '#1c1917', fontSize: '0.8rem', lineHeight: 1.15 }}>{item.location || 'Main Store'}</div>
                                <div style={{ fontSize: '0.7rem', color: '#a8a29e', lineHeight: 1.15 }}>Raw Zone</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '0.35rem 0.75rem' }}>
                            {getStatusBadge(item.status)}
                          </td>
                          <td style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                            {item.buyer_detail?.name ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                color: '#2563eb',
                                fontWeight: 700,
                                fontSize: '0.8rem'
                              }}>
                                <Building2 size={12} color="#3b82f6" />
                                {item.buyer_detail.name}
                              </span>
                            ) : (
                              <span style={{ color: '#a8a29e' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '0.35rem 0.75rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.3rem' }}>
                              {isSupervisor && (
                                <button
                                  type="button"
                                  className="stock-action-pill"
                                  onClick={() => handleOpenAssignModal('sanding', item)}
                                  style={{
                                    backgroundColor: '#ffffff',
                                    color: '#44403c',
                                    border: '1px solid #e7e5e4',
                                    borderRadius: '6px',
                                    padding: '2px 6px',
                                    fontSize: '0.74rem',
                                    fontWeight: 650,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                  }}
                                >
                                  Arrange <ChevronDown size={11} color="#78716c" />
                                </button>
                              )}
                              <button
                                type="button"
                                className="stock-action-pill"
                                onClick={() => openEditModal(item)}
                                style={{
                                  backgroundColor: '#ffffff',
                                  color: '#44403c',
                                  border: '1px solid #e7e5e4',
                                  borderRadius: '6px',
                                  padding: '2px 6px',
                                  fontSize: '0.74rem',
                                  fontWeight: 650,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                }}
                              >
                                <Edit3 size={11} color="#78716c" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="stock-action-delete"
                                onClick={() => handleDelete(item.id, item.item_name)}
                                style={{
                                  backgroundColor: 'transparent',
                                  color: '#dc2626',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '2px 6px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                <Trash2 size={11} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Floating Bulk Selection Dock */}
              {selectedRowIds.size > 0 && (
                <div className="stock-floating-dock">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem', fontWeight: 750 }}>
                    <CheckCircle2 size={16} color="#22c55e" />
                    <span>{selectedRowIds.size} {selectedRowIds.size === 1 ? 'item' : 'items'} selected</span>
                  </div>
                  <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
                  <button
                    type="button"
                    onClick={handleDownloadExcel}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Download size={13} /> Export Selected
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRowIds(new Set())}
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '999px',
                      padding: '2px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Deselect All
                  </button>
                </div>
              )}

              {/* ── Table Footer & Pagination Bar ── */}
              <div style={{
                marginTop: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                fontSize: '0.78rem',
                color: '#78716c'
              }}>
                <div>
                  Showing {unitFilteredStock.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, unitFilteredStock.length)} of {unitFilteredStock.length} items
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    style={{
                      border: '1px solid #e7e5e4',
                      backgroundColor: '#ffffff',
                      color: '#44403c',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.78rem',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1
                    }}
                  >
                    &lt;
                  </button>

                  <button
                    type="button"
                    style={{
                      border: 'none',
                      backgroundColor: '#5c3a21',
                      color: '#ffffff',
                      borderRadius: '6px',
                      padding: '2px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 750
                    }}
                  >
                    {currentPage}
                  </button>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    style={{
                      border: '1px solid #e7e5e4',
                      backgroundColor: '#ffffff',
                      color: '#44403c',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.78rem',
                      cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage >= totalPages ? 0.5 : 1
                    }}
                  >
                    &gt;
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>Items per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={e => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      border: '1px solid #e7e5e4',
                      borderRadius: '6px',
                      padding: '2px 6px',
                      backgroundColor: '#ffffff',
                      fontSize: '0.78rem',
                      color: '#1c1917',
                      outline: 'none'
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB CONTENT 2: Stage Production Jobs (Sanding, Polishing, Packaging) ── */}
          {(activeTab === 'sanding' || activeTab === 'polishing' || activeTab === 'packaging') && (
            <div className="po-desktop-table">
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e7e5e4',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#faf8f5', borderBottom: '1px solid #e7e5e4' }}>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.69rem', fontWeight: 750, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>JOB ID</th>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.69rem', fontWeight: 750, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STYLE NO.</th>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.69rem', fontWeight: 750, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PRODUCT NAME</th>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.69rem', fontWeight: 750, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ASSIGNED CONTRACTOR</th>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontSize: '0.69rem', fontWeight: 750, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ASSIGNED QTY</th>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontSize: '0.69rem', fontWeight: 750, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PASSED QTY</th>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.69rem', fontWeight: 750, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STATUS</th>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontSize: '0.69rem', fontWeight: 750, color: '#57534e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getJobsByStage(activeTab).length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: '#78716c' }}>
                          <Wrench size={28} style={{ marginBottom: '0.4rem', color: '#d6d3d1' }} />
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>No active jobs found for {activeTab} stage.</div>
                        </td>
                      </tr>
                    ) : (
                      getJobsByStage(activeTab).map((job) => (
                        <tr key={job.id} className="stock-table-row" style={{ borderBottom: '1px solid #f5f5f4' }}>
                          <td style={{ padding: '0.35rem 0.75rem' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '1.5px 6px',
                              borderRadius: '5px',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              fontFamily: 'ui-monospace, monospace',
                              fontWeight: 750,
                              fontSize: '0.74rem'
                            }}>
                              #JOB-{job.id}
                            </span>
                          </td>
                          <td style={{ padding: '0.35rem 0.75rem', fontWeight: 700, color: '#1c1917', fontSize: '0.8rem' }}>{job.style_no}</td>
                          <td style={{ padding: '0.35rem 0.75rem', fontWeight: 700, color: '#1c1917', fontSize: '0.82rem' }}>{job.item_name}</td>
                          <td style={{ padding: '0.35rem 0.75rem', color: '#44403c', fontWeight: 600, fontSize: '0.78rem' }}>{job.contractor_name || 'Unassigned'}</td>
                          <td style={{ padding: '0.35rem 0.75rem', textAlign: 'right', fontWeight: 750, color: '#1c1917', fontSize: '0.82rem' }}>{job.assigned_qty} {job.unit}</td>
                          <td style={{ padding: '0.35rem 0.75rem', textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '0.82rem' }}>{job.passed_qty || 0} {job.unit}</td>
                          <td style={{ padding: '0.35rem 0.75rem' }}>
                            <span style={{
                              padding: '1.5px 7px',
                              borderRadius: '999px',
                              fontSize: '0.68rem',
                              fontWeight: 750,
                              textTransform: 'uppercase',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: job.status === 'qc_requested' ? '#fffbeb' : job.status === 'qc_completed' ? '#ecfdf5' : '#f0f9ff',
                              border: job.status === 'qc_requested' ? '1px solid #fde68a' : job.status === 'qc_completed' ? '1px solid #a7f3d0' : '1px solid #bae6fd',
                              color: job.status === 'qc_requested' ? '#92400e' : job.status === 'qc_completed' ? '#065f46' : '#0369a1'
                            }}>
                              <span style={{
                                width: '4px',
                                height: '4px',
                                borderRadius: '50%',
                                backgroundColor: job.status === 'qc_requested' ? '#f59e0b' : job.status === 'qc_completed' ? '#10b981' : '#0284c7'
                              }} />
                              {job.status === 'qc_requested' ? 'QC REQUESTED' : job.status === 'qc_completed' ? 'QC COMPLETED' : 'IN PRODUCTION'}
                            </span>
                          </td>
                          <td style={{ padding: '0.35rem 0.75rem', textAlign: 'right' }}>
                            {isSupervisor ? (
                              <button
                                type="button"
                                className="btn-subtle-motion"
                                onClick={() => handleOpenQCModal(job)}
                                style={{
                                  backgroundColor: '#059669',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '3px 9px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 2px rgba(5,150,105,0.2)'
                                }}
                              >
                                Perform QC
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-subtle-motion"
                                onClick={() => handleRequestQC(job.id)}
                                style={{
                                  backgroundColor: '#2563eb',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '3px 9px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                                }}
                              >
                                Request QC
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAB CONTENT 3: Pending QC Requests & Rework ── */}
          {activeTab === 'qc' && (
            <div className="po-desktop-table">
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e7e5e4',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fff1f2', borderBottom: '1px solid #fecdd3' }}>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.69rem', fontWeight: 750, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.04em' }}>JOB ID</th>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.69rem', fontWeight: 750, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STAGE</th>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.69rem', fontWeight: 750, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STYLE NO & PRODUCT</th>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'left', fontSize: '0.69rem', fontWeight: 750, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CONTRACTOR</th>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontSize: '0.69rem', fontWeight: 750, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ASSIGNED QTY</th>
                      <th style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontSize: '0.69rem', fontWeight: 750, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qcPendingJobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#78716c' }}>
                          <CheckCircle2 size={28} style={{ marginBottom: '0.4rem', color: '#059669' }} />
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>All contractor QC requests completed!</div>
                        </td>
                      </tr>
                    ) : (
                      qcPendingJobs.map((job) => (
                        <tr key={job.id} className="stock-table-row" style={{ borderBottom: '1px solid #f5f5f4' }}>
                          <td style={{ padding: '0.35rem 0.75rem' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '1.5px 6px',
                              borderRadius: '5px',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              fontFamily: 'ui-monospace, monospace',
                              fontWeight: 750,
                              fontSize: '0.74rem'
                            }}>
                              #JOB-{job.id}
                            </span>
                          </td>
                          <td style={{ padding: '0.35rem 0.75rem', fontWeight: 700, textTransform: 'capitalize', color: '#1c1917', fontSize: '0.8rem' }}>{job.stage}</td>
                          <td style={{ padding: '0.35rem 0.75rem' }}>
                            <strong style={{ color: '#1c1917', fontSize: '0.82rem' }}>{job.style_no}</strong>{' '}
                            <span style={{ color: '#57534e', fontSize: '0.8rem' }}>— {job.item_name}</span>
                          </td>
                          <td style={{ padding: '0.35rem 0.75rem', fontWeight: 600, color: '#44403c', fontSize: '0.78rem' }}>{job.contractor_name}</td>
                          <td style={{ padding: '0.35rem 0.75rem', textAlign: 'right', fontWeight: 800, color: '#1c1917', fontSize: '0.82rem' }}>{job.assigned_qty} {job.unit}</td>
                          <td style={{ padding: '0.35rem 0.75rem', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn-subtle-motion"
                              onClick={() => handleOpenQCModal(job)}
                              style={{
                                backgroundColor: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '3px 9px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(220,38,38,0.2)'
                              }}
                            >
                              Perform Inspection QC
                            </button>
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
        </>
      )}

      {/* ── MODAL 1: Stage Batch Job Assignment ── */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', padding: 0 }}>
            <div style={{
              padding: '1.25rem 1.75rem',
              background: 'linear-gradient(135deg, #5c3a21 0%, #442816 100%)',
              color: '#ffffff',
              borderBottom: '1px solid #e7e5e4',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.2)', color: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Plus size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Start Stage Batch Job</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#f5ede3', fontWeight: 400 }}>Assign stock to contractor for stage processing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)', border: 'none',
                  borderRadius: '50%', width: '34px', height: '34px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#ffffff'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} style={{ padding: '1.5rem 1.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#1c1917', marginBottom: '0.4rem' }}>
                    Manufacturing Stage *
                  </label>
                  <select
                    className="form-input"
                    value={assignForm.stage}
                    onChange={e => setAssignForm({ ...assignForm, stage: e.target.value })}
                    required
                  >
                    <option value="sanding">Sanding Stage (Raw → Sanded)</option>
                    <option value="polishing">Polishing Stage (Sanded → Polished)</option>
                    <option value="packaging">Packaging Stage (Polished → Finished)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#1c1917', marginBottom: '0.4rem' }}>
                    Source Stock Item *
                  </label>
                  <select
                    className="form-input"
                    value={assignForm.stock_item}
                    onChange={e => {
                      const sel = stockItems.find(s => s.id === e.target.value);
                      setAssignForm({ ...assignForm, stock_item: e.target.value, assigned_qty: sel ? sel.quantity : '' });
                    }}
                    required
                  >
                    <option value="">Select Stock Item...</option>
                    {unitFilteredStock.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.style_no} — {s.item_name} (Avail: {s.quantity} {s.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#1c1917', marginBottom: '0.4rem' }}>
                    Contractor *
                  </label>
                  <select
                    className="form-input"
                    value={assignForm.contractor}
                    onChange={e => setAssignForm({ ...assignForm, contractor: e.target.value })}
                    required
                  >
                    <option value="">Select Contractor...</option>
                    {contractors.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.first_name || c.username} ({c.email || 'Contractor'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#1c1917', marginBottom: '0.4rem' }}>
                    Quantity to Assign *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={assignForm.assigned_qty}
                    onChange={e => setAssignForm({ ...assignForm, assigned_qty: e.target.value })}
                    placeholder="Enter quantity..."
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#1c1917', marginBottom: '0.4rem' }}>
                    Notes / Instructions
                  </label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={assignForm.contractor_notes}
                    onChange={e => setAssignForm({ ...assignForm, contractor_notes: e.target.value })}
                    placeholder="Instructions for contractor..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#5c3a21', color: '#ffffff' }}>
                  Confirm & Assign Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Quality Check Inspection ── */}
      {showQCModal && selectedJob && (
        <div className="modal-overlay" onClick={() => setShowQCModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px', padding: 0 }}>
            <div style={{
              padding: '1.25rem 1.75rem',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              borderBottom: '1px solid #bbf7d0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: '#059669', color: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#14532d' }}>Quality Control Inspection</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#166534' }}>Verify contractor work & enter QC results</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQCModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQCSubmit} style={{ padding: '1.5rem 1.75rem' }}>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid #e7e5e4', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', fontSize: '0.85rem' }}>
                <div><span style={{ color: '#78716c' }}>Style No:</span> <strong style={{ color: '#1c1917' }}>{selectedJob.style_no}</strong></div>
                <div><span style={{ color: '#78716c' }}>Contractor:</span> <strong style={{ color: '#1c1917' }}>{selectedJob.contractor_name}</strong></div>
                <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#78716c' }}>Item:</span> <strong style={{ color: '#1c1917' }}>{selectedJob.item_name}</strong></div>
                <div style={{ gridColumn: '1 / -1', paddingTop: '0.3rem', borderTop: '1px dashed #cbd5e1', fontWeight: 700, color: '#5c3a21' }}>
                  Assigned Quantity: {parseFloat(selectedJob.assigned_qty)} {selectedJob.unit}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ color: '#059669', fontWeight: 750, marginBottom: '0.4rem' }}>
                    Passed Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={qcForm.passed_qty}
                    onChange={e => {
                      const pass = parseFloat(e.target.value) || 0;
                      const tot = parseFloat(selectedJob.assigned_qty) || 0;
                      const rej = Math.max(0, tot - pass);
                      setQCForm({ ...qcForm, passed_qty: e.target.value, rejected_qty: rej });
                    }}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ color: '#dc2626', fontWeight: 750, marginBottom: '0.4rem' }}>
                    Rejected / Rework Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={qcForm.rejected_qty}
                    onChange={e => setQCForm({ ...qcForm, rejected_qty: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#1c1917', marginBottom: '0.4rem' }}>
                    Inspection Feedback / Rework Notes
                  </label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={qcForm.notes}
                    onChange={e => setQCForm({ ...qcForm, notes: e.target.value })}
                    placeholder="Reasons for rejection / rework notes..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowQCModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: '#059669', color: '#ffffff' }}>
                  Save Inspection Result
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toastNotification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: toastNotification.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1.5px solid ${toastNotification.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: toastNotification.type === 'success' ? '#166534' : '#991b1b',
          borderRadius: '12px',
          padding: '12px 20px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600,
          fontSize: '0.9rem'
        }}>
          {toastNotification.type === 'success' ? <CheckCircle2 size={20} color="#16a34a" /> : <AlertCircle size={20} color="#dc2626" />}
          <span>{toastNotification.text}</span>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: 0,
              marginLeft: '8px',
              display: 'flex',
              alignItems: 'center',
              opacity: 0.7
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default Stock;
