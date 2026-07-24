import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Boxes,
  Wrench,
  Palette,
  PackageCheck,
  ClipboardCheck,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  User,
  AlertTriangle,
  ArrowRight,
  X,
  Layers,
  FileText
} from 'lucide-react';

const STAGE_CONFIG = {
  sanding: { label: 'Sanding Stage', icon: Wrench, color: '#3b82f6', bg: '#eff6ff' },
  polishing: { label: 'Polishing Stage', icon: Palette, color: '#a855f7', bg: '#faf5ff' },
  packaging: { label: 'Packaging Stage', icon: PackageCheck, color: '#16a34a', bg: '#f0fdf4' },
};

export default function ProductionPipeline() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'sanding' | 'polishing' | 'packaging' | 'qc'
  
  // Data states
  const [stockItems, setStockItems] = useState([]);
  const [productionJobs, setProductionJobs] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockTypeFilter, setStockTypeFilter] = useState('raw'); // 'raw' | 'sanded' | 'polished' | 'packaged'

  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    stage: 'sanding',
    stock_item: '',
    contractor: '',
    assigned_qty: '',
    contractor_notes: ''
  });

  const [showQCModal, setShowQCModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [qcForm, setQCForm] = useState({
    passed_qty: '',
    rejected_qty: 0,
    notes: ''
  });

  const isSupervisor = user?.role === 'admin' || user?.role === 'supervisor';
  const isContractor = user?.role === 'contractor';

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/stock/', { params: { nopage: true } }),
      api.get('/production-jobs/', { params: { nopage: true } }),
      isSupervisor ? api.get('/users/', { params: { role: 'contractor', nopage: true } }) : Promise.resolve({ data: [] })
    ]).then(([stockRes, jobsRes, contractorRes]) => {
      const sData = stockRes.data.results || stockRes.data || [];
      const jData = jobsRes.data.results || jobsRes.data || [];
      const cData = contractorRes.data.results || contractorRes.data || [];
      setStockItems(sData);
      setProductionJobs(jData);
      setContractors(cData);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Calculations for stats summary
  const rawStockTotal = stockItems.filter(s => s.stock_type === 'raw').reduce((acc, curr) => acc + (parseFloat(curr.quantity) || 0), 0);
  const sandedStockTotal = stockItems.filter(s => s.stock_type === 'sanded').reduce((acc, curr) => acc + (parseFloat(curr.quantity) || 0), 0);
  const polishedStockTotal = stockItems.filter(s => s.stock_type === 'polished').reduce((acc, curr) => acc + (parseFloat(curr.quantity) || 0), 0);
  const packagedStockTotal = stockItems.filter(s => s.stock_type === 'packaged').reduce((acc, curr) => acc + (parseFloat(curr.quantity) || 0), 0);

  // Handlers
  const handleOpenAssignModal = (stage = 'sanding', defaultStock = null) => {
    const defaultStockId = defaultStock ? defaultStock.id : '';
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

  // Filtered views
  const filteredStock = stockItems.filter(s => {
    const matchesType = s.stock_type === stockTypeFilter;
    const matchesSearch = !searchTerm || s.style_no?.toLowerCase().includes(searchTerm.toLowerCase()) || s.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getJobsByStage = (stageName) => {
    return productionJobs.filter(j => j.stage === stageName && (!searchTerm || j.style_no?.toLowerCase().includes(searchTerm.toLowerCase()) || j.item_name?.toLowerCase().includes(searchTerm.toLowerCase())));
  };

  const qcPendingJobs = productionJobs.filter(j => j.status === 'qc_requested');
  const reworkJobs = productionJobs.filter(j => j.rejected_qty > 0 && j.status !== 'qc_completed');

  return (
    <div className="page-container" style={{ padding: '1.5rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Boxes color="#16a34a" size={28} /> Production & Quality Control Pipeline
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Multi-stage manufacturing tracking: Raw Stock → Sanding → Sanded Stock → Polishing → Polished Stock → Packaging → Finished Goods.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchData} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={16} /> Refresh Data
          </button>
          {isSupervisor && (
            <button onClick={() => handleOpenAssignModal('sanding')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={18} /> Assign Contractor Job
            </button>
          )}
        </div>
      </div>

      {/* ── Summary Stats Grid ── */}
      <div className="pipeline-stats-grid">
        <div className="pipeline-stat-card" style={{ background: '#ffffff', borderRadius: '12px', padding: '1.2rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>Raw Stock</span>
            <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>Stage 1</span>
          </div>
          <div className="pipeline-stat-val" style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', marginTop: '0.4rem' }}>
            {rawStockTotal.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>pcs</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem', whiteSpace: 'nowrap' }}>Passed Gate Receiving</div>
        </div>

        <div className="pipeline-stat-card" style={{ background: '#ffffff', borderRadius: '12px', padding: '1.2rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#3b82f6', fontSize: '0.85rem', fontWeight: '600' }}>Sanded Stock</span>
            <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>Stage 2</span>
          </div>
          <div className="pipeline-stat-val" style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1d4ed8', marginTop: '0.4rem' }}>
            {sandedStockTotal.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>pcs</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem', whiteSpace: 'nowrap' }}>Passed Sanding QC</div>
        </div>

        <div className="pipeline-stat-card" style={{ background: '#ffffff', borderRadius: '12px', padding: '1.2rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9333ea', fontSize: '0.85rem', fontWeight: '600' }}>Polished Stock</span>
            <span style={{ background: '#faf5ff', color: '#7e22ce', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>Stage 3</span>
          </div>
          <div className="pipeline-stat-val" style={{ fontSize: '1.8rem', fontWeight: '800', color: '#6b21a8', marginTop: '0.4rem' }}>
            {polishedStockTotal.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>pcs</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem', whiteSpace: 'nowrap' }}>Passed Polishing QC</div>
        </div>

        <div className="pipeline-stat-card" style={{ background: '#ffffff', borderRadius: '12px', padding: '1.2rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: '600' }}>Finished Goods</span>
            <span style={{ background: '#f0fdf4', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>Packaged</span>
          </div>
          <div className="pipeline-stat-val" style={{ fontSize: '1.8rem', fontWeight: '800', color: '#15803d', marginTop: '0.4rem' }}>
            {packagedStockTotal.toLocaleString()} <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>pcs</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem', whiteSpace: 'nowrap' }}>Ready for Shipment</div>
        </div>
      </div>

      {/* ── Main Navigation Tabs ── */}
      <div className="pipeline-nav-tabs">
        <button
          onClick={() => setActiveTab('stock')}
          className="pipeline-tab-btn"
          style={{
            borderBottom: activeTab === 'stock' ? '3px solid #16a34a' : '3px solid transparent',
            fontWeight: activeTab === 'stock' ? '700' : '500',
            color: activeTab === 'stock' ? '#16a34a' : '#64748b',
          }}
        >
          <Boxes size={18} /> Stock Levels
        </button>

        <button
          onClick={() => setActiveTab('sanding')}
          className="pipeline-tab-btn"
          style={{
            borderBottom: activeTab === 'sanding' ? '3px solid #3b82f6' : '3px solid transparent',
            fontWeight: activeTab === 'sanding' ? '700' : '500',
            color: activeTab === 'sanding' ? '#3b82f6' : '#64748b',
          }}
        >
          <Wrench size={18} /> Sanding Stage ({getJobsByStage('sanding').length})
        </button>

        <button
          onClick={() => setActiveTab('polishing')}
          className="pipeline-tab-btn"
          style={{
            borderBottom: activeTab === 'polishing' ? '3px solid #a855f7' : '3px solid transparent',
            fontWeight: activeTab === 'polishing' ? '700' : '500',
            color: activeTab === 'polishing' ? '#a855f7' : '#64748b',
          }}
        >
          <Palette size={18} /> Polishing Stage ({getJobsByStage('polishing').length})
        </button>

        <button
          onClick={() => setActiveTab('packaging')}
          className="pipeline-tab-btn"
          style={{
            borderBottom: activeTab === 'packaging' ? '3px solid #16a34a' : '3px solid transparent',
            fontWeight: activeTab === 'packaging' ? '700' : '500',
            color: activeTab === 'packaging' ? '#16a34a' : '#64748b',
          }}
        >
          <PackageCheck size={18} /> Packaging Stage ({getJobsByStage('packaging').length})
        </button>

        <button
          onClick={() => setActiveTab('qc')}
          className="pipeline-tab-btn"
          style={{
            borderBottom: activeTab === 'qc' ? '3px solid #ef4444' : '3px solid transparent',
            fontWeight: activeTab === 'qc' ? '700' : '500',
            color: activeTab === 'qc' ? '#ef4444' : '#64748b',
          }}
        >
          <ClipboardCheck size={18} /> QC Requests & Rework ({qcPendingJobs.length + reworkJobs.length})
        </button>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="pipeline-search-bar">
        <div className="pipeline-search-input-wrapper" style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by Style No or Item Name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {activeTab === 'stock' && (
          <div className="pipeline-filter-pills">
            {[
              { id: 'raw', label: 'Raw Stock' },
              { id: 'sanded', label: 'Sanded' },
              { id: 'polished', label: 'Polished' },
              { id: 'packaged', label: 'Finished Goods' }
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setStockTypeFilter(type.id)}
                className="pipeline-filter-pill-btn"
                style={{
                  padding: '0.4rem 0.8rem',
                  border: 'none',
                  borderRadius: '6px',
                  background: stockTypeFilter === type.id ? '#ffffff' : 'transparent',
                  color: stockTypeFilter === type.id ? '#0f172a' : '#64748b',
                  fontWeight: stockTypeFilter === type.id ? '600' : '400',
                  boxShadow: stockTypeFilter === type.id ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── TAB 1: Stock Levels ── */}
      {activeTab === 'stock' && (
        <>
          {/* Desktop Table View */}
          <div className="table-container pipeline-desktop-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Stock Type</th>
                  <th>Style No</th>
                  <th>Item / Product Name</th>
                  <th>Available Quantity</th>
                  <th>Location</th>
                  <th>Status</th>
                  {isSupervisor && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredStock.map(stock => (
                  <tr key={stock.id}>
                    <td>
                      <span className="navbar-role-badge" style={{
                        background: stock.stock_type === 'raw' ? '#f1f5f9' : stock.stock_type === 'sanded' ? '#eff6ff' : stock.stock_type === 'polished' ? '#faf5ff' : '#f0fdf4',
                        color: stock.stock_type === 'raw' ? '#475569' : stock.stock_type === 'sanded' ? '#2563eb' : stock.stock_type === 'polished' ? '#7e22ce' : '#15803d'
                      }}>
                        {stock.stock_type === 'raw' ? 'Raw Stock' : stock.stock_type === 'sanded' ? 'Sanded Stock' : stock.stock_type === 'polished' ? 'Polished Stock' : 'Finished Goods'}
                      </span>
                    </td>
                    <td><strong>{stock.style_no}</strong></td>
                    <td>{stock.item_name}</td>
                    <td>
                      <span style={{ fontSize: '1.05rem', fontWeight: '700', color: parseFloat(stock.quantity) > 0 ? '#0f172a' : '#ef4444' }}>
                        {parseFloat(stock.quantity).toLocaleString()} {stock.unit}
                      </span>
                    </td>
                    <td>{stock.location || 'Main Store'}</td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600', background: stock.status === 'In Stock' ? '#dcfce7' : '#fee2e2', color: stock.status === 'In Stock' ? '#15803d' : '#b91c1c' }}>
                        {stock.status}
                      </span>
                    </td>
                    {isSupervisor && (
                      <td>
                        {stock.stock_type === 'raw' && parseFloat(stock.quantity) > 0 && (
                          <button onClick={() => handleOpenAssignModal('sanding', stock)} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            Assign Sanding <ArrowRight size={14} />
                          </button>
                        )}
                        {stock.stock_type === 'sanded' && parseFloat(stock.quantity) > 0 && (
                          <button onClick={() => handleOpenAssignModal('polishing', stock)} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', borderColor: '#c084fc', color: '#7e22ce' }}>
                            Assign Polishing <ArrowRight size={14} />
                          </button>
                        )}
                        {stock.stock_type === 'polished' && parseFloat(stock.quantity) > 0 && (
                          <button onClick={() => handleOpenAssignModal('packaging', stock)} className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', borderColor: '#86efac', color: '#15803d' }}>
                            Assign Packaging <ArrowRight size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {filteredStock.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No stock items found for current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="pipeline-mobile-view">
            {filteredStock.map(stock => (
              <div key={stock.id} className="pipeline-mobile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span className="navbar-role-badge" style={{
                    background: stock.stock_type === 'raw' ? '#f1f5f9' : stock.stock_type === 'sanded' ? '#eff6ff' : stock.stock_type === 'polished' ? '#faf5ff' : '#f0fdf4',
                    color: stock.stock_type === 'raw' ? '#475569' : stock.stock_type === 'sanded' ? '#2563eb' : stock.stock_type === 'polished' ? '#7e22ce' : '#15803d'
                  }}>
                    {stock.stock_type === 'raw' ? 'Raw Stock' : stock.stock_type === 'sanded' ? 'Sanded Stock' : stock.stock_type === 'polished' ? 'Polished Stock' : 'Finished Goods'}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: '600', background: stock.status === 'In Stock' ? '#dcfce7' : '#fee2e2', color: stock.status === 'In Stock' ? '#15803d' : '#b91c1c' }}>
                    {stock.status}
                  </span>
                </div>

                <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>{stock.style_no}</div>
                <div style={{ fontSize: '0.88rem', color: '#475569', margin: '2px 0 8px' }}>{stock.item_name}</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px', marginBottom: '0.8rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Available Qty:</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: parseFloat(stock.quantity) > 0 ? '#0f172a' : '#ef4444' }}>
                    {parseFloat(stock.quantity).toLocaleString()} {stock.unit}
                  </span>
                </div>

                {isSupervisor && parseFloat(stock.quantity) > 0 && (
                  <div>
                    {stock.stock_type === 'raw' && (
                      <button onClick={() => handleOpenAssignModal('sanding', stock)} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '0.55rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                        Assign Sanding <ArrowRight size={15} />
                      </button>
                    )}
                    {stock.stock_type === 'sanded' && (
                      <button onClick={() => handleOpenAssignModal('polishing', stock)} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '0.55rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: '#c084fc', color: '#7e22ce', fontWeight: 600 }}>
                        Assign Polishing <ArrowRight size={15} />
                      </button>
                    )}
                    {stock.stock_type === 'polished' && (
                      <button onClick={() => handleOpenAssignModal('packaging', stock)} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '0.55rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: '#86efac', color: '#15803d', fontWeight: 600 }}>
                        Assign Packaging <ArrowRight size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {filteredStock.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', background: '#fff', borderRadius: '12px' }}>
                No stock items found for current filter.
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TABS 2, 3, 4: Production Stage (Sanding / Polishing / Packaging) ── */}
      {['sanding', 'polishing', 'packaging'].includes(activeTab) && (
        <>
          {/* Desktop Table View */}
          <div className="table-container pipeline-desktop-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Style No</th>
                  <th>Item / Product Name</th>
                  <th>Contractor</th>
                  <th>Assigned Qty</th>
                  <th>Passed Qty</th>
                  <th>Rework Qty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getJobsByStage(activeTab).map(job => (
                  <tr key={job.id}>
                    <td><strong>{job.style_no}</strong></td>
                    <td>{job.item_name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={15} color="#64748b" /> {job.contractor_name}
                      </div>
                    </td>
                    <td><strong>{parseFloat(job.assigned_qty)} {job.unit}</strong></td>
                    <td style={{ color: '#16a34a', fontWeight: '600' }}>{parseFloat(job.passed_qty)} {job.unit}</td>
                    <td style={{ color: job.rejected_qty > 0 ? '#ef4444' : '#64748b', fontWeight: '600' }}>
                      {parseFloat(job.rejected_qty)} {job.unit}
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        background: job.status === 'qc_completed' ? '#dcfce7' : job.status === 'qc_requested' ? '#fef3c7' : '#eff6ff',
                        color: job.status === 'qc_completed' ? '#15803d' : job.status === 'qc_requested' ? '#d97706' : '#2563eb'
                      }}>
                        {job.status === 'qc_completed' ? 'QC Completed' : job.status === 'qc_requested' ? 'QC Inspection Requested' : job.status === 'in_progress' ? 'In Progress / Rework' : 'Assigned'}
                      </span>
                    </td>
                    <td>
                      {isContractor && job.status !== 'qc_completed' && job.status !== 'qc_requested' && (
                        <button onClick={() => handleRequestQC(job.id)} className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                          Request QC Inspection
                        </button>
                      )}
                      {isSupervisor && job.status === 'qc_requested' && (
                        <button onClick={() => handleOpenQCModal(job)} className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#d97706' }}>
                          Perform QC Check
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {getJobsByStage(activeTab).length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No active production jobs found for this stage.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="pipeline-mobile-view">
            {getJobsByStage(activeTab).map(job => (
              <div key={job.id} className="pipeline-mobile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>{job.style_no}</span>
                  <span style={{
                    padding: '3px 9px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    background: job.status === 'qc_completed' ? '#dcfce7' : job.status === 'qc_requested' ? '#fef3c7' : '#eff6ff',
                    color: job.status === 'qc_completed' ? '#15803d' : job.status === 'qc_requested' ? '#d97706' : '#2563eb'
                  }}>
                    {job.status === 'qc_completed' ? 'QC Completed' : job.status === 'qc_requested' ? 'QC Inspection Requested' : job.status === 'in_progress' ? 'In Progress / Rework' : 'Assigned'}
                  </span>
                </div>

                <div style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '0.6rem' }}>{job.item_name}</div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.75rem' }}>
                  <User size={14} color="#64748b" /> <strong>Contractor:</strong> {job.contractor_name}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', background: '#f8fafc', padding: '0.6rem', borderRadius: '8px', textAlign: 'center', marginBottom: '0.8rem', fontSize: '0.8rem' }}>
                  <div>
                    <div style={{ color: '#64748b' }}>Assigned</div>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>{parseFloat(job.assigned_qty)} {job.unit}</div>
                  </div>
                  <div>
                    <div style={{ color: '#16a34a' }}>Passed</div>
                    <div style={{ fontWeight: '700', color: '#16a34a', fontSize: '0.95rem' }}>{parseFloat(job.passed_qty)} {job.unit}</div>
                  </div>
                  <div>
                    <div style={{ color: job.rejected_qty > 0 ? '#ef4444' : '#64748b' }}>Rework</div>
                    <div style={{ fontWeight: '700', color: job.rejected_qty > 0 ? '#ef4444' : '#64748b', fontSize: '0.95rem' }}>{parseFloat(job.rejected_qty)} {job.unit}</div>
                  </div>
                </div>

                <div>
                  {isContractor && job.status !== 'qc_completed' && job.status !== 'qc_requested' && (
                    <button onClick={() => handleRequestQC(job.id)} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.55rem', fontSize: '0.85rem' }}>
                      Request QC Inspection
                    </button>
                  )}
                  {isSupervisor && job.status === 'qc_requested' && (
                    <button onClick={() => handleOpenQCModal(job)} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.55rem', fontSize: '0.85rem', background: '#d97706' }}>
                      Perform QC Check
                    </button>
                  )}
                </div>
              </div>
            ))}
            {getJobsByStage(activeTab).length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', background: '#fff', borderRadius: '12px' }}>
                No active production jobs found for this stage.
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB 5: QC Requests & Rework ── */}
      {activeTab === 'qc' && (
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock color="#d97706" size={20} /> Pending QC Inspection Requests ({qcPendingJobs.length})
          </h3>

          {/* Desktop Table View */}
          <div className="table-container pipeline-desktop-view" style={{ marginBottom: '2rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Style No</th>
                  <th>Item Name</th>
                  <th>Contractor</th>
                  <th>Assigned Qty</th>
                  <th>Requested At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {qcPendingJobs.map(job => (
                  <tr key={job.id}>
                    <td>
                      <span className="navbar-role-badge" style={{ background: STAGE_CONFIG[job.stage]?.bg, color: STAGE_CONFIG[job.stage]?.color }}>
                        {STAGE_CONFIG[job.stage]?.label}
                      </span>
                    </td>
                    <td><strong>{job.style_no}</strong></td>
                    <td>{job.item_name}</td>
                    <td>{job.contractor_name}</td>
                    <td><strong>{parseFloat(job.assigned_qty)} {job.unit}</strong></td>
                    <td>{job.qc_requested_at ? new Date(job.qc_requested_at).toLocaleString() : 'Just now'}</td>
                    <td>
                      {isSupervisor ? (
                        <button onClick={() => handleOpenQCModal(job)} className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#d97706' }}>
                          Inspect & Grade QC
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Awaiting Supervisor</span>
                      )}
                    </td>
                  </tr>
                ))}
                {qcPendingJobs.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                      No pending QC requests.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="pipeline-mobile-view" style={{ marginBottom: '2rem' }}>
            {qcPendingJobs.map(job => (
              <div key={job.id} className="pipeline-mobile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="navbar-role-badge" style={{ background: STAGE_CONFIG[job.stage]?.bg, color: STAGE_CONFIG[job.stage]?.color }}>
                    {STAGE_CONFIG[job.stage]?.label}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {job.qc_requested_at ? new Date(job.qc_requested_at).toLocaleDateString() : 'Just now'}
                  </span>
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>{job.style_no}</div>
                <div style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '0.4rem' }}>{job.item_name}</div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  <strong>Contractor:</strong> {job.contractor_name} | <strong>Qty:</strong> {parseFloat(job.assigned_qty)} {job.unit}
                </div>

                {isSupervisor ? (
                  <button onClick={() => handleOpenQCModal(job)} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.55rem', fontSize: '0.85rem', background: '#d97706' }}>
                    Inspect & Grade QC
                  </button>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '0.4rem', background: '#f8fafc', borderRadius: '6px' }}>
                    Awaiting Supervisor QC Inspection
                  </div>
                )}
              </div>
            ))}
            {qcPendingJobs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', background: '#fff', borderRadius: '12px' }}>
                No pending QC requests.
              </div>
            )}
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle color="#ef4444" size={20} /> Active Rework Items ({reworkJobs.length})
          </h3>

          {/* Desktop Table View */}
          <div className="table-container pipeline-desktop-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Style No</th>
                  <th>Item Name</th>
                  <th>Contractor</th>
                  <th>Passed Qty</th>
                  <th>Rejected Rework Qty</th>
                  <th>Supervisor Feedback</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reworkJobs.map(job => (
                  <tr key={job.id}>
                    <td>
                      <span className="navbar-role-badge" style={{ background: STAGE_CONFIG[job.stage]?.bg, color: STAGE_CONFIG[job.stage]?.color }}>
                        {STAGE_CONFIG[job.stage]?.label}
                      </span>
                    </td>
                    <td><strong>{job.style_no}</strong></td>
                    <td>{job.item_name}</td>
                    <td>{job.contractor_name}</td>
                    <td style={{ color: '#16a34a', fontWeight: '600' }}>{parseFloat(job.passed_qty)} {job.unit}</td>
                    <td style={{ color: '#ef4444', fontWeight: '700' }}>{parseFloat(job.rejected_qty)} {job.unit}</td>
                    <td><span style={{ fontSize: '0.85rem', color: '#b91c1c' }}>{job.qc_notes || 'Rework required'}</span></td>
                    <td>
                      {isContractor && (
                        <button onClick={() => handleRequestQC(job.id)} className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                          Re-submit Rework for QC
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {reworkJobs.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                      No active rework items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="pipeline-mobile-view">
            {reworkJobs.map(job => (
              <div key={job.id} className="pipeline-mobile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="navbar-role-badge" style={{ background: STAGE_CONFIG[job.stage]?.bg, color: STAGE_CONFIG[job.stage]?.color }}>
                    {STAGE_CONFIG[job.stage]?.label}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: '700' }}>
                    Rework: {parseFloat(job.rejected_qty)} {job.unit}
                  </span>
                </div>

                <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>{job.style_no}</div>
                <div style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '0.4rem' }}>{job.item_name}</div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '0.6rem' }}>
                  <strong>Contractor:</strong> {job.contractor_name} | <strong>Passed:</strong> {parseFloat(job.passed_qty)} {job.unit}
                </div>

                {job.qc_notes && (
                  <div style={{ fontSize: '0.8rem', color: '#b91c1c', background: '#fef2f2', padding: '0.5rem 0.7rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
                    <strong>Feedback:</strong> {job.qc_notes}
                  </div>
                )}

                {isContractor && (
                  <button onClick={() => handleRequestQC(job.id)} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.55rem', fontSize: '0.85rem' }}>
                    Re-submit Rework for QC
                  </button>
                )}
              </div>
            ))}
            {reworkJobs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', background: '#fff', borderRadius: '12px' }}>
                No active rework items.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 1: Assign Stock to Contractor ── */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px', padding: 0 }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.75rem',
              background: 'linear-gradient(135deg, #fdfbf7 0%, #f7f1e5 100%)',
              borderBottom: '1px solid #ede4d3',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: '#8b5a2b', color: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(139, 90, 43, 0.25)'
                }}>
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#4a2c11' }}>Assign Production Job</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#8b5a2b', fontWeight: 500 }}>Select stage, stock item, contractor & quantity</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)', border: '1px solid #e2e8f0',
                  borderRadius: '50%', width: '34px', height: '34px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#64748b', transition: 'all 0.2s'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAssignSubmit} style={{ padding: '1.5rem 1.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {/* Stage */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    <Layers size={15} color="#8b5a2b" /> Production Stage *
                  </label>
                  <select
                    className="form-input"
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem', background: '#f8fafc', color: '#0f172a', fontWeight: 600 }}
                    value={assignForm.stage}
                    onChange={e => setAssignForm({ ...assignForm, stage: e.target.value })}
                    required
                  >
                    <option value="sanding">🔨 Sanding Stage (From Raw Stock)</option>
                    <option value="polishing">✨ Polishing Stage (From Sanded Stock)</option>
                    <option value="packaging">📦 Packaging Stage (From Polished Stock)</option>
                  </select>
                </div>

                {/* Stock Item */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    <Boxes size={15} color="#8b5a2b" /> Select Source Stock Item *
                  </label>
                  <select
                    className="form-input"
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem', background: '#fff', color: '#0f172a' }}
                    value={assignForm.stock_item}
                    onChange={e => {
                      const sel = stockItems.find(s => s.id === e.target.value);
                      setAssignForm({
                        ...assignForm,
                        stock_item: e.target.value,
                        assigned_qty: sel ? sel.quantity : ''
                      });
                    }}
                    required
                  >
                    <option value="">-- Choose Stock Item --</option>
                    {stockItems
                      .filter(s => {
                        if (assignForm.stage === 'sanding') return s.stock_type === 'raw';
                        if (assignForm.stage === 'polishing') return s.stock_type === 'sanded';
                        if (assignForm.stage === 'packaging') return s.stock_type === 'polished';
                        return true;
                      })
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.style_no} - {s.item_name} ({s.quantity} {s.unit} available)
                        </option>
                      ))}
                  </select>
                </div>

                {/* Contractor */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    <User size={15} color="#8b5a2b" /> Assign to Contractor *
                  </label>
                  <select
                    className="form-input"
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: contractors.length > 0 ? '1.5px solid #cbd5e1' : '1.5px solid #fca5a5', fontSize: '0.92rem', background: '#fff', color: '#0f172a' }}
                    value={assignForm.contractor}
                    onChange={e => setAssignForm({ ...assignForm, contractor: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Contractor --</option>
                    {contractors.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.first_name ? `${c.first_name} ${c.last_name || ''}` : c.username} ({c.username})
                      </option>
                    ))}
                  </select>
                  {contractors.length === 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#fef2f2', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                      ⚠️ No contractors found. Create contractor users in User Management.
                    </div>
                  )}
                </div>

                {/* Quantity */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    <ClipboardCheck size={15} color="#8b5a2b" /> Quantity to Assign *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem', background: '#fff', color: '#0f172a', fontWeight: 600 }}
                    value={assignForm.assigned_qty}
                    onChange={e => setAssignForm({ ...assignForm, assigned_qty: e.target.value })}
                    placeholder="Enter pieces quantity..."
                    required
                  />
                </div>

                {/* Notes */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    <FileText size={15} color="#8b5a2b" /> Notes / Instructions
                  </label>
                  <textarea
                    className="form-input"
                    rows="2"
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', background: '#fff', color: '#0f172a', resize: 'vertical' }}
                    value={assignForm.contractor_notes}
                    onChange={e => setAssignForm({ ...assignForm, contractor_notes: e.target.value })}
                    placeholder="Any specific instructions for contractor..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAssignModal(false)} style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', fontWeight: 700, background: 'linear-gradient(135deg, #8b5a2b 0%, #6d421e 100%)', boxShadow: '0 4px 12px rgba(139, 90, 43, 0.3)' }}>
                  Confirm & Assign Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Supervisor Quality Check Inspection ── */}
      {showQCModal && selectedJob && (
        <div className="modal-overlay" onClick={() => setShowQCModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px', padding: 0 }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.75rem',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              borderBottom: '1px solid #bbf7d0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: '#16a34a', color: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(22, 163, 74, 0.25)'
                }}>
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#14532d' }}>Quality Control Inspection</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#166534', fontWeight: 500 }}>Verify contractor work & enter QC results</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQCModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.9)', border: '1px solid #bbf7d0',
                  borderRadius: '50%', width: '34px', height: '34px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#166534', transition: 'all 0.2s'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleQCSubmit} style={{ padding: '1.5rem 1.75rem' }}>
              {/* Job summary card */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', fontSize: '0.85rem' }}>
                <div><span style={{ color: '#64748b' }}>Style No:</span> <strong style={{ color: '#0f172a' }}>{selectedJob.style_no}</strong></div>
                <div><span style={{ color: '#64748b' }}>Contractor:</span> <strong style={{ color: '#0f172a' }}>{selectedJob.contractor_name}</strong></div>
                <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#64748b' }}>Item:</span> <strong style={{ color: '#0f172a' }}>{selectedJob.item_name}</strong></div>
                <div style={{ gridColumn: '1 / -1', paddingTop: '0.3rem', borderTop: '1px dashed #cbd5e1', fontWeight: 700, color: '#8b5a2b' }}>
                  Assigned Quantity: {parseFloat(selectedJob.assigned_qty)} {selectedJob.unit}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ color: '#16a34a', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle size={16} /> Passed Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid #86efac', fontSize: '0.95rem', background: '#f0fdf4', color: '#14532d', fontWeight: 700 }}
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
                  <label className="form-label" style={{ color: '#dc2626', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <XCircle size={16} /> Rejected / Rework Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid #fca5a5', fontSize: '0.95rem', background: '#fef2f2', color: '#991b1b', fontWeight: 700 }}
                    value={qcForm.rejected_qty}
                    onChange={e => setQCForm({ ...qcForm, rejected_qty: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, color: '#334155', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={15} color="#64748b" /> Inspection Feedback / Rework Notes
                  </label>
                  <textarea
                    className="form-input"
                    rows="2"
                    style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', background: '#fff', color: '#0f172a', resize: 'vertical' }}
                    value={qcForm.notes}
                    onChange={e => setQCForm({ ...qcForm, notes: e.target.value })}
                    placeholder="Reasons for rejection / rework requirements..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowQCModal(false)} style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', fontWeight: 700, background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)' }}>
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
