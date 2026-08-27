import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, Search, Filter, RefreshCw, Calendar, User, Eye, Download,
  Trash2, PlusCircle, Edit3, LogIn, FileSpreadsheet, Layers, CheckCircle2
} from 'lucide-react';
import api from '../api/axios';
import Pagination from '../components/Pagination';
import AuditDiffModal from '../components/AuditDiffModal';
import CustomSelect from '../components/CustomSelect';
import { CustomDatePicker } from '../components/CustomDatePicker';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE', label: 'CREATE (Created)' },
  { value: 'UPDATE', label: 'UPDATE (Updated)' },
  { value: 'DELETE', label: 'DELETE (Deleted)' },
  { value: 'LOGIN', label: 'LOGIN (Auth)' },
  { value: 'EXPORT', label: 'EXPORT (Excel/PDF)' },
  { value: 'IMPORT', label: 'IMPORT (Bulk Upload)' }
];

const MODULE_OPTIONS = [
  { value: '', label: 'All ERP Modules' },
  { value: 'Store Management', label: 'Store Management' },
  { value: 'Buyers Directory', label: 'Buyers Directory' },
  { value: 'Buyer Masters', label: 'Buyer Masters' },
  { value: 'Performa Invoices (PI)', label: 'Performa Invoices (PI)' },
  { value: 'Supplier Purchase Orders', label: 'Supplier Purchase Orders' },
  { value: 'Supplier Management', label: 'Supplier Management' },
  { value: 'Sample Management', label: 'Sample Management' },
  { value: 'Finishing Module', label: 'Finishing Module' },
  { value: 'Production Pipeline', label: 'Production Pipeline' },
  { value: 'Unit Management', label: 'Unit Management' }
];

