import React, { useState, useEffect } from 'react';
import { X, Warehouse, DollarSign, Image as ImageIcon, CheckCircle, AlertCircle, Save, Plus, Tag } from 'lucide-react';
import api from '../api/axios';
import CustomFileUpload from './CustomFileUpload';
import StoreCategoryModal from './StoreCategoryModal';

export default function StoreItemMasterModal({ isOpen, onClose, item, categories = [], onSuccess, onCategoryAdded }) {
  const [formData, setFormData] = useState({
    item_code: '',
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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryList, setCategoryList] = useState(categories);

  useEffect(() => {
    setCategoryList(categories);
  }, [categories]);

  useEffect(() => {
    if (item) {
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
      setImageFile(null);
    } else {
      setFormData({
        item_code: `IT${Math.floor(100 + Math.random() * 900)}`,
        item_name: '',
        category: categoryList && categoryList.length > 0 ? categoryList[0].id : '',
        unit: 'pcs',
        base_rate: '0.00',
        current_rate: '0.00',
        weight: '',
        default_status: 'charge',
        reorder_level: '10.00',
        remark: '',
      });
      setImageFile(null);
      setImagePreview(null);
    }
    setError(null);
  }, [item, isOpen, categoryList]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategorySuccess = (newCategory) => {
    setCategoryList(prev => [...prev, newCategory]);
    setFormData(prev => ({ ...prev, category: newCategory.id }));
    if (onCategoryAdded) {
      onCategoryAdded(newCategory);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      if (imageFile) {
        data.append('image', imageFile);
      }

      if (item && item.id) {
        await api.patch(`/store/items/${item.id}/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/store/items/', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save store item master:', err);
      setError(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.response?.data?.item_code?.[0] ||
        'Failed to save store item master.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .simm-modal-card {
          background-color: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 680px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
        }
        .simm-grid-2 {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 1rem;
        }
        .simm-grid-3 {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr;
          gap: 1rem;
        }
        .simm-grid-3-eq {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
        }
        @media (max-width: 640px) {
          .simm-modal-card {
            max-height: 94vh;
            border-radius: 12px;
          }
          .simm-grid-2, .simm-grid-3, .simm-grid-3-eq {
            grid-template-columns: 1fr !important;
            gap: 0.85rem !important;
          }
          .simm-header {
            padding: 1rem !important;
          }
          .simm-body {
            padding: 1rem !important;
            gap: 1rem !important;
          }
          .simm-footer {
            flex-direction: column-reverse;
            gap: 0.75rem;
            align-items: stretch !important;
          }
          .simm-footer button {
            width: 100%;
          }
        }
      `}</style>

      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '0.75rem'
      }}>
        <div className="simm-modal-card">
          {/* Modal Header */}
          <div className="simm-header" style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #faf8f5, #f5efe6)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#8b5a2b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0
              }}>
                <Warehouse size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  {item ? 'Edit Store Item Master' : 'Add New Store Item Master'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                  Define store item details, base master rates, and chargeability status
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body Form */}
          <form className="simm-body" onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {error && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#991b1b',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="simm-grid-2">
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Item Code *
                </label>
                <input
                  type="text"
                  name="item_code"
                  value={formData.item_code}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontWeight: 600,
                    color: '#1e293b',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Item Name *
                </label>
                <input
                  type="text"
                  name="item_name"
                  value={formData.item_name}
                  onChange={handleChange}
                  placeholder="e.g. Rejmal 220, Fevicol, Easy Lacquer"
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div className="simm-grid-3">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', margin: 0 }}>
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
                    <Plus size={12} /> Add New
                  </button>
                </div>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
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
                  <option value="">Select Category</option>
                  {categoryList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Unit of Measure *
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
                  <option value="pkt">pkt (Packets)</option>
                  <option value="box">box (Boxes)</option>
                  <option value="ltr">ltr (Litres)</option>
                  <option value="kg">kg (Kilograms)</option>
                  <option value="roll">roll (Rolls)</option>
                  <option value="meter">meter (Meters)</option>
                  <option value="nos">nos (Numbers)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Master Base Rate (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="base_rate"
                  value={formData.base_rate}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div className="simm-grid-3-eq">
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Default Status
                </label>
                <select
                  name="default_status"
                  value={formData.default_status}
                  onChange={handleChange}
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
                  <option value="charge">Chargeable (Contractor Debit)</option>
                  <option value="non-charge">Non-Chargeable (Expense)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Weight / Unit (kg)
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
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Reorder Level Threshold
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="reorder_level"
                  value={formData.reorder_level}
                  onChange={handleChange}
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
            </div>

            <div>
              <CustomFileUpload
                label="Item Image (Optional — Drag & Drop Supported)"
                accept="image/*"
                singleFile={imageFile || imagePreview}
                onChange={(file) => {
                  if (file) {
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }
                }}
                onRemoveNew={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Remarks / Description
              </label>
              <textarea
                name="remark"
                rows={2}
                value={formData.remark}
                onChange={handleChange}
                placeholder="Add any specific notes or material specifications..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Footer Actions */}
            <div className="simm-footer" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                onClick={onClose}
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
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.65rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#8b5a2b',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 4px rgba(139, 90, 43, 0.2)',
                  opacity: loading ? 0.7 : 1
                }}
              >
                <Save size={16} />
                {loading ? 'Saving Master...' : 'Save Item Master'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Category Creation Modal */}
      <StoreCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={handleCategorySuccess}
      />
    </>
  );
}
