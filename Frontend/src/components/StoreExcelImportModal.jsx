import React, { useState } from 'react';
import { FileText, Download, UploadCloud, CheckCircle, AlertTriangle, X, RefreshCw, Layers, Package, ArrowDownRight, ArrowUpRight, Undo2 } from 'lucide-react';
import api from '../api/axios';

export default function StoreExcelImportModal({ isOpen, onClose, onImportSuccess }) {
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'material_in' | 'daily_issue' | 'material_return'
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get(`/store/export-template/?type=${activeTab}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `store_${activeTab}_template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download template:', err);
      alert('Failed to download template. Please try again.');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError('');
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an Excel or CSV file to import.');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('import_type', activeTab);

    try {
      const res = await api.post('/store/import-excel/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      console.error('Excel import error:', err);
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to process Excel file.');
    } finally {
      setUploading(false);
    }
  };

  const getTabLabelText = (type) => {
    switch (type) {
      case 'items': return 'Store Item Master';
      case 'material_in': return 'Material Inward Receipts';
      case 'daily_issue': return 'Daily Outward Issues';
      case 'material_return': return 'Material Returns';
      default: return type;
    }
  };

  const renderTabHeader = (type) => {
    const isActive = activeTab === type;
    switch (type) {
      case 'items':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <Package size={15} color={isActive ? '#2563eb' : '#64748b'} />
            <span>Store Item Master</span>
          </span>
        );
      case 'material_in':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <ArrowDownRight size={15} color={isActive ? '#16a34a' : '#64748b'} />
            <span>Material Inward Receipts</span>
          </span>
        );
      case 'daily_issue':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <ArrowUpRight size={15} color={isActive ? '#ea580c' : '#64748b'} />
            <span>Daily Outward Issues</span>
          </span>
        );
      case 'material_return':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <Undo2 size={15} color={isActive ? '#ca8a04' : '#64748b'} />
            <span>Material Returns</span>
          </span>
        );
      default:
        return type;
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 99999 }} onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '680px', borderRadius: '16px', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UploadCloud size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Bulk Excel Importer
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Import store records in bulk to populate inventory balances
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#f8fafc', padding: '0.35rem', borderRadius: '10px', marginBottom: '1.25rem', overflowX: 'auto' }}>
          {['items', 'material_in', 'daily_issue', 'material_return'].map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => { setActiveTab(tabKey); setFile(null); setResult(null); setError(''); }}
              style={{
                flex: 1,
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: activeTab === tabKey ? '#ffffff' : 'transparent',
                color: activeTab === tabKey ? '#1e293b' : '#64748b',
                boxShadow: activeTab === tabKey ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {renderTabHeader(tabKey)}
            </button>
          ))}
        </div>

        {/* Template Download Box */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '0.85rem 1.1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369a1' }}>
              Step 1: Download {getTabLabelText(activeTab)} Sample Template
            </div>
            <div style={{ fontSize: '0.78rem', color: '#0284c7', marginTop: '2px' }}>
              Pre-formatted Excel sheet with sample headers and required fields.
            </div>
          </div>
          <button
            onClick={handleDownloadTemplate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            <Download size={15} />
            <span>Download Template</span>
          </button>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleImportSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
              Step 2: Upload Filled Excel (.xlsx, .xls) File
            </label>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                backgroundColor: '#fafafa',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {error && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.82rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#166534', fontSize: '0.85rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.92rem', marginBottom: '0.4rem' }}>
                <CheckCircle size={18} color="#16a34a" />
                <span>{result.message}</span>
              </div>
              <div>Created: <strong>{result.created_count}</strong> | Updated: <strong>{result.updated_count}</strong> | Total Processed: <strong>{result.total_processed}</strong></div>
              {result.errors && result.errors.length > 0 && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #dcfce7', fontSize: '0.78rem', color: '#ca8a04' }}>
                  <strong>Warnings/Skipped Rows ({result.errors.length}):</strong>
                  <ul style={{ margin: '4px 0 0 1rem', padding: 0 }}>
                    {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: uploading || !file ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: uploading || !file ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {uploading && <RefreshCw size={16} className="animate-spin" />}
              <span>{uploading ? 'Processing Excel...' : 'Upload & Process Excel Data'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
