import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  Truck, Search, Phone, Calendar, Clock, AlertTriangle, CheckCircle2,
  Hourglass, Plus, ChevronDown, ChevronUp, ChevronRight, FileText, UserCheck, MessageSquare,
  RefreshCw, ShieldAlert, ArrowRight, PhoneCall, History, Info, Building2, SlidersHorizontal, Package
} from 'lucide-react';
import Pagination from '../components/Pagination';
import { TableSkeleton, CardSkeleton } from '../components/TableSkeleton';
import TaxInvoiceEntryModal from '../components/TaxInvoiceEntryModal';
import SupplierManagerModal from '../components/SupplierManagerModal';
import GRNPrintoutModal from '../components/GRNPrintoutModal';
import { fmtQty } from '../utils/formatters';

function fmtINR(val) {
  if (!val && val !== 0) return '—';
  return `₹${parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

const floatVal = (val) => parseFloat(val || 0);

export default function VendorManagement() {
  const navigate = useNavigate();
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'red', 'yellow', 'green'
  const [expandedPoId, setExpandedPoId] = useState(null);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [poReceiptsMap, setPoReceiptsMap] = useState({});

  const handleToggleExpandPo = async (poId) => {
    if (expandedPoId === poId) {
      setExpandedPoId(null);
    } else {
      setExpandedPoId(poId);
      if (!poReceiptsMap[poId]) {
        try {
          const res = await api.get('/gate-inward-receipts/', { params: { supplier_po: poId } });
          setPoReceiptsMap(prev => ({ ...prev, [poId]: res.data.results || res.data }));
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  // Modal State for Date Extension
  const [extensionModalPo, setExtensionModalPo] = useState(null);
  const [extensionDays, setExtensionDays] = useState(5);
  const [customNewDate, setCustomNewDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [savingExtension, setSavingExtension] = useState(false);

  const [showTaxInvoiceModal, setShowTaxInvoiceModal] = useState(false);
  const [showSupplierManagerModal, setShowSupplierManagerModal] = useState(false);
  const [debitNotes, setDebitNotes] = useState([]);

  // Fetch Suppliers and POs (Debit notes fetched lazily)
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [posRes, suppRes] = await Promise.all([
        api.get('/supplier-pos/'),
        api.get('/suppliers/', { params: { nopage: true } })
      ]);
      setPos(posRes.data.results || posRes.data || []);
      setSuppliers(suppRes.data.results || suppRes.data || []);

      // Fetch Debit Notes in background (non-blocking)
      api.get('/supplier-debit-notes/').then(dnRes => {
        setDebitNotes(dnRes.data.results || dnRes.data || []);
      }).catch(err => console.error('Error fetching debit notes:', err));
    } catch (err) {
      console.error('Error loading vendor management data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleResolveRepaired = async (dnId) => {
    if (window.confirm('Mark this rejection as Repaired & Accepted? The passed quantity will be updated without issuing a financial Debit Note.')) {
      try {
        await api.post(`/supplier-debit-notes/${dnId}/resolve-repaired/`);
        fetchData();
      } catch (err) {
        console.error(err);
        alert('Failed to resolve debit note.');
      }
    }
  };

  const handleDownloadDebitNotePDF = async (dn) => {
    try {
      const res = await api.get(`/supplier-debit-notes/${dn.id}/pdf/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DebitNote_${dn.vch_no}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download Debit Note PDF.');
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Date Extension Submission
  const handleSaveExtension = async (e) => {
    e.preventDefault();
    if (!extensionModalPo) return;
    setSavingExtension(true);
    try {
      const payload = customNewDate
        ? { new_due_date: customNewDate, reason: extensionReason }
        : { days_added: extensionDays, reason: extensionReason };

      const res = await api.post(`/supplier-pos/${extensionModalPo.id}/extend-due-date/`, payload);

      // Update PO in local list
      setPos(prev => prev.map(p => (p.id === extensionModalPo.id ? { ...p, ...res.data } : p)));
      setExtensionModalPo(null);
      setExtensionReason('');
      setCustomNewDate('');
      setExtensionDays(5);
    } catch (err) {
      console.error('Failed to extend PO due date:', err);
      alert('Failed to update due date. Please try again.');
    } finally {
      setSavingExtension(false);
    }
  };

  // Quick Preset Click (+5, +7, +10, +15 days)
  const applyPresetDays = (days) => {
    setExtensionDays(days);
    setCustomNewDate('');
  };

  // Filtered POs
  const filteredPos = pos.filter(po => {
    // Supplier filter
    if (selectedSupplier && po.supplier !== selectedSupplier) {
      return false;
    }
    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const poNum = (po.po_number || '').toLowerCase();
      const suppName = (po.supplier_detail?.name || '').toLowerCase();
      const suppPhone = (po.supplier_detail?.phone || '').toLowerCase();
      const itemsMatch = (po.items || []).some(it => (it.description || '').toLowerCase().includes(q));
      if (!poNum.includes(q) && !suppName.includes(q) && !suppPhone.includes(q) && !itemsMatch) {
        return false;
      }
    }
    // Status Tab filter (Red, Yellow, Green)
    if (filterTab === 'red') return po.color_status === 'red';
    if (filterTab === 'yellow') return po.color_status === 'yellow';
    if (filterTab === 'green') return po.color_status === 'green';
    return true;
  });

  // KPI Metrics
  const totalCount = pos.length;
  const redCount = pos.filter(p => p.color_status === 'red').length;
  const yellowCount = pos.filter(p => p.color_status === 'yellow').length;
  const greenCount = pos.filter(p => p.color_status === 'green').length;

  // Pagination State (20 POs per page)
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterTab, selectedSupplier]);

  const paginatedPos = filteredPos.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <style>{`
        /* ── DESKTOP & MOBILE RESPONSIVE SWITCH ──────────────── */
        @media (min-width: 769px) {
          .vm-desktop-only {
            display: block !important;
          }
          .vm-mobile-only {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .vm-desktop-only {
            display: none !important;
          }
          .vm-mobile-only {
            display: block !important;
          }
        }

        /* ── MOBILE SPECIFIC STYLES ── */
        .vm-mob-kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.85rem;
          margin-bottom: 1.25rem;
        }
        .vm-mob-kpi-card {
          border-radius: 16px;
          padding: 1.1rem;
          cursor: pointer;
        }
        .vm-mob-icon-badge {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.75rem;
        }
        .vm-mob-filter-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          overflow-x: auto;
          white-space: nowrap;
          padding-bottom: 6px;
          margin-bottom: 1rem;
          -webkit-overflow-scrolling: touch;
        }
        .vm-mob-filter-pill {
          padding: 7px 16px;
          border-radius: 12px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #e2e8f0;
          background-color: #ffffff;
          color: #475569;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .vm-mob-filter-pill.active {
          background-color: #78350f;
          color: #ffffff;
          border-color: #78350f;
        }
        .vm-mob-po-card {
          border-radius: 18px;
          padding: 1.25rem;
          margin-bottom: 1.25rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          background-color: #ffffff;
        }
        .vm-mob-badge-ribbon {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 800;
        }
        .vm-mob-extend-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 15px;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 800;
          color: #ffffff;
          border: none;
          cursor: pointer;
        }
        .vm-mob-detail-box {
          background-color: #fafafa;
          border: 1px solid #f1f5f9;
          border-radius: 14px;
          padding: 1rem;
          margin-top: 1rem;
        }
      `}</style>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 🖥️ DESKTOP WEB UI (SHOWS FOR SCREEN WIDTH > 768px)                       */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <div className="vm-desktop-only">
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Truck size={28} color="#8b5a2b" />
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                Vendor & Supplier Management
              </h1>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0.2rem 0 0 0' }}>
              Track PO shipments, 15-day warning alerts, phone updates & +5 days extension management
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              className="btn-primary"
              onClick={() => navigate('/suppliers')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', backgroundColor: '#ffffff', color: '#8b5a2b', border: '1.5px solid #8b5a2b' }}
            >
              <Building2 size={16} /> Manage Suppliers
            </button>
            <button
              className="btn-primary"
              onClick={() => navigate('/record-tax-invoice')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', backgroundColor: '#8b5a2b', color: '#fff' }}
            >
              <FileText size={16} />Record Tax Invoice Inward (Multi-PO)
            </button>
            <button
              className="btn-secondary"
              onClick={fetchData}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              <RefreshCw size={15} /> Refresh Status
            </button>
          </div>
        </div>

        {/* ── 2-Day Supplier Repair Grace Period Alerts Section ── */}
        {debitNotes.filter(dn => dn.status === 'Grace Period').length > 0 && (
          <div style={{ backgroundColor: '#fffbe6', border: '1.5px solid #ffe58f', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#d48806', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="#d48806"/>Pending 2-Day Supplier Repair Grace Period Rejections ({debitNotes.filter(dn => dn.status === 'Grace Period').length})
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#8c6b00', margin: '0 0 0.75rem 0' }}>
              Supplier has requested 2 days to repair/bring back these rejected pieces before a financial Debit Note is issued.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {debitNotes.filter(dn => dn.status === 'Grace Period').map(dn => (
                <div key={dn.id} style={{ backgroundColor: '#ffffff', border: '1px solid #ffe58f', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                      {dn.supplier_name_str || 'Supplier'} — {dn.item_description || 'Rejected Items'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                      Inv Ref: {dn.original_inv_no || 'N/A'} | Rejected Qty: <strong style={{ color: '#dc2626' }}>{dn.rejected_qty} {dn.unit}</strong> | Total: <strong>₹{floatVal(dn.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d48806', backgroundColor: '#fff1b8', padding: '3px 8px', borderRadius: '6px' }}>
                      ⏳ {dn.grace_days_remaining} Days Grace Remaining
                    </span>
                    <button
                      onClick={() => handleResolveRepaired(dn.id)}
                      style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', color: '#389e0d', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ✓ Repaired & Accepted
                    </button>
                    <button
                      onClick={() => handleDownloadDebitNotePDF(dn)}
                      style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      📄 Download A4 PDF Debit Note
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Desktop KPI Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {/* Card 1 */}
          <div
            className="stat-card-animated"
            onClick={() => setFilterTab('all')}
            style={{
              backgroundColor: '#ffffff',
              border: filterTab === 'all' ? '2px solid #8b5a2b' : '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.1rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              transition: 'transform 0.2s',
              animationDelay: '100ms'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>TOTAL POS</span>
              <Building2 size={20} color="#8b5a2b" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', marginTop: '0.4rem' }}>
              {totalCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>All Supplier Orders</span>
          </div>

          {/* Card 2 */}
          <div
            className="stat-card-animated"
            onClick={() => setFilterTab('red')}
            style={{
              backgroundColor: '#fef2f2',
              border: filterTab === 'red' ? '2.5px solid #dc2626' : '1.5px solid #fecaca',
              borderRadius: '12px',
              padding: '1.1rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.1)',
              transition: 'transform 0.2s',
              animationDelay: '150ms'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#991b1b' }}>RED ALERTS (&le;15 Days)</span>
              <AlertTriangle size={22} color="#dc2626" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#dc2626', marginTop: '0.4rem' }}>
              {redCount}
            </div>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#b91c1c' }}>Requires Urgent Follow-up</span>
          </div>

          {/* Card 3 */}
          <div
            className="stat-card-animated"
            onClick={() => setFilterTab('yellow')}
            style={{
              backgroundColor: '#fefce8',
              border: filterTab === 'yellow' ? '2.5px solid #d97706' : '1.5px solid #fef08a',
              borderRadius: '12px',
              padding: '1.1rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.1)',
              transition: 'transform 0.2s',
              animationDelay: '200ms'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#854d0e' }}>IN PROCESS (&gt;15 Days)</span>
              <Hourglass size={20} color="#d97706" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706', marginTop: '0.4rem' }}>
              {yellowCount}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a16207' }}>On Schedule</span>
          </div>

          {/* Card 4 */}
          <div
            className="stat-card-animated"
            onClick={() => setFilterTab('green')}
            style={{
              backgroundColor: '#f0fdf4',
              border: filterTab === 'green' ? '2.5px solid #16a34a' : '1.5px solid #bbf7d0',
              borderRadius: '12px',
              padding: '1.1rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.1)',
              transition: 'transform 0.2s',
              animationDelay: '250ms'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534' }}>COMPLETED POs</span>
              <CheckCircle2 size={22} color="#16a34a" />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', marginTop: '0.4rem' }}>
              {greenCount}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d' }}>Gate Entry Received</span>
          </div>
        </div>

        {/* Desktop Search & Filters Bar */}
        <div className="filter-bar-animated" style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
            <Search size={17} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search PO No., Supplier Name, Phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {/* Supplier Dropdown */}
          <div style={{ minWidth: '200px' }}>
            <select
              className="form-input"
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
            >
              <option value="">All Vendors / Suppliers ({suppliers.length})</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter Buttons */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All', count: totalCount },
              { id: 'red', label: '🔴 Red Warning', count: redCount },
              { id: 'yellow', label: '🟡 In Process', count: yellowCount },
              { id: 'green', label: '🟢 Completed', count: greenCount },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setFilterTab(t.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  border: filterTab === t.id ? '2px solid #8b5a2b' : '1px solid #cbd5e1',
                  backgroundColor: filterTab === t.id ? '#8b5a2b' : '#ffffff',
                  color: filterTab === t.id ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
        </div>

        {/* Desktop PO Row Cards List */}
        {loading ? (
          <TableSkeleton rows={5} />
        ) : filteredPos.length === 0 ? (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '3rem 1rem',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <Truck size={42} color="#cbd5e1" style={{ marginBottom: '0.5rem' }} />
            <h3 style={{ fontSize: '1.1rem', color: '#334155' }}>No Purchase Orders Found</h3>
            <p style={{ fontSize: '0.85rem' }}>Try clearing filters or search query.</p>
          </div>
        ) : (
          <div className="table-fade-slide-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {paginatedPos.map((po, idx) => {
              const isRed = po.color_status === 'red';
              const isYellow = po.color_status === 'yellow';
              const isGreen = po.color_status === 'green';
              const isExpanded = expandedPoId === po.id;

              let rowBg = '#ffffff';
              let rowBorder = '#e2e8f0';
              let statusTextColor = '#1e293b';
              let badgeBg = '#f1f5f9';
              let badgeText = 'IN PROCESS';
              let badgeIcon = <Hourglass size={14} />;

              if (isRed) {
                rowBg = '#fff5f5';
                rowBorder = '#fca5a5';
                statusTextColor = '#991b1b';
                badgeBg = '#fee2e2';
                badgeText = po.days_remaining < 0 
                  ? `OVERDUE BY ${Math.abs(po.days_remaining)} DAYS` 
                  : `WARNING: ${po.days_remaining} DAYS REMAINING`;
                badgeIcon = <AlertTriangle size={15} color="#dc2626" />;
              } else if (isGreen) {
                rowBg = '#f0fdf4';
                rowBorder = '#86efac';
                statusTextColor = '#166534';
                badgeBg = '#dcfce7';
                badgeText = 'PO COMPLETED (ALL RECD)';
                badgeIcon = <CheckCircle2 size={15} color="#16a34a" />;
              } else if (isYellow) {
                rowBg = '#fefce8';
                rowBorder = '#fde047';
                statusTextColor = '#854d0e';
                badgeBg = '#fef9c3';
                badgeText = `IN PROCESS (${po.days_remaining !== null ? po.days_remaining + ' Days Left' : 'Active'})`;
                badgeIcon = <Hourglass size={15} color="#d97706" />;
              }

              const totalOrdered = po.total_ordered_qty || 0;
              const totalReceived = po.total_received_qty || 0;
              const progressPct = totalOrdered > 0 ? Math.min(100, Math.round((totalReceived / totalOrdered) * 100)) : 0;

              const dotColor = isRed ? '#ef4444' : isGreen ? '#10b981' : '#f59e0b';
              const dotBg = isRed ? '#fee2e2' : isGreen ? '#dcfce7' : '#fef3c7';

              return (
                <div
                  key={po.id}
                  className="table-row-stagger"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '0.95rem 1.25rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.015)',
                    transition: 'all 0.15s ease-in-out',
                    animationDelay: `${Math.min(idx * 30, 300)}ms`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.25rem',
                    flexWrap: 'wrap'
                  }}>
                    {/* Col 1: Status Circle Dot & PO Number */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '120px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: dotColor,
                        boxShadow: `0 0 0 3px ${dotBg}`,
                        flexShrink: 0
                      }} title={badgeText} />
                      <strong style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                        {po.po_number}
                      </strong>
                    </div>

                    {/* Col 2: Vendor / Supplier & Phone */}
                    <div style={{ minWidth: '180px', flex: '1 1 180px' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                        {po.supplier_detail?.name || '—'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#e11d48', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                        <Phone size={12} color="#e11d48" />
                        {po.supplier_detail?.phone ? (
                          <a href={`tel:${po.supplier_detail.phone}`} style={{ color: '#e11d48', textDecoration: 'none', fontWeight: 600 }}>
                            {po.supplier_detail.phone}
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>No phone listed</span>
                        )}
                      </div>
                    </div>

                    {/* Col 3: Issued & Due Dates */}
                    <div style={{ minWidth: '220px', display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.84rem' }}>
                      <div>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>Issued: </span>
                        <span style={{ color: '#334155', fontWeight: 600 }}>{po.po_date || '—'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>Due: </span>
                        <strong style={{ color: isRed ? '#dc2626' : '#1e293b', fontWeight: 800 }}>{po.due_date || 'Not set'}</strong>
                      </div>
                    </div>

                    {/* Col 4: Progress Bar & Total Amount */}
                    <div style={{ minWidth: '260px', flex: '1 1 260px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                        <span>Received</span>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{totalReceived} / {totalOrdered} pcs ({progressPct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '7px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${progressPct}%`,
                            height: '100%',
                            backgroundColor: dotColor,
                            borderRadius: '999px',
                            transition: 'width 0.4s ease'
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                        Total Amount: <strong style={{ color: '#1e293b', fontWeight: 800 }}>{fmtINR(po.total_amount)}</strong>
                      </div>
                    </div>

                    {/* Col 5: Actions (+5 Days & View Details Button) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setExtensionModalPo(po);
                          setExtensionDays(5);
                          setExtensionReason('');
                          setCustomNewDate('');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '8px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          backgroundColor: isRed ? '#fef2f2' : '#fff7ed',
                          color: isRed ? '#dc2626' : '#c2410c',
                          border: isRed ? '1px solid #fecaca' : '1px solid #ffedd5',
                          cursor: 'pointer'
                        }}
                        title="Extend due date by +5 days"
                      >
                        +5 Days
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleExpandPo(po.id)}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '0.4rem 0.85rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#334155',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        {isExpanded ? 'Hide Details' : 'View Items & Logs'}
                      </button>
                    </div>
                  </div>

                  {/* Desktop Expanded Drawer */}
                  {isExpanded && (
                    <div style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: `1px solid ${rowBorder}`,
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      padding: '1rem'
                    }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={16} color="#8b5a2b" /> Order Line Items & Gate Received Qty
                      </h4>

                      {po.items && po.items.length > 0 ? (
                        <div className="table-responsive" style={{ marginBottom: '1.25rem' }}>
                          <table className="data-table" style={{ fontSize: '0.82rem' }}>
                            <thead>
                              <tr>
                                <th>Description of Goods</th>
                                <th style={{ textAlign: 'right' }}>Ordered Qty</th>
                                <th style={{ textAlign: 'right' }}>Passed Qty (Gate Entry)</th>
                                <th style={{ textAlign: 'right' }}>Rate (₹)</th>
                                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {po.items.map((it, idx) => (
                                <tr key={it.id || idx}>
                                  <td style={{ fontWeight: 600 }}>{it.description}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{it.quantity} {it.unit}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 800, color: it.passed_quantity >= it.quantity ? '#16a34a' : '#d97706' }}>
                                    {it.passed_quantity || 0} {it.unit}
                                  </td>
                                  <td style={{ textAlign: 'right' }}>₹{it.rate}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{it.amount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No items listed for this PO.</p>
                      )}

                      {/* Partial Delivery Rounds (GRN History) */}
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginTop: '1.25rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Package size={16} color="#059669" /> Partial Delivery Rounds & Goods Received Notes (GRN)
                      </h4>

                      {poReceiptsMap[po.id] && poReceiptsMap[po.id].length > 0 ? (
                        <div className="table-responsive" style={{ marginBottom: '1.25rem' }}>
                          <table className="data-table" style={{ fontSize: '0.82rem' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#ecfdf5', color: '#047857' }}>
                                <th>GRN #</th>
                                <th>Round #</th>
                                <th>Date</th>
                                <th>Supplier Inv / Challan #</th>
                                <th>Vehicle #</th>
                                <th style={{ textAlign: 'right' }}>Passed Qty</th>
                                <th style={{ textAlign: 'right' }}>Rejected Qty</th>
                                <th style={{ textAlign: 'center' }}>Voucher</th>
                              </tr>
                            </thead>
                            <tbody>
                              {poReceiptsMap[po.id].map(rcpt => (
                                <tr key={rcpt.id}>
                                  <td style={{ fontWeight: 800, color: '#059669' }}>{rcpt.grn_number || 'GRN-PARTIAL'}</td>
                                  <td style={{ fontWeight: 700 }}>Round #{rcpt.round_number || 1}</td>
                                  <td>{rcpt.receipt_date}</td>
                                  <td style={{ fontWeight: 600 }}>{rcpt.supplier_invoice_no || rcpt.challan_no || '—'}</td>
                                  <td>{rcpt.vehicle_no || '—'}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>{rcpt.passed_qty} {rcpt.po_item_unit || 'pcs'}</td>
                                  <td style={{ textAlign: 'right', fontWeight: 800, color: rcpt.rejected_qty > 0 ? '#dc2626' : '#64748b' }}>
                                    {rcpt.rejected_qty} {rcpt.po_item_unit || 'pcs'}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      className="btn-secondary"
                                      onClick={() => setSelectedGRN(rcpt)}
                                      style={{ fontSize: '0.74rem', padding: '3px 9px', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', borderColor: '#a7f3d0' }}
                                    >
                                      <FileText size={13} /> View GRN
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>No inward delivery rounds recorded yet for this PO.</p>
                      )}

                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <History size={16} color="#8b5a2b" /> Call Notes & Due Date Extension Audit Log
                      </h4>

                      {po.extension_logs && po.extension_logs.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {po.extension_logs.map(log => (
                            <div
                              key={log.id}
                              style={{
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '0.75rem',
                                fontSize: '0.8rem'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#334155' }}>
                                <span>➕ Extended +{log.days_added} Days (New Due Date: {log.new_due_date})</span>
                                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{new Date(log.created_at).toLocaleString()}</span>
                              </div>
                              <div style={{ color: '#475569', marginTop: '4px' }}>
                                <strong>Call Notes / Reason:</strong> {log.reason || 'No call notes recorded.'}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>No date extensions requested yet.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredPos.length / ITEMS_PER_PAGE)}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* 📱 MOBILE APP UI (SHOWS ONLY FOR SCREEN WIDTH <= 768px)                   */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <div className="vm-mobile-only">
        {/* Mobile 2x2 KPI Summary Cards */}
        <div className="vm-mob-kpi-grid">
          {/* Card 1: TOTAL POs */}
          <div
            className="vm-mob-kpi-card"
            onClick={() => setFilterTab('all')}
            style={{
              backgroundColor: filterTab === 'all' ? '#eff6ff' : '#f8fafc',
              border: filterTab === 'all' ? '2px solid #2563eb' : '1px solid #e2e8f0',
            }}
          >
            <div className="vm-mob-icon-badge" style={{ backgroundColor: '#dbeafe' }}>
              <FileText size={20} color="#2563eb" />
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1d4ed8', letterSpacing: '0.04em' }}>TOTAL POS</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1e293b', margin: '2px 0' }}>{totalCount}</div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>All Purchase Orders</div>
          </div>

          {/* Card 2: RED ALERTS */}
          <div
            className="vm-mob-kpi-card"
            onClick={() => setFilterTab('red')}
            style={{
              backgroundColor: filterTab === 'red' ? '#fee2e2' : '#fff5f5',
              border: filterTab === 'red' ? '2.5px solid #dc2626' : '1.5px solid #fecaca',
            }}
          >
            <div className="vm-mob-icon-badge" style={{ backgroundColor: '#fee2e2' }}>
              <AlertTriangle size={20} color="#dc2626" />
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#991b1b', letterSpacing: '0.04em' }}>RED ALERTS (&le;15 Days)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#dc2626', margin: '2px 0' }}>{redCount}</div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#b91c1c' }}>Require Urgent Follow-up</div>
          </div>

          {/* Card 3: IN PROCESS */}
          <div
            className="vm-mob-kpi-card"
            onClick={() => setFilterTab('yellow')}
            style={{
              backgroundColor: filterTab === 'yellow' ? '#fef3c7' : '#fffbeb',
              border: filterTab === 'yellow' ? '2.5px solid #d97706' : '1.5px solid #fde68a',
            }}
          >
            <div className="vm-mob-icon-badge" style={{ backgroundColor: '#fef3c7' }}>
              <Hourglass size={20} color="#d97706" />
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#854d0e', letterSpacing: '0.04em' }}>IN PROCESS (&gt;15 Days)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d97706', margin: '2px 0' }}>{yellowCount}</div>
            <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#854d0e' }}>On Schedule</div>
          </div>

          {/* Card 4: COMPLETED POs */}
          <div
            className="vm-mob-kpi-card"
            onClick={() => setFilterTab('green')}
            style={{
              backgroundColor: filterTab === 'green' ? '#dcfce7' : '#f0fdf4',
              border: filterTab === 'green' ? '2.5px solid #16a34a' : '1.5px solid #bbf7d0',
            }}
          >
            <div className="vm-mob-icon-badge" style={{ backgroundColor: '#dcfce7' }}>
              <CheckCircle2 size={20} color="#16a34a" />
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#166534', letterSpacing: '0.04em' }}>COMPLETED POs</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#16a34a', margin: '2px 0' }}>{greenCount}</div>
            <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#166534' }}>Successfully Received</div>
          </div>
        </div>

        {/* Mobile Filter Pills Bar */}
        <div className="vm-mob-filter-bar">
          <button
            className={`vm-mob-filter-pill ${filterTab === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            All ({totalCount})
          </button>
          <button
            className={`vm-mob-filter-pill ${filterTab === 'red' ? 'active' : ''}`}
            onClick={() => setFilterTab('red')}
            style={{ borderColor: filterTab === 'red' ? '#dc2626' : '#fecaca' }}
          >
            🔴 Red ({redCount})
          </button>
          <button
            className={`vm-mob-filter-pill ${filterTab === 'yellow' ? 'active' : ''}`}
            onClick={() => setFilterTab('yellow')}
            style={{ borderColor: filterTab === 'yellow' ? '#d97706' : '#fde68a' }}
          >
            🟡 In Process ({yellowCount})
          </button>
          <button
            className={`vm-mob-filter-pill ${filterTab === 'green' ? 'active' : ''}`}
            onClick={() => setFilterTab('green')}
            style={{ borderColor: filterTab === 'green' ? '#16a34a' : '#bbf7d0' }}
          >
            🟢 Completed ({greenCount})
          </button>
        </div>

        {/* Mobile Search Input */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search PO No., Supplier, Phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '0.88rem',
              color: '#1e293b',
              background: 'transparent'
            }}
          />
          {selectedSupplier ? (
            <button
              onClick={() => setSelectedSupplier('')}
              style={{ border: 'none', background: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Clear Filter
            </button>
          ) : (
            <SlidersHorizontal size={18} color="#94a3b8" style={{ flexShrink: 0 }} />
          )}
        </div>

        {/* Mobile PO List */}
        {loading ? (
          <TableSkeleton rows={5} />
        ) : filteredPos.length === 0 ? (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '3rem 1rem',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <Truck size={42} color="#cbd5e1" style={{ marginBottom: '0.5rem' }} />
            <h3 style={{ fontSize: '1.1rem', color: '#334155' }}>No Purchase Orders Found</h3>
            <p style={{ fontSize: '0.85rem' }}>Try clearing filters or search query.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {paginatedPos.map(po => {
              const isRed = po.color_status === 'red';
              const isYellow = po.color_status === 'yellow';
              const isGreen = po.color_status === 'green';
              const isExpanded = expandedPoId === po.id;

              let cardBg = '#ffffff';
              let cardBorder = '#e2e8f0';
              let badgeBg = '#f1f5f9';
              let badgeTextColor = '#334155';
              let badgeText = 'IN PROCESS';
              let badgeIcon = <Hourglass size={14} color="#d97706" />;
              let btnBg = '#78350f';

              if (isRed) {
                cardBg = '#fff8f8';
                cardBorder = '#fca5a5';
                badgeBg = '#fee2e2';
                badgeTextColor = '#991b1b';
                badgeText = po.days_remaining < 0 
                  ? `OVERDUE BY ${Math.abs(po.days_remaining)} DAYS` 
                  : ` WARNING: ${po.days_remaining} DAYS REMAINING`;
                badgeIcon = <AlertTriangle size={15} color="#dc2626" />;
                btnBg = '#dc2626';
              } else if (isGreen) {
                cardBg = '#f4fbf7';
                cardBorder = '#86efac';
                badgeBg = '#dcfce7';
                badgeTextColor = '#166534';
                badgeText = '✅ PO COMPLETED (ALL RECD)';
                badgeIcon = <CheckCircle2 size={15} color="#16a34a" />;
                btnBg = '#78350f';
              } else if (isYellow) {
                cardBg = '#fffdf5';
                cardBorder = '#fde047';
                badgeBg = '#fef9c3';
                badgeTextColor = '#854d0e';
                badgeText = `IN PROCESS (${po.days_remaining !== null ? po.days_remaining + ' Days Left' : 'Active'})`;
                badgeIcon = <Hourglass size={15} color="#d97706" />;
                btnBg = '#78350f';
              }

              const totalOrdered = po.total_ordered_qty || 0;
              const totalReceived = po.total_received_qty || 0;
              const progressPct = totalOrdered > 0 ? Math.min(100, Math.round((totalReceived / totalOrdered) * 100)) : 0;
              const goodsDesc = (po.items || []).map(it => `${it.description || 'Goods'} ${it.quantity} ${it.unit || 'pcs'}`).join(', ');

              const dotColor = isRed ? '#ef4444' : isGreen ? '#10b981' : '#f59e0b';
              const dotBg = isRed ? '#fee2e2' : isGreen ? '#dcfce7' : '#fef3c7';

              return (
                <div
                  key={po.id}
                  className="vm-mob-po-card"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: dotColor,
                        boxShadow: `0 0 0 3px ${dotBg}`,
                        flexShrink: 0
                      }} title={badgeText} />
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>
                        {po.po_number}
                      </h3>
                    </div>

                    <button
                      type="button"
                      className="vm-mob-extend-btn"
                      style={{ backgroundColor: isRed ? '#dc2626' : '#8b5a2b' }}
                      onClick={() => {
                        setExtensionModalPo(po);
                        setExtensionDays(5);
                        setExtensionReason('');
                        setCustomNewDate('');
                      }}
                    >
                      <Phone size={14} /> +5 Days
                    </button>
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#475569', marginBottom: '1rem' }}>
                    {po.supplier_detail?.name || 'Supplier'}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                        <Calendar size={13} color="#64748b" /> Order Date
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e293b' }}>
                        {po.po_date || '—'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                        <Calendar size={13} color={isRed ? '#dc2626' : '#64748b'} /> Required Date
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: isRed ? '#dc2626' : '#1e293b' }}>
                        {po.due_date || 'Not set'}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      <span>Received Pcs</span>
                      <strong style={{ color: '#1e293b' }}>{totalReceived} / {totalOrdered} pcs ({progressPct}%)</strong>
                    </div>
                    <div style={{ width: '100%', height: '7px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${progressPct}%`,
                          height: '100%',
                          backgroundColor: isGreen ? '#16a34a' : isRed ? '#dc2626' : '#d97706',
                          borderRadius: '999px',
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${isRed ? '#fecaca' : isGreen ? '#bbf7d0' : '#fef08a'}`, paddingTop: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Total Amount</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{fmtINR(po.total_amount)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedPoId(isExpanded ? null : po.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      width: '100%',
                      paddingTop: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    {isExpanded ? (
                      <>Hide Details <ChevronUp size={16} /></>
                    ) : (
                      <><ChevronRight size={16} /> View Items & Log</>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="vm-mob-detail-box">
                      <div style={{ marginBottom: '1.25rem' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.75rem 0' }}>
                          Order Line Items & Gate Received Qty
                        </h4>

                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                          DESCRIPTION OF GOODS
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#334155', lineHeight: '1.5', margin: '0 0 0.85rem 0' }}>
                          {goodsDesc || 'No item description available.'}
                        </p>

                        <div className="table-responsive">
                          <table className="data-table" style={{ fontSize: '0.78rem' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f8fafc' }}>
                                <th style={{ textAlign: 'center' }}>ORDERED QTY</th>
                                <th style={{ textAlign: 'center' }}>PASSED QTY (GATE ENTRY)</th>
                                <th style={{ textAlign: 'center' }}>RATE (₹)</th>
                                <th style={{ textAlign: 'center' }}>AMOUNT (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {po.items && po.items.length > 0 ? (
                                po.items.map((it, idx) => (
                                  <tr key={it.id || idx}>
                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{it.quantity} {it.unit}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>
                                      {it.passed_quantity || 0} {it.unit}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>₹{it.rate}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>₹{it.amount}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8' }}>No items recorded</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.75rem 0' }}>
                          Call Notes & Due Date Extension Audit Log
                        </h4>

                        {po.extension_logs && po.extension_logs.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {po.extension_logs.map(log => (
                              <div
                                key={log.id}
                                style={{
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  padding: '0.75rem',
                                  fontSize: '0.78rem'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#334155' }}>
                                  <span>➕ Extended +{log.days_added} Days (New Date: {log.new_due_date})</span>
                                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{new Date(log.created_at).toLocaleDateString()}</span>
                                </div>
                                <div style={{ color: '#475569', marginTop: '3px' }}>
                                  <strong>Call Notes:</strong> {log.reason || 'No call notes recorded.'}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No data available</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredPos.length / ITEMS_PER_PAGE)}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ── SHARED EXTENSION MODAL ───────────────────────────────────────────── */}
      {extensionModalPo && (
        <div className="modal-overlay" onClick={() => setExtensionModalPo(null)} style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '500px', borderRadius: '16px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PhoneCall size={20} color="#78350f" />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Vendor Phone Update & Extend Date</h2>
              </div>
              <button className="modal-close" onClick={() => setExtensionModalPo(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveExtension}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '0.85rem 1rem',
                  fontSize: '0.85rem'
                }}>
                  <div><strong>PO Number:</strong> <span style={{ color: '#78350f', fontWeight: 800 }}>{extensionModalPo.po_number}</span></div>
                  <div><strong>Vendor:</strong> {extensionModalPo.supplier_detail?.name} ({extensionModalPo.supplier_detail?.phone || 'No Phone'})</div>
                  <div><strong>Current Due Date:</strong> <span style={{ color: '#dc2626', fontWeight: 800 }}>📅 {extensionModalPo.due_date || 'Not set'}</span></div>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Quick Extension Presets:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem', marginTop: '0.4rem' }}>
                    {[5, 7, 10, 15].map(days => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => applyPresetDays(days)}
                        style={{
                          padding: '9px',
                          borderRadius: '10px',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          border: extensionDays === days && !customNewDate ? '2px solid #78350f' : '1px solid #cbd5e1',
                          backgroundColor: extensionDays === days && !customNewDate ? '#78350f' : '#ffffff',
                          color: extensionDays === days && !customNewDate ? '#ffffff' : '#334155',
                          cursor: 'pointer'
                        }}
                      >
                        +{days} Days {days === 5 && '(Recommended)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem' }}>Or Select Exact Custom Revised Date:</label>
                  <input
                    type="date"
                    className="form-input"
                    value={customNewDate}
                    onChange={e => setCustomNewDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Phone Call Notes / Reason for Extension *</label>
                  <textarea
                    rows={3}
                    className="form-input"
                    placeholder="e.g. Spoke to supplier on phone. They requested 5 extra days due to raw material dispatch delay."
                    value={extensionReason}
                    onChange={e => setExtensionReason(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn-secondary" onClick={() => setExtensionModalPo(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingExtension}
                  style={{ backgroundColor: '#78350f', borderColor: '#78350f', padding: '8px 20px', fontWeight: 800 }}
                >
                  {savingExtension ? 'Updating Due Date…' : 'Confirm & Save Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Tax Invoice Entry Modal ── */}
      <TaxInvoiceEntryModal
        isOpen={showTaxInvoiceModal}
        onClose={() => setShowTaxInvoiceModal(false)}
        onSaved={fetchData}
      />

      {/* ── Supplier Manager CRUD Modal ── */}
      <SupplierManagerModal
        isOpen={showSupplierManagerModal}
        onClose={() => setShowSupplierManagerModal(false)}
        onUpdated={fetchData}
      />

      {/* ── GRN Voucher Printout Modal ── */}
      <GRNPrintoutModal
        receipt={selectedGRN}
        onClose={() => setSelectedGRN(null)}
      />
    </div>
  );
}
