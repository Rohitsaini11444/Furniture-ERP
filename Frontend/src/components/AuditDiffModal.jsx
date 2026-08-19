import React from 'react';
import { X, Shield, Clock, User, Globe, FileText, ArrowRight, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

export default function AuditDiffModal({ isOpen, onClose, log }) {
  if (!isOpen || !log) return null;

  const changes = log.changes || {};
  const fileInfo = log.file_info || {};

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', label: 'Record Created' };
      case 'UPDATE': return { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd', label: 'Record Updated' };
      case 'DELETE': return { bg: '#fff1f2', color: '#be123c', border: '#fecdd3', label: 'Record Deleted' };
      case 'EXPORT': return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', label: 'Data Export' };
      case 'IMPORT': return { bg: '#fff7ed', color: '#c2410c', border: '#ffedd5', label: 'Data Import' };
      case 'LOGIN': return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', label: 'User Login' };
      default: return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', label: action };
    }
  };

  const badge = getActionColor(log.action);

  // Extract changes pairs
  const newValues = changes.new_values || {};
  const updatedFields = changes.updated_fields || {};
  const deletedSnapshot = changes.deleted_snapshot || {};

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <style>{`
        .adm-modal {
          width: 100%;
          max-width: 680px;
          max-height: 90vh;
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: fadeIn 0.2s ease-out;
        }
        @media (max-width: 640px) {
          .adm-modal {
            max-height: 94vh;
            border-radius: 12px;
          }
          .adm-header {
            padding: 1rem 1.25rem !important;
          }
          .adm-body {
            padding: 1rem !important;
          }
        }
      `}</style>

      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          className="adm-header"
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#faf8f5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: badge.bg,
                border: `1px solid ${badge.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: badge.color,
                flexShrink: 0,
              }}
            >
              <Shield size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: badge.bg,
                    color: badge.color,
                    border: `1px solid ${badge.border}`,
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {badge.label}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  {log.object_repr || `${log.model_name} ${log.object_id || ''}`}
                </h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Module: <strong>{log.module_name}</strong> • Model: {log.model_name}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="adm-body" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* Audit Metadata Box */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.85rem',
              backgroundColor: '#f8fafc',
              padding: '1rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              marginBottom: '1.25rem',
              fontSize: '0.825rem',
            }}
          >
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>Action By</span>
              <strong style={{ color: '#1e293b' }}>{log.username}</strong>
              <span style={{ fontSize: '0.72rem', color: '#8b5a2b', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                Role: {log.user_role || 'user'}
              </span>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>Timestamp</span>
              <strong style={{ color: '#1e293b' }}>
                {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
              </strong>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', fontWeight: 600 }}>Client IP Address</span>
              <strong style={{ color: '#1e293b', fontFamily: 'monospace' }}>{log.ip_address || 'Internal / N/A'}</strong>
            </div>
          </div>

          {/* Reason / Note if exists */}
          {log.reason && (
            <div
              style={{
                marginBottom: '1.25rem',
                padding: '0.85rem 1rem',
                backgroundColor: '#fff7ed',
                border: '1px solid #ffedd5',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: '#9a3412',
              }}
            >
              <strong>Audit Note / Reason:</strong> {log.reason}
            </div>
          )}

          {/* Files attached if any */}
          {Object.keys(fileInfo).length > 0 && (
            <div
              style={{
                marginBottom: '1.25rem',
                padding: '0.85rem 1rem',
                backgroundColor: '#f5efe6',
                border: '1px solid #e7d8c4',
                borderRadius: '10px',
                fontSize: '0.85rem',
              }}
            >
              <strong style={{ color: '#8b5a2b' }}>📁 File Metadata Captured:</strong>
              <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#444' }}>
                {Object.entries(fileInfo).map(([key, info]) => (
                  <div key={key}>
                    • <strong>{key}:</strong> {info.filename} ({info.size_bytes ? `${(info.size_bytes / 1024).toFixed(1)} KB` : 'Uploaded'})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Field Changes Table */}
          <div style={{ marginTop: '0.5rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
              Field-Level Snapshot Diffs
            </h4>

            {Object.keys(updatedFields).length > 0 && (
              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#475569', width: '35%' }}>Field</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Value Snapshot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(updatedFields).map(([field, val], idx) => (
                      <tr key={field} style={{ borderBottom: idx === Object.entries(updatedFields).length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#334155', fontFamily: 'monospace' }}>
                          {field}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#0f172a', wordBreak: 'break-all' }}>
                          {val === '' ? <span style={{ opacity: 0.5, fontStyle: 'italic' }}>Empty</span> : String(val)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {Object.keys(newValues).length > 0 && (
              <div style={{ overflowX: 'auto', border: '1px solid #bbf7d0', borderRadius: '10px', backgroundColor: '#f0fdf4' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                  <thead style={{ backgroundColor: '#dcfce7', borderBottom: '1px solid #bbf7d0' }}>
                    <tr>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#166534', width: '35%' }}>Initial Field</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#166534' }}>Created Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(newValues).map(([field, val], idx) => (
                      <tr key={field} style={{ borderBottom: idx === Object.entries(newValues).length - 1 ? 'none' : '1px solid #dcfce7' }}>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#14532d', fontFamily: 'monospace' }}>
                          {field}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#166534', wordBreak: 'break-all' }}>
                          {String(val)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {Object.keys(deletedSnapshot).length > 0 && (
              <div style={{ overflowX: 'auto', border: '1px solid #fecdd3', borderRadius: '10px', backgroundColor: '#fff1f2' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                  <thead style={{ backgroundColor: '#ffe4e6', borderBottom: '1px solid #fecdd3' }}>
                    <tr>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#9f1239', width: '35%' }}>Deleted Field</th>
                      <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 700, color: '#9f1239' }}>Value before Deletion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(deletedSnapshot).map(([field, val], idx) => (
                      <tr key={field} style={{ borderBottom: idx === Object.entries(deletedSnapshot).length - 1 ? 'none' : '1px solid #fecdd3' }}>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, color: '#881337', fontFamily: 'monospace' }}>
                          {field}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', color: '#9f1239', wordBreak: 'break-all' }}>
                          {String(val)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {Object.keys(updatedFields).length === 0 && Object.keys(newValues).length === 0 && Object.keys(deletedSnapshot).length === 0 && (
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#64748b', textAlign: 'center', fontSize: '0.85rem' }}>
                Action payload logged successfully. No structural model field diffs recorded.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            backgroundColor: '#faf8f5',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Close Diff Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