export default function AuditTrailPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Filter States
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log for Diff Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page on filter changes
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCurrentPage(1);
  }, [debouncedSearch, actionFilter, moduleFilter, startDate, endDate]);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: 50,
        search: debouncedSearch || undefined,
        action: actionFilter || undefined,
        module: moduleFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };
      const res = await api.get('/audit-logs/', { params });
      const data = res.data.results || res.data || [];
      setLogs(data);

      if (res.data.count !== undefined) {
        setTotalCount(res.data.count);
        const calculatedPages = Math.ceil(res.data.count / 50) || 1;
        setTotalPages(calculatedPages);
      } else {
        setTotalCount(Array.isArray(data) ? data.length : 0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, actionFilter, moduleFilter, startDate, endDate]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleInspectLog = (log) => {
    setSelectedLog(log);
    setIsDiffModalOpen(true);
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATE':
        return { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', icon: PlusCircle, label: 'CREATE' };
      case 'UPDATE':
        return { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd', icon: Edit3, label: 'UPDATE' };
      case 'DELETE':
        return { bg: '#fff1f2', color: '#be123c', border: '#fecdd3', icon: Trash2, label: 'DELETE' };
      case 'EXPORT':
        return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', icon: FileSpreadsheet, label: 'EXPORT' };
      case 'IMPORT':
        return { bg: '#fff7ed', color: '#c2410c', border: '#ffedd5', icon: Layers, label: 'IMPORT' };
      case 'LOGIN':
        return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', icon: LogIn, label: 'LOGIN' };
      default:
        return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', icon: Shield, label: action };
    }
  };

  // Stats calculation
  const totalDeletions = logs.filter(l => l.action === 'DELETE').length;
  const totalExports = logs.filter(l => l.action === 'EXPORT' || l.action === 'IMPORT').length;
  const uniqueUsersCount = new Set(logs.map(l => l.username)).size;

  return (
    <div style={{ padding: '1.25rem 0', maxWidth: '1400px', margin: '0 auto' }}>
      <style>{`
        .at-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .at-filter-bar {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          flex-wrap: wrap;
          background: #ffffff;
          padding: 1rem 1.25rem;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          margin-bottom: 1.5rem;
        }
        @media (max-width: 640px) {
          .at-filter-bar {
            flex-direction: column;
            align-items: stretch !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#8b5a2b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 6px -1px rgba(139, 90, 43, 0.2)',
            }}
          >
            <Shield size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              System Audit Trail & Security Logs
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Track user activities, data changes, file operations, and security events
            </p>
          </div>
        </div>

        <button
          onClick={fetchAuditLogs}
          disabled={loading}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#475569',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <RefreshCw size={15} className={loading ? 'spin-once' : ''} />
          <span>Refresh Audit Feed</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="at-kpi-grid">
        <div style={{ backgroundColor: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Activities</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>
            {totalCount.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#8b5a2b', fontWeight: 500 }}>System-wide events logged</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Active Users</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563eb', marginTop: '3px' }}>
            {uniqueUsersCount}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Distinct user accounts</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Data Deletions</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: '3px' }}>
            {totalDeletions}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 500 }}>Records removed</span>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Excel & Data Exports</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7e22ce', marginTop: '3px' }}>
            {totalExports}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#6b21a8', fontWeight: 500 }}>Report downloads</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="at-filter-bar">
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.45rem 0.75rem', backgroundColor: '#f8fafc' }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by user, IP, record name, note..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '0.875rem' }}
          />
        </div>

        {/* Action Select */}
        <div style={{ minWidth: '185px' }}>
          <CustomSelect
            value={actionFilter}
            onChange={(e) => { setActionFilter(e?.target ? e.target.value : e); setCurrentPage(1); }}
            placeholder="All Actions"
            options={ACTION_OPTIONS}
          />
        </div>

        {/* Module Select */}
        <div style={{ minWidth: '210px' }}>
          <CustomSelect
            value={moduleFilter}
            onChange={(e) => { setModuleFilter(e?.target ? e.target.value : e); setCurrentPage(1); }}
            placeholder="All ERP Modules"
            options={MODULE_OPTIONS}
          />
        </div>

        {/* Date pickers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '150px' }}>
            <CustomDatePicker
              placeholder="dd - mm - yyyy"
              value={startDate}
              onChange={(val) => { setStartDate(val || ''); setCurrentPage(1); }}
            />
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>to</span>
          <div style={{ minWidth: '150px' }}>
            <CustomDatePicker
              placeholder="dd - mm - yyyy"
              value={endDate}
              onChange={(val) => { setEndDate(val || ''); setCurrentPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* Main Audit Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
            Activity Log Entries ({totalCount})
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Page {currentPage} of {totalPages}</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead style={{ backgroundColor: '#faf8f5', borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Timestamp</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#334155' }}>User / Account</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Action & Module</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Affected Record</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 700, color: '#334155' }}>IP / Device</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Diff Inspection</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    Loading audit trail records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    No audit records match the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const b = getActionBadge(log.action);
                  const Icon = b.icon;
                  return (
                    <tr
                      key={log.id}
                      onClick={() => handleInspectLog(log)}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#faf8f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Timestamp */}
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: '#475569' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                        </div>
                      </td>

                      {/* User */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#f5efe6', color: '#8b5a2b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', border: '1px solid #e7d8c4', flexShrink: 0 }}>
                            {(log.username || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{log.username}</div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8b5a2b', textTransform: 'uppercase' }}>
                              {log.user_role}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action & Module */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              backgroundColor: b.bg,
                              color: b.color,
                              border: `1px solid ${b.border}`,
                              width: 'fit-content',
                            }}
                          >
                            <Icon size={12} /> {b.label}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                            {log.module_name}
                          </span>
                        </div>
                      </td>

                      {/* Affected Record */}
                      <td style={{ padding: '0.85rem 1rem', maxWidth: '280px' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.object_repr || log.object_id || 'N/A'}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {log.model_name}
                        </span>
                      </td>

                      {/* IP / Device */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', color: '#64748b' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                          {log.ip_address || 'Internal'}
                        </div>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px', fontSize: '0.72rem' }}>
                          {log.user_agent ? log.user_agent.split(' ')[0] : ''}
                        </div>
                      </td>

                      {/* Action button */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleInspectLog(log); }}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #d6c7b2',
                            backgroundColor: '#faf6f0',
                            color: '#8b5a2b',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={13} /> View Diff
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div style={{ padding: '0.85rem 1.25rem' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Diff Inspector Modal */}
      <AuditDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        log={selectedLog}
      />
    </div>
  );
}
