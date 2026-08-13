import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  Search, Download, Plus, ArrowLeft, ChevronRight, Package, Warehouse,
  Tag, CheckCircle2, AlertCircle, Building2, Factory, Wrench, Palette,
  PackageCheck, ClipboardCheck, Boxes, Layers, RefreshCw, CheckCircle,
  XCircle, Clock, User, AlertTriangle, ArrowRight, X, FileText, ChevronDown
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

  // Stock Origin Drill-Down Modal state
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [activeStageKey, setActiveStageKey] = useState('raw');
  const [activeStageTitle, setActiveStageTitle] = useState('Raw Stock');

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
      api.get('/production-jobs/', { params: { nopage: true } }),
      api.get('/production-units/'),
      isSupervisor ? api.get('/users/', { params: { role: 'contractor', nopage: true } }) : Promise.resolve({ data: [] }),
      api.get('/buyers/', { params: { nopage: true } }),
      api.get('/samples/', { params: { nopage: true } })
    ])
      .then(([stockRes, jobsRes, unitRes, contractorRes, buyerRes, sampleRes]) => {
        const sData = stockRes.data.results || stockRes.data || [];
        setStockItems(sData);
        if (stockRes.data.count !== undefined) {
          setTotalPages(Math.ceil(stockRes.data.count / itemsPerPage));
        } else {
          setTotalPages(1);
        }

        setProductionJobs(jobsRes.data.results || jobsRes.data || []);
        setUnits(unitRes.data.results || unitRes.data || []);
        setContractors(contractorRes.data.results || contractorRes.data || []);
        setBuyers(buyerRes.data.results || buyerRes.data || []);
        setSamples(sampleRes.data.results || sampleRes.data || []);
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openCreateModal = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setFormData({
      style_no: item.style_no || '',
      item_name: item.item_name || '',
      quantity: item.quantity || '',
      unit: item.unit || 'pcs',
      unit_price: item.unit_price || '',
      location: item.location || 'Main Store',
      status: item.status || 'In Stock',
      buyer: item.buyer || '',
      sample: item.sample || '',
      remarks: item.remarks || '',
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (!payload.buyer) delete payload.buyer;
    if (!payload.sample) delete payload.sample;

    const request = editingId
      ? api.put(`/stock/${editingId}/`, payload)
      : api.post('/stock/', payload);

    request
      .then(() => {
        closeModal();
        fetchData();
      })
      .catch(err => {
        console.error('Failed to save stock item', err);
        alert('Failed to save stock item. Please check inputs.');
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
            backgroundColor: '#d1fae5',
            color: '#059669',
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: '6px',
            textTransform: 'uppercase',
            display: 'inline-block'
          }}>
            IN STOCK
          </span>
        );
      case 'Low Stock':
        return (
          <span style={{
            backgroundColor: '#fef3c7',
            color: '#b45309',
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: '6px',
            textTransform: 'uppercase',
            display: 'inline-block'
          }}>
            LOW STOCK
          </span>
        );
      case 'Reserved':
        return (
          <span style={{
            backgroundColor: '#e0e7ff',
            color: '#4338ca',
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: '6px',
            textTransform: 'uppercase',
            display: 'inline-block'
          }}>
            RESERVED
          </span>
        );
      case 'Out of Stock':
        return (
          <span style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: '6px',
            textTransform: 'uppercase',
            display: 'inline-block'
          }}>
            OUT OF STOCK
          </span>
        );
      default:
        return (
          <span style={{
            backgroundColor: '#f1f5f9',
            color: '#475569',
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: '6px',
            textTransform: 'uppercase',
            display: 'inline-block'
          }}>
            {status}
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
        <div className="new-page-form" style={{ padding: '1rem 0' }}>
          <button 
            onClick={closeModal} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'none', 
              border: 'none', 
              color: '#5c3a21', 
              fontWeight: 700, 
              cursor: 'pointer',
              marginBottom: '1.5rem',
              padding: 0,
              fontSize: '0.95rem'
            }}
          >
            <ArrowLeft size={18} /> Back to Stock Registry
          </button>

          <div className="form-card-container">
            <div className="modal-header" style={{ padding: 0, marginBottom: '2rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 750, color: '#1c1917' }}>
                {editingId ? '✏️ Edit Stock Item' : '📦 Add New Stock Item'}
              </h2>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <form onSubmit={handleSubmit}>
                <div className="form-section">
                  <h3 className="form-section-title">📋 Item Details</h3>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Style No *</label>
                      <input required type="text" name="style_no" className="form-input" value={formData.style_no} onChange={handleChange} placeholder="e.g. STY-2026-X" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Item / Product Name *</label>
                      <input required type="text" name="item_name" className="form-input" value={formData.item_name} onChange={handleChange} placeholder="e.g. Sheesham Wood Chair" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Stock Quantity *</label>
                      <input required type="number" step="0.01" name="quantity" className="form-input" value={formData.quantity} onChange={handleChange} placeholder="e.g. 50" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Unit *</label>
                      <input required type="text" name="unit" className="form-input" value={formData.unit} onChange={handleChange} placeholder="e.g. pcs / set" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Unit Price (INR/USD)</label>
                      <input type="number" step="0.01" name="unit_price" className="form-input" value={formData.unit_price} onChange={handleChange} placeholder="e.g. 120.00" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Storage Location</label>
                      <input type="text" name="location" className="form-input" value={formData.location} onChange={handleChange} placeholder="e.g. Main Store Raw Zone" />
                    </div>

                    <div className="form-group">
                      <StatusSelect
                        label="Status"
                        required
                        options={STOCK_STATUS_FORM_OPTIONS}
                        value={formData.status}
                        onChange={val => handleChange({ target: { name: 'status', value: val } })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Associated Buyer (Optional)</label>
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

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Remarks / Storage Notes</label>
                      <textarea name="remarks" className="form-input" rows="2" value={formData.remarks} onChange={handleChange} placeholder="Any specific storage instructions or notes..."></textarea>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ backgroundColor: '#5c3a21', color: '#ffffff' }}>{editingId ? 'Save Changes' : 'Add to Stock'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Page Header Bar (Title & Right Action CTAs) ── */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#faf5ee',
                border: '1px solid #f0eae1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#5c3a21',
                flexShrink: 0
              }}>
                <FileText size={22} />
              </div>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  color: '#1c1917',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2
                }}>
                  Inventory Stock Registry
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '0.86rem', color: '#78716c' }}>
                  Track passed stock, factory units, availability and manufacturing stage assignments.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate('/units')}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#44403c',
                  border: '1px solid #e7e5e4',
                  borderRadius: '10px',
                  padding: '0.6rem 1.1rem',
                  fontSize: '0.85rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                }}
              >
                <Factory size={16} color="#78716c" /> Manage Factory Units
              </button>

              <button
                type="button"
                onClick={handleDownloadExcel}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#44403c',
                  border: '1px solid #e7e5e4',
                  borderRadius: '10px',
                  padding: '0.6rem 1.1rem',
                  fontSize: '0.85rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                }}
              >
                <Download size={16} color="#78716c" /> Export Excel
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                style={{
                  backgroundColor: '#5c3a21',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 2px 5px rgba(92, 58, 33, 0.2)'
                }}
              >
                <Plus size={16} /> Add Stock Item
              </button>
            </div>
          </div>

          {/* ── Factory Unit Segmented Control Box ── */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #f0eae1',
            borderRadius: '14px',
            padding: '1.1rem 1.35rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 750, color: '#1c1917', marginBottom: '0.65rem' }}>
              Factory Unit
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: '2px'
            }}>
              <button
                type="button"
                onClick={() => setSelectedUnitId('all')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: selectedUnitId === 'all' ? '#5c3a21' : '#ffffff',
                  color: selectedUnitId === 'all' ? '#ffffff' : '#78716c',
                  fontWeight: selectedUnitId === 'all' ? 750 : 500,
                  fontSize: '0.83rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: selectedUnitId === 'all' ? '0 2px 4px rgba(92, 58, 33, 0.2)' : 'none'
                }}
              >
                All Units ({stockItems.length})
              </button>

              {units.map((u) => {
                const isSel = selectedUnitId === u.id;
                const uStockCount = stockItems.filter(s => s.production_unit === u.id).length;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUnitId(u.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: isSel ? 'none' : '1px solid #e7e5e4',
                      backgroundColor: isSel ? '#5c3a21' : '#ffffff',
                      color: isSel ? '#ffffff' : '#78716c',
                      fontWeight: isSel ? 750 : 500,
                      fontSize: '0.83rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {u.name} ({uStockCount})
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
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{
              fontSize: '0.92rem',
              fontWeight: 800,
              color: '#1c1917',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.85rem'
            }}>
              <Boxes size={18} color="#5c3a21" /> Stock Stages
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem'
            }}>
              {/* Stage 1: Raw Stock */}
              <div
                onClick={() => navigate('/stock/details/raw')}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  border: '2px solid #38bdf8',
                  boxShadow: '0 2px 10px rgba(56, 189, 248, 0.08)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, boxShadow 0.15s'
                }}
              >
                <div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#0284c7',
                    backgroundColor: '#e0f2fe',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    display: 'inline-block'
                  }}>
                    Stage 1
                  </span>
                </div>
                <h4 style={{ margin: '0.65rem 0 2px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Raw Stock Details
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#78716c' }}>
                  Passed Gate Receiving Audit
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 850, color: '#0284c7', marginTop: '0.85rem', lineHeight: 1.1 }}>
                  {rawStockTotal.toLocaleString()} pcs
                </div>
              </div>

              {/* Stage 2: Sanded Stock */}
              <div
                onClick={() => navigate('/stock/details/sanded')}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  border: '2px solid #f59e0b',
                  boxShadow: '0 2px 10px rgba(245, 158, 11, 0.08)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, boxShadow 0.15s'
                }}
              >
                <div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#b45309',
                    backgroundColor: '#fef3c7',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    display: 'inline-block'
                  }}>
                    Stage 2
                  </span>
                </div>
                <h4 style={{ margin: '0.65rem 0 2px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Sanded Stock Details
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#78716c' }}>
                  Passed Sanding QC Audit
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 850, color: '#d97706', marginTop: '0.85rem', lineHeight: 1.1 }}>
                  {sandedStockTotal.toLocaleString()} pcs
                </div>
              </div>

              {/* Stage 3: Polished Stock */}
              <div
                onClick={() => navigate('/stock/details/polished')}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  border: '2px solid #8b5cf6',
                  boxShadow: '0 2px 10px rgba(139, 92, 246, 0.08)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, boxShadow 0.15s'
                }}
              >
                <div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#7c3aed',
                    backgroundColor: '#f3e8ff',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    display: 'inline-block'
                  }}>
                    Stage 3
                  </span>
                </div>
                <h4 style={{ margin: '0.65rem 0 2px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Polished Stock Details
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#78716c' }}>
                  Passed Polishing QC Audit
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 850, color: '#7c3aed', marginTop: '0.85rem', lineHeight: 1.1 }}>
                  {polishedStockTotal.toLocaleString()} pcs
                </div>
              </div>

              {/* Stage 4: Finished Goods */}
              <div
                onClick={() => navigate('/stock/details/packaged')}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  border: '2px solid #10b981',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.08)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, boxShadow 0.15s'
                }}
              >
                <div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#059669',
                    backgroundColor: '#d1fae5',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    display: 'inline-block'
                  }}>
                    Packaged
                  </span>
                </div>
                <h4 style={{ margin: '0.65rem 0 2px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Finished Goods
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#78716c' }}>
                  Packaged / Ready Shipment
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 850, color: '#059669', marginTop: '0.85rem', lineHeight: 1.1 }}>
                  {packagedStockTotal.toLocaleString()} pcs
                </div>
              </div>
            </div>
          </div>

          {/* ── 3 Summary KPI Cards Row ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.75rem'
          }}>
            {/* Card 1 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '1.1rem 1.35rem',
              border: '1px solid #e7e5e4',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Package size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#78716c' }}>
                  Total Stock Items
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 850, color: '#1c1917', marginTop: '2px', lineHeight: 1.1 }}>
                  {totalStockItemsCount}
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '1.1rem 1.35rem',
              border: '1px solid #e7e5e4',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FileText size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#78716c' }}>
                  Total Passed Quantity
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 850, color: '#1c1917', marginTop: '2px', lineHeight: 1.1 }}>
                  {totalPassedQuantity.toLocaleString()} pcs
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '1.1rem 1.35rem',
              border: '1px solid #e7e5e4',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Tag size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#78716c' }}>
                  Estimated Stock Value
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 850, color: '#1c1917', marginTop: '2px', lineHeight: 1.1 }}>
                  ₹{estimatedStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Main Navigation Sub-Tabs ── */}
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            borderBottom: '2px solid #e7e5e4',
            marginBottom: '1.25rem',
            overflowX: 'auto'
          }}>
            <button
              onClick={() => setActiveTab('stock')}
              style={{
                padding: '0.65rem 0.25rem',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'stock' ? '3px solid #5c3a21' : '3px solid transparent',
                fontWeight: activeTab === 'stock' ? 750 : 500,
                color: activeTab === 'stock' ? '#5c3a21' : '#78716c',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Boxes size={17} /> Stock Levels
            </button>

            <button
              onClick={() => setActiveTab('sanding')}
              style={{
                padding: '0.65rem 0.25rem',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'sanding' ? '3px solid #5c3a21' : '3px solid transparent',
                fontWeight: activeTab === 'sanding' ? 750 : 500,
                color: activeTab === 'sanding' ? '#5c3a21' : '#78716c',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Wrench size={17} /> Sanding Stage ({getJobsByStage('sanding').length})
            </button>

            <button
              onClick={() => setActiveTab('polishing')}
              style={{
                padding: '0.65rem 0.25rem',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'polishing' ? '3px solid #5c3a21' : '3px solid transparent',
                fontWeight: activeTab === 'polishing' ? 750 : 500,
                color: activeTab === 'polishing' ? '#5c3a21' : '#78716c',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Palette size={17} /> Polishing Stage ({getJobsByStage('polishing').length})
            </button>

            <button
              onClick={() => setActiveTab('packaging')}
              style={{
                padding: '0.65rem 0.25rem',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'packaging' ? '3px solid #5c3a21' : '3px solid transparent',
                fontWeight: activeTab === 'packaging' ? 750 : 500,
                color: activeTab === 'packaging' ? '#5c3a21' : '#78716c',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                whiteSpace: 'nowrap'
              }}
            >
              <PackageCheck size={17} /> Packaging Stage ({getJobsByStage('packaging').length})
            </button>

            {isSupervisor && (
              <button
                onClick={() => setActiveTab('qc')}
                style={{
                  padding: '0.65rem 0.25rem',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeTab === 'qc' ? '3px solid #5c3a21' : '3px solid transparent',
                  fontWeight: activeTab === 'qc' ? 750 : 500,
                  color: activeTab === 'qc' ? '#5c3a21' : '#78716c',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <ClipboardCheck size={17} /> QC Requests ({qcPendingJobs.length})
              </button>
            )}
          </div>

          {/* ── Search & Filter Controls Bar (SINGLE INLINE ROW MATCHING MOCKUP) ── */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '0.85rem 1.25rem',
            border: '1px solid #e7e5e4',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              
              {/* Left Search Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                flex: '1 1 260px',
                maxWidth: '360px',
                backgroundColor: '#ffffff',
                border: '1px solid #e7e5e4',
                borderRadius: '10px',
                padding: '0 0.85rem',
                height: '40px'
              }}>
                <Search size={16} color="#a8a29e" />
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
                    fontSize: '0.86rem',
                    color: '#1c1917'
                  }}
                />
              </div>

              {/* Right Single Horizontal Row Dropdowns */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginLeft: 'auto', flexWrap: 'nowrap' }}>
                {activeTab === 'stock' && (
                  <>
                    <div style={{ width: '155px', flexShrink: 0 }}>
                      <StatusSelect
                        options={STOCK_STATUS_FILTER_OPTIONS}
                        value={statusFilter}
                        onChange={setStatusFilter}
                      />
                    </div>

                    <div style={{ width: '145px', flexShrink: 0 }}>
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

                <div style={{ width: '165px', flexShrink: 0 }}>
                  <OrderBySelect
                    options={ORDER_OPTIONS_DATE_QTY}
                    value={ordering}
                    onChange={setOrdering}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* ── TAB CONTENT 1: Inventory Stock Items Table ── */}
          {activeTab === 'stock' && (
            <div className="po-desktop-table">
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e7e5e4',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f7f3ee', borderBottom: '1px solid #e7e5e4' }}>
                      <th style={{ padding: '0.9rem 1rem', width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedRowIds.size === unitFilteredStock.length && unitFilteredStock.length > 0}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 750, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STYLE NO.</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 750, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ITEM / PRODUCT NAME</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'right', fontSize: '0.72rem', fontWeight: 750, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>QUANTITY</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'right', fontSize: '0.72rem', fontWeight: 750, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>UNIT PRICE</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 750, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>LOCATION</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 750, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STATUS</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 750, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>BUYER REF</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'right', fontSize: '0.72rem', fontWeight: 750, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={6} cols={9} hasImage={false} />
                    ) : unitFilteredStock.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#78716c' }}>
                          <Package size={32} style={{ marginBottom: '0.5rem', color: '#d6d3d1' }} />
                          <div style={{ fontWeight: 600 }}>No stock items found.</div>
                        </td>
                      </tr>
                    ) : (
                      unitFilteredStock.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <input
                              type="checkbox"
                              checked={selectedRowIds.has(item.id)}
                              onChange={(e) => toggleSelectRow(item.id, e)}
                            />
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{
                              fontWeight: 750,
                              fontSize: '0.84rem',
                              color: '#1c1917',
                              display: 'inline-block'
                            }}>
                              {item.style_no}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#1c1917', fontSize: '0.86rem' }}>
                            {item.item_name}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '0.88rem' }}>
                            {parseFloat(item.quantity).toFixed(2)} {item.unit}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 500, color: '#44403c', fontSize: '0.84rem' }}>
                            {item.unit_price ? `₹${parseFloat(item.unit_price).toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#44403c', fontSize: '0.82rem' }}>
                            <div style={{ fontWeight: 650, color: '#1c1917' }}>{item.location || 'Main Store'}</div>
                            <div style={{ fontSize: '0.78rem', color: '#78716c' }}>Raw Zone</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {getStatusBadge(item.status)}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem' }}>
                            {item.buyer_detail?.name ? (
                              <span style={{ color: '#2563eb', fontWeight: 700, cursor: 'pointer' }}>{item.buyer_detail.name}</span>
                            ) : (
                              <span style={{ color: '#a8a29e' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.4rem' }}>
                              {isSupervisor && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignModal('sanding', item)}
                                  style={{
                                    backgroundColor: '#ffffff',
                                    color: '#44403c',
                                    border: '1px solid #e7e5e4',
                                    borderRadius: '8px',
                                    padding: '4px 10px',
                                    fontSize: '0.78rem',
                                    fontWeight: 650,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  Arrange <ChevronDown size={13} color="#78716c" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                style={{
                                  backgroundColor: '#ffffff',
                                  color: '#44403c',
                                  border: '1px solid #e7e5e4',
                                  borderRadius: '8px',
                                  padding: '4px 10px',
                                  fontSize: '0.78rem',
                                  fontWeight: 650,
                                  cursor: 'pointer'
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id, item.item_name)}
                                style={{
                                  backgroundColor: '#ffffff',
                                  color: '#dc2626',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '4px 8px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Table Footer & Pagination Bar ── */}
              <div style={{
                marginTop: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                fontSize: '0.83rem',
                color: '#78716c'
              }}>
                <div>
                  Showing {unitFilteredStock.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, unitFilteredStock.length)} of {unitFilteredStock.length} items
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    style={{
                      border: '1px solid #e7e5e4',
                      backgroundColor: '#ffffff',
                      color: '#44403c',
                      borderRadius: '8px',
                      padding: '4px 10px',
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
                      borderRadius: '8px',
                      padding: '4px 12px',
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
                      borderRadius: '8px',
                      padding: '4px 10px',
                      cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage >= totalPages ? 0.5 : 1
                    }}
                  >
                    &gt;
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>Items per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={e => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      border: '1px solid #e7e5e4',
                      borderRadius: '8px',
                      padding: '3px 8px',
                      backgroundColor: '#ffffff',
                      fontSize: '0.83rem',
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
                borderRadius: '14px',
                border: '1px solid #e7e5e4',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f7f3ee', borderBottom: '1px solid #e7e5e4' }}>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 750, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>JOB ID</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 750, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STYLE NO.</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 750, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PRODUCT NAME</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 750, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ASSIGNED CONTRACTOR</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'right', fontSize: '0.72rem', fontWeight: 750, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ASSIGNED QTY</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'right', fontSize: '0.72rem', fontWeight: 750, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PASSED QTY</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 750, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STATUS</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'right', fontSize: '0.72rem', fontWeight: 750, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getJobsByStage(activeTab).length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#78716c' }}>
                          <Wrench size={32} style={{ marginBottom: '0.5rem', color: '#d6d3d1' }} />
                          <div style={{ fontWeight: 600 }}>No active jobs found for {activeTab} stage.</div>
                        </td>
                      </tr>
                    ) : (
                      getJobsByStage(activeTab).map((job) => (
                        <tr key={job.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#0284c7' }}>#JOB-{job.id}</td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{job.style_no}</td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#1c1917' }}>{job.item_name}</td>
                          <td style={{ padding: '0.85rem 1rem', color: '#44403c', fontWeight: 600 }}>{job.contractor_name || 'Unassigned'}</td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#1c1917' }}>{job.assigned_qty} {job.unit}</td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#059669' }}>{job.passed_qty || 0} {job.unit}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              backgroundColor: job.status === 'qc_requested' ? '#fef3c7' : job.status === 'qc_completed' ? '#d1fae5' : '#e0f2fe',
                              color: job.status === 'qc_requested' ? '#b45309' : job.status === 'qc_completed' ? '#059669' : '#0284c7'
                            }}>
                              {job.status === 'qc_requested' ? 'QC REQUESTED' : job.status === 'qc_completed' ? 'QC COMPLETED' : 'IN PRODUCTION'}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            {isSupervisor ? (
                              <button
                                type="button"
                                onClick={() => handleOpenQCModal(job)}
                                style={{
                                  backgroundColor: '#059669',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '4px 10px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Perform QC
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRequestQC(job.id)}
                                style={{
                                  backgroundColor: '#2563eb',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '4px 10px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
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
                borderRadius: '14px',
                border: '1px solid #e7e5e4',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fff1f2', borderBottom: '1px solid #fecdd3' }}>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 750, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.04em' }}>JOB ID</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 750, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STAGE</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 750, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.04em' }}>STYLE NO & PRODUCT</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 750, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CONTRACTOR</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'right', fontSize: '0.72rem', fontWeight: 750, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ASSIGNED QTY</th>
                      <th style={{ padding: '0.9rem 1rem', textAlign: 'right', fontSize: '0.72rem', fontWeight: 750, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qcPendingJobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#78716c' }}>
                          <CheckCircle2 size={32} style={{ marginBottom: '0.5rem', color: '#059669' }} />
                          <div style={{ fontWeight: 600 }}>All contractor QC requests completed!</div>
                        </td>
                      </tr>
                    ) : (
                      qcPendingJobs.map((job) => (
                        <tr key={job.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#dc2626' }}>#JOB-{job.id}</td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, textTransform: 'capitalize' }}>{job.stage}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <strong style={{ color: '#1c1917' }}>{job.style_no}</strong> — {job.item_name}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#44403c' }}>{job.contractor_name}</td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800 }}>{job.assigned_qty} {job.unit}</td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenQCModal(job)}
                              style={{
                                backgroundColor: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '5px 12px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer'
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
    </div>
  );
}

export default Stock;
