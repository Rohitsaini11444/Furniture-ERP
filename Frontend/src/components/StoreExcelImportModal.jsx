import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Download, UploadCloud, CheckCircle, AlertTriangle, X, RefreshCw,
  Layers, Package, ArrowDownRight, ArrowUpRight, Undo2, Copy, Check, Info,
  Sparkles, ShieldCheck, ShieldAlert, ArrowRight, CornerDownRight, Database
} from 'lucide-react';
import api from '../api/axios';

export default function StoreExcelImportModal({ isOpen, onClose, onImportSuccess }) {
  const [activeTab, setActiveTab] = useState('unified'); // 'unified' | 'items' | 'material_in' | 'daily_issue' | 'material_return'
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [result, setResult] = useState(null);
  const [errorData, setErrorData] = useState(null);
  const [errorFilterSheet, setErrorFilterSheet] = useState('ALL');
  const [copiedErrors, setCopiedErrors] = useState(false);
  const progressTimerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setResult(null);
      setErrorData(null);
      setUploading(false);
      setProgressPercent(0);
      setProgressStage('');
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    }
  }, [isOpen]);

  const handleDownloadTemplate = async () => {
    try {
      const typeParam = activeTab === 'unified' ? 'unified_master' : activeTab;
      const response = await api.get(`/store/export-template/?type=${typeParam}`, {
        responseType: 'blob'
      });
      const filename = activeTab === 'unified' ? 'Store_Master_Import_Template.xlsx' : `store_${activeTab}_template.xlsx`;
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
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
      setErrorData(null);
    }
  };

  const startProgressSimulation = () => {
    setProgressPercent(15);
    setProgressStage('1/5: Uploading & Parsing Excel Worksheets...');

    const stages = [
      { pct: 35, stage: '2/5: Extracting & Staging Item Master & Entities...' },
      { pct: 60, stage: '3/5: Cross-referencing Relational Integrity (Material In & Daily Issues)...' },
      { pct: 85, stage: '4/5: Validating Positive Quantities & Foreign Key Mappings...' },
      { pct: 95, stage: '5/5: Executing Atomic Database Commit & Synchronizing Stock Balances...' },
    ];

    let currentIdx = 0;
    progressTimerRef.current = setInterval(() => {
      if (currentIdx < stages.length) {
        setProgressPercent(stages[currentIdx].pct);
        setProgressStage(stages[currentIdx].stage);
        currentIdx++;
      }
    }, 450);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorData({ message: 'Please select an Excel (.xlsx, .xls) file to import.' });
      return;
    }

    setUploading(true);
    setErrorData(null);
    setResult(null);
    startProgressSimulation();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('import_type', activeTab);

    try {
      const res = await api.post('/store/import-excel/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setProgressPercent(100);
      setProgressStage('Import Complete! 100%');
      setTimeout(() => {
        setResult(res.data);
        setUploading(false);
        if (onImportSuccess) onImportSuccess();
      }, 300);
    } catch (err) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setUploading(false);
      setProgressPercent(0);
      setProgressStage('');
      console.error('Excel import error:', err);

      const resData = err.response?.data;
      let parsedErrors = [];
      let mainMessage = '';

      if (typeof resData === 'string') {
        const titleMatch = resData.match(/<title>(.*?)<\/title>/i);
        const excMatch = resData.match(/exception_value[^>]*>([^<]+)/i) || resData.match(/(?:FieldError|IntegrityError|ValueError|KeyError|Exception): ([^\n<]+)/i);
        const title = titleMatch ? titleMatch[1].replace(/at \/api\/.*$/, '').trim() : '';
        const detail = excMatch ? excMatch[1].trim() : '';
        
        mainMessage = detail ? `${title ? title + ': ' : ''}${detail}` : (title || 'Server encountered an unexpected error while reading the Excel file.');
        parsedErrors = [{
          sheet: getTabLabelText(importType),
          row: '-',
          field: 'Server Processing',
          error: mainMessage
        }];
      } else if (resData && typeof resData === 'object') {
        mainMessage = resData.message || resData.error || resData.detail || 'Validation stopped: Errors detected in the Excel file.';
        
        if (Array.isArray(resData.errors) && resData.errors.length > 0) {
          parsedErrors = resData.errors.map((e, i) => {
            if (typeof e === 'string') {
              const rowMatch = e.match(/Row\s*(\d+):?\s*(.*)/i);
              return {
                sheet: getTabLabelText(importType),
                row: rowMatch ? rowMatch[1] : '-',
                field: 'Row Data',
                error: rowMatch ? rowMatch[2] : e
              };
            }
            return {
              sheet: e.sheet || getTabLabelText(importType),
              row: e.row || '-',
              field: e.field || 'Data Value',
              error: e.error || e.message || JSON.stringify(e)
            };
          });
        } else if (resData.error || resData.detail) {
          parsedErrors = [{
            sheet: getTabLabelText(importType),
            row: '-',
            field: 'Validation Rule',
            error: resData.error || resData.detail
          }];
        }
      } else {
        mainMessage = err.message || 'Network error: Failed to connect to server. Please check your internet/server status.';
        parsedErrors = [{
          sheet: getTabLabelText(importType),
          row: '-',
          field: 'Network / Connection',
          error: mainMessage
        }];
      }

      setErrorData({
        message: mainMessage,
        total_errors: parsedErrors.length || 1,
        errors: parsedErrors
      });
    }
  };

  const copyErrorsToClipboard = () => {
    if (!errorData?.errors || errorData.errors.length === 0) return;
    const report = [
      `=== STORE EXCEL IMPORT ERROR REPORT ===`,
      `Total Issues Found: ${errorData.total_errors || errorData.errors.length}`,
      `File: ${file?.name || 'Uploaded File'}`,
      `Date: ${new Date().toLocaleString()}`,
      `Message: ${errorData.message || 'Validation error'}`,
      `----------------------------------------`,
      ...errorData.errors.map((err, i) =>
        `${i + 1}. [${err.sheet || 'General'}] Row ${err.row || '-'}: Field "${err.field || '-'}" -> ${err.error || err}`
      ),
      `----------------------------------------`,
      `Action Required: Fix the items/contractors/suppliers listed above in your Excel sheet and re-upload.`
    ].join('\n');

    navigator.clipboard.writeText(report);
    setCopiedErrors(true);
    setTimeout(() => setCopiedErrors(false), 2500);
  };

  const getTabLabelText = (type) => {
    switch (type) {
      case 'unified': return '4-in-1 Unified Master';
      case 'items': return 'Store Item Master';
      case 'material_in': return 'Material Inward Receipts';
      case 'daily_issue': return 'Daily Outward Issues';
      case 'material_return': return 'Material Returns';
      default: return type;
    }
  };

  const filteredErrors = React.useMemo(() => {
    if (!errorData?.errors || !Array.isArray(errorData.errors)) return [];
    if (errorFilterSheet === 'ALL') return errorData.errors;
    return errorData.errors.filter(e => {
      const s = String(e.sheet || '').toLowerCase();
      return s.includes(errorFilterSheet.toLowerCase());
    });
  }, [errorData, errorFilterSheet]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 99999 }} onClick={onClose}>
      <div 
        className="modal-content modal-content-wide" 
        style={{
          width: '94%',
          maxWidth: '920px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '24px',
          padding: '2rem 2.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          background: '#ffffff'
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
            }}>
              <UploadCloud size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Store Excel Importer
                </h2>
                <span style={{
                  backgroundColor: '#f0fdf4',
                  color: '#16a34a',
                  border: '1px solid #bbf7d0',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '0.18rem 0.55rem',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <Sparkles size={12} /> Auto-Relational Sync
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                Import connected Item Masters, Contractors, Inwards, and Outward Issue ledgers in one file
              </p>
            </div>
          </div>
          <button 
            className="modal-close" 
            onClick={onClose} 
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.45rem',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          backgroundColor: '#f1f5f9',
          padding: '0.35rem',
          borderRadius: '14px',
          marginBottom: '1.25rem',
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }}>
          {[
            { id: 'unified', label: '⭐ Unified 4-in-1 Master', icon: Database, isHighlight: true },
            { id: 'items', label: 'Item Master', icon: Package },
            { id: 'material_in', label: 'Material Inward', icon: ArrowDownRight },
            { id: 'daily_issue', label: 'Daily Outward Issue', icon: ArrowUpRight },
            { id: 'material_return', label: 'Material Returns', icon: Undo2 },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setFile(null);
                  setResult(null);
                  setErrorData(null);
                }}
                style={{
                  flex: tab.isHighlight ? 1.4 : 1,
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: isActive && tab.isHighlight ? '1px solid #93c5fd' : '1px solid transparent',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? (tab.isHighlight ? '#1e40af' : '#0f172a') : '#64748b',
                  boxShadow: isActive ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={15} color={isActive ? (tab.isHighlight ? '#2563eb' : '#0f172a') : '#64748b'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Template Download / Information Banner */}
        {activeTab === 'unified' ? (
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '1.1rem 1.35rem',
            marginBottom: '1.35rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={18} color="#2563eb" />
                  <span>Step 1: Download Master 4-in-1 Excel Workbook Template</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', lineHeight: 1.45 }}>
                  This workbook connects 4 sheets automatically: <strong>Item Master</strong>, <strong>Contractors-Supplier</strong>, <strong>Material In</strong>, and <strong>Daily Issue Entry</strong>.
                </div>
                
                {/* 4 Sheets Feature Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', marginTop: '0.85rem' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.65rem', fontSize: '0.76rem' }}>
                    <strong style={{ color: '#1e3a8a' }}>1. Item Master:</strong> Item Codes, Names, Units, Rates, Status
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.65rem', fontSize: '0.76rem' }}>
                    <strong style={{ color: '#065f46' }}>2. Contractors & Suppliers:</strong> Left: Contractors, Right: Suppliers
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.65rem', fontSize: '0.76rem' }}>
                    <strong style={{ color: '#166534' }}>3. Material In:</strong> Inward Stock Receipts (Bills, Qtys & Rates)
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.65rem', fontSize: '0.76rem' }}>
                    <strong style={{ color: '#9a3412' }}>4. Daily Issue:</strong> Outward issues linked to Contractors & Units
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 1.15rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  whiteSpace: 'nowrap'
                }}
              >
                <Download size={16} />
                <span>Download Master Template (.xlsx)</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '14px',
            padding: '0.9rem 1.25rem',
            marginBottom: '1.25rem'
          }}>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0369a1' }}>
                Step 1: Download {getTabLabelText(activeTab)} Sample Template
              </div>
              <div style={{ fontSize: '0.78rem', color: '#0284c7', marginTop: '2px' }}>
                Pre-formatted single sheet template with sample headers and required fields.
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.95rem',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <Download size={15} />
              <span>Download Template</span>
            </button>
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleImportSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
              Step 2: Upload Filled Excel (.xlsx, .xls) File
            </label>
            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '1.4rem',
              backgroundColor: file ? '#f0fdf4' : '#fafafa',
              borderColor: file ? '#86efac' : '#cbd5e1',
              textAlign: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s ease'
            }}>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <UploadCloud size={32} color={file ? '#16a34a' : '#94a3b8'} style={{ margin: '0 auto 0.5rem auto' }} />
              {file ? (
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#15803d' }}>
                    Selected File: {file.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#16a34a', marginTop: '2px' }}>
                    Size: {(file.size / 1024).toFixed(1)} KB — Ready to process
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                    Drag & Drop your filled Excel workbook here, or <span style={{ color: '#2563eb', textDecoration: 'underline' }}>Browse</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '3px' }}>
                    Supports Microsoft Excel (.xlsx, .xls)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Progress Bar & Processing Steps */}
          {uploading && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.25rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <RefreshCw size={16} className="animate-spin" color="#2563eb" />
                  <span>{progressStage || 'Processing Excel Import...'}</span>
                </div>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#2563eb' }}>
                  {progressPercent}%
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                <div 
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                    borderRadius: '9999px',
                    transition: 'width 0.35s ease'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.5rem' }}>
                Please keep this window open while relational integrity validation is running.
              </div>
            </div>
          )}

          {/* Multi-Error Inspector Display */}
          {errorData && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '16px',
              padding: '1.25rem',
              marginBottom: '1.25rem'
            }}>
              {/* Error Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#991b1b' }}>
                      Validation Stopped: {errorData.total_errors || (errorData.errors?.length || 1)} Issue(s) Detected
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#b91c1c', marginTop: '2px' }}>
                      {errorData.message || 'The import was safely paused to protect your database. Fix the issues below in your Excel file and re-upload.'}
                    </div>
                  </div>
                </div>

                {errorData.errors && errorData.errors.length > 0 && (
                  <button
                    type="button"
                    onClick={copyErrorsToClipboard}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      backgroundColor: '#ffffff',
                      color: '#991b1b',
                      border: '1px solid #fca5a5',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.76rem',
                      cursor: 'pointer'
                    }}
                  >
                    {copiedErrors ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                    <span>{copiedErrors ? 'Copied Error Report!' : 'Copy Error Report'}</span>
                  </button>
                )}
              </div>

              {/* Sheet-wise Filter Tabs (if multiple sheets or many errors) */}
              {errorData.errors && errorData.errors.length > 1 && (
                <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  {['ALL', 'Item Master', 'Contractors-Supplier', 'Material In', 'Daily Issue', 'Return'].map(tabName => {
                    const count = tabName === 'ALL'
                      ? errorData.errors.length
                      : errorData.errors.filter(e => (e.sheet || '').toLowerCase().includes(tabName.toLowerCase())).length;
                    if (count === 0 && tabName !== 'ALL') return null;
                    const isSel = errorFilterSheet === tabName;
                    return (
                      <button
                        key={tabName}
                        type="button"
                        onClick={() => setErrorFilterSheet(tabName)}
                        style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          border: isSel ? '1px solid #dc2626' : '1px solid #fecaca',
                          backgroundColor: isSel ? '#dc2626' : '#ffffff',
                          color: isSel ? '#ffffff' : '#991b1b',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {tabName} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Errors Table */}
              {errorData.errors && errorData.errors.length > 0 ? (
                <div style={{ maxHeight: '250px', overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #fee2e2' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem 0.75rem', color: '#991b1b', fontWeight: 800 }}>Sheet / Context</th>
                        <th style={{ padding: '0.5rem 0.75rem', color: '#991b1b', fontWeight: 800 }}>Row #</th>
                        <th style={{ padding: '0.5rem 0.75rem', color: '#991b1b', fontWeight: 800 }}>Field</th>
                        <th style={{ padding: '0.5rem 0.75rem', color: '#991b1b', fontWeight: 800 }}>Problem & Fix Suggestion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(filteredErrors.length > 0 ? filteredErrors : errorData.errors).map((err, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #fef2f2' }}>
                          <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                            {err.sheet || 'General'}
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#dc2626', fontWeight: 800 }}>
                            {err.row && err.row !== '-' ? `Row ${err.row}` : '-'}
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#1e293b' }}>
                            <span style={{ backgroundColor: '#fee2e2', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#991b1b' }}>
                              {err.field || 'Data Value'}
                            </span>
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', color: '#475569' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{err.error || (typeof err === 'string' ? err : JSON.stringify(err))}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.82rem', fontWeight: 600 }}>
                  {errorData.message || 'Validation error encountered during processing.'}
                </div>
              )}
            </div>
          )}

          {/* Success Summary View */}
          {result && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '16px',
              padding: '1.35rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <CheckCircle size={24} color="#16a34a" />
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#166534' }}>
                    {result.message || 'Import Completed Successfully!'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
                    All relations across items, contractors, suppliers, and stock entries were connected cleanly.
                  </div>
                </div>
              </div>

              {result.summary && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '0.65rem',
                  marginTop: '0.85rem'
                }}>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '0.75rem', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Item Master</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
                      +{result.summary.items_created} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>({result.summary.items_skipped} existing)</span>
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '0.75rem', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Contractors</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
                      +{result.summary.contractors_created} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>({result.summary.contractors_skipped} existing)</span>
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '0.75rem', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Suppliers</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
                      +{result.summary.suppliers_created} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>({result.summary.suppliers_skipped} existing)</span>
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '0.75rem', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Material Inward</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
                      +{result.summary.material_in_created} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>({result.summary.material_in_skipped} skipped)</span>
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '0.75rem', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Daily Issues</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
                      +{result.summary.daily_issues_created} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>({result.summary.daily_issues_skipped} skipped)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              {result ? 'Close' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              style={{
                padding: '0.65rem 1.5rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: uploading || !file ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: uploading || !file ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: uploading || !file ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.35)'
              }}
            >
              {uploading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Processing Workbook...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>Upload & Process Excel Data</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
