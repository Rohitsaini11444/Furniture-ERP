import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Package, Layers, FileText, Calendar, UserCheck,
  Building2, CheckCircle2, Search, Filter, MapPin, Download, RefreshCw, ChevronRight
} from 'lucide-react';
import api from '../api/axios';

const STAGE_CONFIG = {
  raw: {
    key: 'raw',
    title: 'Raw Stock Details',
    subtitle: 'Passed Gate Receiving — Origin & PO Allocation',
    shortName: 'Raw Stock Details',
    stageBadge: 'Stage 1',
    color: '#0284c7',
    bgColor: '#e0f2fe',
    borderColor: '#38bdf8',
  },
  sanded: {
    key: 'sanded',
    title: 'Sanded Stock Details',
    subtitle: 'Passed Sanding QC — Manufacturing Stage Audit',
    shortName: 'Sanded',
    stageBadge: 'Stage 2',
    color: '#d97706',
    bgColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  polished: {
    key: 'polished',
    title: 'Polished Stock Details',
    subtitle: 'Passed Polishing QC — Finishing Stage Audit',
    shortName: 'Polished',
    stageBadge: 'Stage 3',
    color: '#7c3aed',
    bgColor: '#f3e8ff',
    borderColor: '#8b5cf6',
  },
  packaged: {
    key: 'packaged',
    title: 'Finished Goods Details',
    subtitle: 'Packaged & Inspected — Ready for Shipment',
    shortName: 'Finished',
    stageBadge: 'Stage 4',
    color: '#059669',
    bgColor: '#d1fae5',
    borderColor: '#10b981',
  },
};

export default function StockDetails() {
  const { stageKey = 'raw' } = useParams();
  const navigate = useNavigate();

  const currentStage = STAGE_CONFIG[stageKey.toLowerCase()] || STAGE_CONFIG.raw;

  const [loading, setLoading] = useState(true);
  const [breakdownData, setBreakdownData] = useState([]);
  const [totalStockCount, setTotalStockCount] = useState(0);
  const [totalPoCount, setTotalPoCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [poFilter, setPoFilter] = useState('all');
  const [unitsList, setUnitsList] = useState([]);
  const [unitFilter, setUnitFilter] = useState('all');

  // Responsive mobile detector (768px breakpoint)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchBreakdown = () => {
    setLoading(true);
    let url = `/stock/origin-breakdown/?stock_type=${currentStage.key}`;
    if (unitFilter !== 'all') {
      url += `&unit_id=${unitFilter}`;
    }
    Promise.all([
      api.get(url),
      api.get('/production-units/')
    ])
      .then(([res, unitRes]) => {
        setBreakdownData(res.data.po_breakdown || []);
        setTotalStockCount(res.data.total_stock_count || 0);
        setTotalPoCount(res.data.total_po_count || (res.data.po_breakdown ? res.data.po_breakdown.length : 0));
        setUnitsList(unitRes.data.results || unitRes.data || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBreakdown();
  }, [currentStage.key, unitFilter]);

  // Compute filtered batches and items based on search query and PO filter
  const filteredBatches = useMemo(() => {
    if (!breakdownData || breakdownData.length === 0) return [];

    return breakdownData.map(batch => {
      if (poFilter !== 'all' && batch.po_number !== poFilter) {
        return null;
      }

      const q = searchQuery.toLowerCase().trim();
      if (!q) return batch;

      const poMatch = (batch.po_number || '').toLowerCase().includes(q) ||
                      (batch.supplier_name || '').toLowerCase().includes(q) ||
                      (batch.supervisor || '').toLowerCase().includes(q);

      const matchingItems = (batch.items_list || []).filter(item =>
        poMatch ||
        (item.style_no || '').toLowerCase().includes(q) ||
        (item.item_name || '').toLowerCase().includes(q) ||
        (item.buyer_name || '').toLowerCase().includes(q) ||
        (item.location || '').toLowerCase().includes(q)
      );

      if (matchingItems.length === 0 && !poMatch) return null;

      return {
        ...batch,
        items_list: matchingItems,
        total_qty: matchingItems.reduce((acc, it) => acc + (parseFloat(it.quantity) || 0), 0)
      };
    }).filter(Boolean);
  }, [breakdownData, searchQuery, poFilter]);

  // Export to Excel function
  const handleExportExcel = () => {
    const csvRows = [
      ['Stage', 'PO Number', 'Supplier', 'Cleared Date', 'Supervisor', 'Style No', 'Item Name', 'Buyer', 'Location', 'Quantity', 'Unit']
    ];

    filteredBatches.forEach(batch => {
      batch.items_list.forEach(item => {
        csvRows.push([
          currentStage.title,
          `"${batch.po_number}"`,
          `"${batch.supplier_name}"`,
          `"${batch.clearance_date}"`,
          `"${batch.supervisor}"`,
          `"${item.style_no}"`,
          `"${item.item_name.replace(/"/g, '""')}"`,
          `"${item.buyer_name}"`,
          `"${item.location}"`,
          item.quantity,
          batch.unit
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentStage.title.replace(/\s+/g, '_')}_Summary.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{
      padding: isMobile ? '0.75rem 0.5rem 2rem' : '1.5rem 2rem',
      maxWidth: isMobile ? '100%' : '1400px',
      margin: '0 auto',
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      boxSizing: 'border-box'
    }}>
      
      {/* ── TOP HEADER NAVIGATION ── */}
      {isMobile ? (
        /* Mobile Specific Header */
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <button
              type="button"
              onClick={() => navigate('/stock')}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                flexShrink: 0
              }}
            >
              <ArrowLeft size={18} />
            </button>

            <div style={{ textAlign: 'center', flex: 1, padding: '0 0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {currentStage.title}
                </h1>
                <span style={{
                  backgroundColor: currentStage.bgColor,
                  color: currentStage.color,
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  border: `1px solid ${currentStage.borderColor}`
                }}>
                  {currentStage.stageBadge}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                {currentStage.subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={fetchBreakdown}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                flexShrink: 0
              }}
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      ) : (
        /* Desktop Web Header (Pristine Original Design) */
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: currentStage.bgColor,
                color: currentStage.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1.5px solid ${currentStage.borderColor}`
              }}>
                <Layers size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                    {currentStage.title}
                  </h1>
                  <span style={{
                    backgroundColor: currentStage.bgColor,
                    color: currentStage.color,
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    border: `1px solid ${currentStage.borderColor}`
                  }}>
                    {currentStage.stageBadge}
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                  {currentStage.subtitle}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={fetchBreakdown}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '0.6rem 1rem',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.88rem'
              }}
            >
              <RefreshCw size={16} /> Refresh Data
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.88rem',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)'
              }}
            >
              <Download size={16} /> Export Detailed Summary (.CSV)
            </button>
          </div>
        </div>
      )}

      {/* ── STAGE NAVIGATION TABS ── */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        overflowX: 'auto',
        paddingBottom: '4px',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none'
      }}>
        {Object.values(STAGE_CONFIG).map(st => {
          const isActive = st.key === currentStage.key;
          return (
            <button
              key={st.key}
              type="button"
              onClick={() => navigate(`/stock/details/${st.key}`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: isMobile ? '0.55rem 1rem' : '0.6rem 1.25rem',
                borderRadius: '12px',
                border: isActive ? `2px solid ${st.color}` : '1px solid #cbd5e1',
                backgroundColor: isActive ? st.bgColor : '#ffffff',
                color: isActive ? st.color : '#475569',
                fontWeight: isActive ? 800 : 600,
                fontSize: isMobile ? '0.82rem' : '0.88rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
            >
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: st.color
              }} />
              {isMobile ? st.shortName : st.title}
            </button>
          );
        })}
      </div>

      {/* ── KPI OVERVIEW CARDS ── */}
      {isMobile ? (
        /* Mobile KPI Layout */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, lineHeight: 1.2 }}>
                Total Stage Stock Quantity
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: currentStage.color, marginTop: '6px' }}>
                {totalStockCount} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>pcs</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.2 }}>
                Across physical inventory in stage
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, lineHeight: 1.2 }}>
                PO Batches
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                {totalPoCount} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Batches</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.2 }}>
                Grouped by requesting supplier PO
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
              Clearance Status
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#16a34a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={18} /> Verified & Audit Ready
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
              Fully passed stage quality checks
            </div>
          </div>
        </div>
      ) : (
        /* Desktop KPI Overview Cards (3 Equal Columns) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Stage Stock Quantity
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: currentStage.color, marginTop: '4px' }}>
              {totalStockCount} <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748b' }}>pcs</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
              Active physical inventory in stage
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              PO Batches
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
              {totalPoCount} <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748b' }}>Batches</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
              Grouped by requesting Supplier PO
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Clearance Status
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={20} /> Verified & Audit Ready
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
              Fully passed stage quality checks
            </div>
          </div>
        </div>
      )}

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      {isMobile ? (
        /* Mobile Search & Filter */
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          padding: '0.85rem',
          border: '1px solid #e2e8f0',
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search by Style No, Item Name, PO No, Supplier, Supervisor, Buyer..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem 0.65rem 2.4rem',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  outline: 'none',
                  backgroundColor: '#fafafa',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              title="Filter / Export"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <Filter size={18} />
            </button>
          </div>

          <select
            value={poFilter}
            onChange={e => setPoFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              fontSize: '0.88rem',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              fontWeight: 600,
              color: '#0f172a',
              boxSizing: 'border-box'
            }}
          >
            <option value="all">All PO Batches</option>
            {breakdownData.map((b, i) => (
              <option key={i} value={b.po_number}>{b.po_number} ({b.total_qty} pcs)</option>
            ))}
          </select>
        </div>
      ) : (
        /* Desktop Search Toolbar (Original Layout) */
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '1rem 1.25rem',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by Style No, Item Name, PO No, Supplier, Supervisor, Buyer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 1rem 0.55rem 2.4rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={16} color="#0284c7" />
            <select
              value={unitFilter}
              onChange={e => setUnitFilter(e.target.value)}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#0f172a'
              }}
            >
              <option value="all">All Factory Units</option>
              {unitsList.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} color="#64748b" />
            <select
              value={poFilter}
              onChange={e => setPoFilter(e.target.value)}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <option value="all">All PO Batches</option>
              {breakdownData.map((b, i) => (
                <option key={i} value={b.po_number}>{b.po_number} ({b.total_qty} pcs)</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── MAIN PO CONTENT LIST ── */}
      {loading ? (
        <div style={{ padding: '5rem', textAlign: 'center', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          Loading {currentStage.title} details...
        </div>
      ) : filteredBatches.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '20px', border: '1px dashed #cbd5e1' }}>
          <Package size={48} style={{ margin: '0 auto 0.75rem', color: '#94a3b8', opacity: 0.5 }} />
          <h3 style={{ margin: 0, color: '#334155', fontWeight: 800 }}>No Stock Batches Found</h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '4px' }}>
            {searchQuery || poFilter !== 'all' ? 'Try adjusting your search query or PO filter.' : `No items are currently registered in ${currentStage.title}.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filteredBatches.map((batch, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
                overflow: 'hidden'
              }}
            >
              {/* Batch Card Header */}
              <div style={{
                padding: isMobile ? '1rem' : '1.25rem 1.5rem',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: currentStage.bgColor,
                      color: currentStage.color,
                      fontWeight: 800,
                      fontSize: isMobile ? '0.95rem' : '1.1rem',
                      padding: '5px 14px',
                      borderRadius: '10px',
                      border: `1px solid ${currentStage.borderColor}`
                    }}>
                      <FileText size={18} />
                      {batch.po_number}
                    </span>

                    <span style={{
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: isMobile ? '0.85rem' : '1rem',
                      padding: '4px 14px',
                      borderRadius: '999px'
                    }}>
                      {batch.total_qty} {batch.unit} Total
                    </span>
                  </div>

                  {/* Metadata Chips */}
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    flexWrap: 'wrap',
                    gap: isMobile ? '0.4rem' : '1rem',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    marginTop: '4px',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569' }}>
                      <Building2 size={15} color="#64748b" />
                      <span>Supplier: <strong style={{ color: '#0f172a' }}>{batch.supplier_name}</strong></span>
                    </div>

                    {!isMobile && <span style={{ color: '#cbd5e1' }}>|</span>}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#0284c7' }}>
                      <Calendar size={15} />
                      <span>Stage Clearance Date: <strong style={{ color: '#0f172a' }}>{batch.clearance_date}</strong></span>
                    </div>

                    {!isMobile && <span style={{ color: '#cbd5e1' }}>|</span>}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#7c3aed' }}>
                      <UserCheck size={15} />
                      <span>Handling Supervisor: <strong style={{ color: '#5b21b6' }}>{batch.supervisor}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Section: Mobile Stacked View vs Pristine Desktop Table View */}
              {isMobile ? (
                /* Mobile Card List matching Image 3 reference */
                <div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.8fr 1fr 16px',
                    backgroundColor: '#f8fafc',
                    padding: '0.65rem 0.85rem',
                    borderTop: '1px solid #f1f5f9',
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#475569'
                  }}>
                    <div>Style No</div>
                    <div>Product / Description</div>
                    <div style={{ textAlign: 'right' }}>Buyer</div>
                    <div></div>
                  </div>

                  {batch.items_list.map((it, i) => (
                    <div key={i} style={{ borderBottom: i < batch.items_list.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1.8fr 1fr 16px',
                        padding: '0.85rem',
                        alignItems: 'flex-start',
                        fontSize: '0.82rem',
                        gap: '0.5rem'
                      }}>
                        <div style={{ fontWeight: 800, color: '#0284c7', wordBreak: 'break-word' }}>
                          {it.style_no}
                        </div>

                        <div style={{ color: '#334155', lineHeight: 1.35 }}>
                          <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{it.item_name}</div>
                          <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '4px' }}>
                            {it.buyer_name}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', color: '#475569', fontWeight: 600, fontSize: '0.8rem', wordBreak: 'break-word' }}>
                          {it.buyer_name}
                        </div>

                        <div style={{ textAlign: 'right', color: '#94a3b8', paddingTop: '2px' }}>
                          <ChevronRight size={16} />
                        </div>
                      </div>

                      <div style={{
                        backgroundColor: '#ffffff',
                        borderTop: '1px dashed #f1f5f9',
                        padding: '0.65rem 0.85rem 0.85rem',
                        fontSize: '0.8rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <MapPin size={14} color="#94a3b8" /> Storage Location
                          </span>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{it.location}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Calendar size={14} color="#94a3b8" /> Cleared Time
                          </span>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{it.created_at}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Package size={14} color="#94a3b8" /> Quantity
                          </span>
                          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                            {it.quantity} {batch.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Pristine Desktop Table View */
                <div style={{ padding: '1.25rem', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '1.5px solid #cbd5e1' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Style No</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Product Name / Description</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Buyer</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Storage Location</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Cleared Time</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.items_list.map((it, i) => (
                        <tr key={i} style={{ borderBottom: i < batch.items_list.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 800, color: currentStage.color }}>{it.style_no}</td>
                          <td style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 600, maxWidth: '300px' }}>{it.item_name}</td>
                          <td style={{ padding: '12px 14px', color: '#334155' }}>{it.buyer_name}</td>
                          <td style={{ padding: '12px 14px', color: '#64748b' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={13} color="#94a3b8" />
                              {it.location}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.82rem' }}>{it.created_at}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a', textAlign: 'right', fontSize: '0.95rem' }}>
                            {it.quantity} {batch.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
