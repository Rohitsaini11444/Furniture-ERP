import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Warehouse, Upload, Download, FileSpreadsheet, Plus, CheckCircle,
  AlertCircle, Save, Layers, DollarSign, Image as ImageIcon, Check, RefreshCw, FileText
} from 'lucide-react';
import api from '../api/axios';
import CustomFileUpload from '../components/CustomFileUpload';
import SearchableSelect from '../components/SearchableSelect';
import StoreCategoryModal from '../components/StoreCategoryModal';
import { FormSkeleton } from '../components/TableSkeleton';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { UnsavedChangesModal } from '../components/UnsavedChangesModal';

export default function StoreItemMasterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditing = Boolean(id);

  // Active Mode: 'form' | 'import'
  const [activeTab, setActiveTab] = useState('form');

  // Categories list
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Form Data State
  const [formData, setFormData] = useState({
    item_code: `IT${Math.floor(100 + Math.random() * 900)}`,
    item_name: '',
    category: '',
    unit: 'pcs',
    base_rate: '0.00',
    current_rate: '0.00',
    weight: '',
    default_status: 'charge',
    reorder_level: '10.00',
    remark: '',
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

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
    formType: 'store_item',
    formLabel: 'Store Item Master',
    getFormTitle: (data) => `${data?.item_code || 'IT'} - ${data?.item_name || 'New Store Item'}`,
    getFormData: () => formData,
    targetPath: '/store-management/item-master/new',
    onSaveForm: async () => {
      const formEl = document.getElementById('store-item-master-form');
      if (formEl) {
        formEl.requestSubmit();
        return true;
      }
      return false;
    }
  });

  useEffect(() => {
    if (location.state?.draftData) {
      setFormData(location.state.draftData);
      setIsDirty(true);
      if (location.state.draftId) {
        setCurrentDraftId(location.state.draftId);
      }
    }
  }, [location.state]);

  // Excel Import State
  const [importFile, setImportFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    // Fetch categories
    api.get('/store/categories/')
      .then(res => {
        const catList = res.data.results || res.data || [];
        setCategories(catList);
        if (!isEditing && catList.length > 0) {
          setFormData(prev => ({ ...prev, category: catList[0].id }));
        }
      })
      .catch(err => console.error('Failed to load categories:', err))
      .finally(() => setLoadingCategories(false));

    // If editing, load item details
    if (isEditing) {
      setLoading(true);
      api.get(`/store/items/${id}/`)
        .then(res => {
          const item = res.data;
          setFormData({
            item_code: item.item_code || '',
            item_name: item.item_name || '',
            category: item.category || '',
            unit: item.unit || 'pcs',
            base_rate: item.base_rate || '0.00',
            current_rate: item.current_rate || item.base_rate || '0.00',
            weight: item.weight || '',
            default_status: item.default_status || 'charge',
            reorder_level: item.reorder_level || '10.00',
            remark: item.remark || '',
          });
          setImagePreview(item.image || null);
        })
        .catch(err => setError('Failed to load item details.'))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    setIsDirty(true);
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'base_rate' && !isEditing) {
        next.current_rate = value;
      }
      return next;
    });
  };

  const handleImageChange = (file) => {
    setIsDirty(true);
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!formData.item_name.trim()) {
      setError('Item Name is required.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null && formData[key] !== undefined) {
        payload.append(key, formData[key]);
      }
    });

    if (imageFile) {
      payload.append('image', imageFile);
    }

    const req = isEditing
      ? api.patch(`/store/items/${id}/`, payload, { headers: { 'Content-Type': 'multipart/form-data' } })
      : api.post('/store/items/', payload, { headers: { 'Content-Type': 'multipart/form-data' } });

    req
      .then(() => {
        if (currentDraftId) clearDraft(currentDraftId);
        setIsDirty(false);
        setSuccessMsg(isEditing ? 'Store item updated successfully!' : 'Store item created successfully!');
        setTimeout(() => navigate('/store-management'), 1200);
      })
      .catch(err => {
        console.error('Failed to save store item:', err);
        setError(err.response?.data?.detail || err.response?.data?.item_code?.[0] || 'Failed to save store item. Please check inputs.');
      })
      .finally(() => setLoading(false));
  };

  // Excel Import Handlers
  const handleDownloadTemplate = () => {
    api.get('/store/items/download-template/', { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Store_Item_Master_Import_Template.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(err => alert('Failed to download template. Please try again.'));
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setImportFile(e.dataTransfer.files[0]);
    }
  };

  const handleImportExcelSubmit = (e) => {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    setError(null);
    setImportResult(null);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 85) {
          clearInterval(interval);
          return 85;
        }
        return prev + 15;
      });
    }, 150);

    const data = new FormData();
    data.append('file', importFile);

    api.post('/store/items/import-excel/', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
      .then(res => {
        clearInterval(interval);
        setUploadProgress(100);
        setTimeout(() => {
          setImportResult(res.data);
          setImportFile(null);
        }, 300);
      })
      .catch(err => {
        clearInterval(interval);
        setUploadProgress(0);
        setError(err.response?.data?.detail || 'Import failed. Please verify headers in Excel file.');
      })
      .finally(() => setImporting(false));
  };

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
      <style>{`
        @media (max-width: 768px) {
          .item-master-header-wrap {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .item-master-tab-switcher {
            width: 100% !important;
            display: flex !important;
          }
          .item-master-tab-switcher button {
            flex: 1 !important;
            justify-content: center !important;
            text-align: center !important;
            padding: 0.65rem 0.5rem !important;
          }
          .item-master-form-grid {
            grid-template-columns: 1fr !important;
          }
          .item-master-action-btns {
            flex-direction: column-reverse !important;
            width: 100% !important;
          }
          .item-master-action-btns button {
            width: 100% !important;
            justify-content: center !important;
            padding: 0.8rem 1rem !important;
          }
        }
      `}</style>

      {/* Top Header Bar */}
      <div className="item-master-header-wrap" style={{
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
              flexShrink: 0
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Store Registry
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              {isEditing ? '✏️ Edit Store Item Master' : '📦 New Store Item Master'}
            </h1>
          </div>
        </div>

        {/* Tab Toggle: Form Entry vs Import Excel */}
        {!isEditing && (
          <div className="item-master-tab-switcher" style={{
            display: 'flex',
            backgroundColor: '#e2e8f0',
            padding: '4px',
            borderRadius: '10px'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              style={{
                padding: '0.5rem 1.1rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'form' ? '#ffffff' : 'transparent',
                color: activeTab === 'form' ? '#0f172a' : '#64748b',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: activeTab === 'form' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Manual Form Entry
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              style={{
                padding: '0.5rem 1.1rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'import' ? '#ea580c' : 'transparent',
                color: activeTab === 'import' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: activeTab === 'import' ? '0 2px 4px rgba(234, 88, 12, 0.25)' : 'none'
              }}
            >
              <FileSpreadsheet size={16} /> Import Excel
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          color: '#991b1b',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          color: '#166534',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <CheckCircle size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── Main Form or Import Card ── */}
      {(loadingCategories || loading) ? (
        <FormSkeleton fields={8} />
      ) : activeTab === 'form' ? (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '1.75rem'
        }}>
          <form id="store-item-master-form" onSubmit={handleSubmitForm}>
            <div className="item-master-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {/* Item Code */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '0.4rem' }}>
                  Item Code *
                </label>
                <input
                  type="text"
                  name="item_code"
                  value={formData.item_code}
                  onChange={handleChange}
                  required
                  placeholder="e.g. IT-101"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Item Name */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '0.4rem' }}>
                  Item Name *
                </label>
                <input
                  type="text"
                  name="item_name"
                  value={formData.item_name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Fevicol SH 50kg, Sandpaper 120 Grit"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Category */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', margin: 0 }}>
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#8b5a2b',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      padding: 0,
                    }}
                  >
                    <Plus size={12} /> Add Category
                  </button>
                </div>
                <SearchableSelect
                  options={categories}
                  value={formData.category}
                  onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                  placeholder="Select Category..."
                  searchPlaceholder="Search category name..."
                  idKey="id"
                  titleKey="name"
                  pageSize={15}
                />
              </div>

              {/* Unit */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '0.4rem' }}>
                  Unit of Measurement *
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="pcs">pcs (Pieces)</option>
                  <option value="kg">kg (Kilograms)</option>
                  <option value="ltr">ltr (Liters)</option>
                  <option value="box">box (Box)</option>
                  <option value="set">set (Set)</option>
                  <option value="roll">roll (Roll)</option>
                  <option value="meter">meter (Meters)</option>
                </select>
              </div>

              {/* Base Rate */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '0.4rem' }}>
                  Master Base Rate (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="base_rate"
                  value={formData.base_rate}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Default Debit Status */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '0.4rem' }}>
                  Contractor Issue Status *
                </label>
                <select
                  name="default_status"
                  value={formData.default_status}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="charge">Chargeable (Debit from Contractor Billing)</option>
                  <option value="free">Free / Non-chargeable (Company Store Expense)</option>
                </select>
              </div>

              {/* Reorder Threshold */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '0.4rem' }}>
                  Reorder Level Threshold
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="reorder_level"
                  value={formData.reorder_level}
                  onChange={handleChange}
                  placeholder="10.00"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Weight */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '0.4rem' }}>
                  Unit Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="Optional"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Remarks */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '0.4rem' }}>
                  Remarks / Notes
                </label>
                <textarea
                  name="remark"
                  value={formData.remark}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Additional specifications or storage notes..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Image Upload */}
              <div style={{ gridColumn: '1 / -1' }}>
                <CustomFileUpload
                  label="Item Image (Optional — Drag & Drop Supported)"
                  accept="image/*"
                  singleFile={imageFile || imagePreview}
                  onChange={handleImageChange}
                  onRemoveNew={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="item-master-action-btns" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '2rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid #f1f5f9'
            }}>
              <button
                type="button"
                onClick={() => {
                  if (confirmExit('/store-management')) navigate('/store-management');
                }}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => handleSaveDraft()}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #ea580c',
                    backgroundColor: '#fff7ed',
                    color: '#c2410c',
                    fontWeight: 650,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <FileText size={16} /> Save as Draft
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.65rem 1.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)'
                }}
              >
                <Save size={18} />
                <span>{loading ? 'Saving...' : isEditing ? 'Update Item Master' : 'Save Item Master'}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '1.75rem'
        }}>
          {/* Excel Import Format Guide */}
          <div
            className="bulk-import-guide-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem',
              borderRadius: '12px',
              backgroundColor: '#fff7ed',
              border: '1px solid #ffedd5',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div className="bulk-import-guide-text" style={{ flex: '1 1 240px', minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#c2410c' }}>
                Bulk Excel Import Guide
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#9a3412', lineHeight: 1.45 }}>
                Upload an Excel file containing headers: <strong>Item Code, Item Name, Category Name, Unit, Base Rate, Reorder Level, Default Status</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="bulk-import-btn"
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                border: '1px solid #ea580c',
                backgroundColor: '#ffffff',
                color: '#ea580c',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}
            >
              <Download size={16} style={{ flexShrink: 0 }} />
              <span>Download Sample Template (.xlsx)</span>
            </button>
          </div>

          <form onSubmit={handleImportExcelSubmit}>
            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              style={{
                border: `2px dashed ${isDragOver ? '#ea580c' : '#cbd5e1'}`,
                backgroundColor: isDragOver ? '#fff7ed' : '#f8fafc',
                borderRadius: '14px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '1.5rem'
              }}
              onClick={() => document.getElementById('excel-file-input').click()}
            >
              <input
                id="excel-file-input"
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files && e.target.files[0]) setImportFile(e.target.files[0]);
                }}
              />
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                backgroundColor: '#ffedd5',
                color: '#ea580c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Upload size={28} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                {importFile ? importFile.name : 'Click to select or drag & drop Excel file (.xlsx, .csv)'}
              </h4>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                {importFile ? `${(importFile.size / 1024).toFixed(1)} KB` : 'Supports Microsoft Excel (.xlsx, .xls) and CSV format'}
              </p>
            </div>

            {/* Live Progress Bar Line */}
            {importing && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: '#ea580c', marginBottom: '0.4rem' }}>
                  <span>Processing & Checking Duplicate Records...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div style={{ height: '8px', backgroundColor: '#fed7aa', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${uploadProgress}%`,
                    height: '100%',
                    backgroundColor: '#ea580c',
                    transition: 'width 0.2s ease-in-out'
                  }} />
                </div>
              </div>
            )}

            {/* Import Result Summary Card */}
            {importResult && (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem' }}>
                  <CheckCircle size={20} />
                  <span>{importResult.detail}</span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.88rem', color: '#166534', flexWrap: 'wrap' }}>
                  <div><strong>Total Processed:</strong> {importResult.total_processed}</div>
                  <div><strong>Imported New Items:</strong> {importResult.imported}</div>
                  <div><strong>Duplicate Skipped:</strong> {importResult.duplicates_skipped}</div>
                </div>

                {importResult.skipped_items && importResult.skipped_items.length > 0 && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #bbf7d0', fontSize: '0.8rem', color: '#166534' }}>
                    <strong>Skipped Details:</strong>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '1.25rem' }}>
                      {importResult.skipped_items.map((item, idx) => (
                        <li key={idx}>Row {item.row}: {item.item_code} ({item.item_name}) — {item.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="submit"
                disabled={!importFile || importing}
                style={{
                  padding: '0.65rem 1.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: !importFile || importing ? '#94a3b8' : '#ea580c',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: !importFile || importing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 4px rgba(234, 88, 12, 0.2)'
                }}
              >
                {importing ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
                <span>{importing ? 'Processing File...' : 'Start Excel Import'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Creation Modal */}
      <StoreCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={(newCat) => {
          setCategories(prev => [...prev, newCat]);
          setFormData(prev => ({ ...prev, category: newCat.id }));
        }}
      />

      <UnsavedChangesModal
        isOpen={showExitModal}
        formLabel="Store Item Master"
        onSaveDraft={handleSaveDraft}
        onDiscard={handleDiscardAndExit}
        onCancel={handleCancelExit}
      />
    </div>
  );
}
