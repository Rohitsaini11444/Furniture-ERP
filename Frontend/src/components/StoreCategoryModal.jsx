import React, { useState, useEffect } from 'react';
import { X, Tag, Plus, CheckCircle, AlertCircle, Save } from 'lucide-react';
import api from '../api/axios';

export default function StoreCategoryModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isCodeTouched, setIsCodeTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setCode('');
      setIsCodeTouched(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (!isCodeTouched) {
      // Auto-generate code e.g. "Hardware & Tools" -> "HARDWARE_TOOLS"
      const generatedCode = val
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 20);
      setCode(generatedCode);
    }
  };

  const handleCodeChange = (e) => {
    setIsCodeTouched(true);
    setCode(e.target.value.toUpperCase());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category Name is required.');
      return;
    }
    const finalCode = code.trim() || name.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 20);

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/store/categories/', {
        name: name.trim(),
        code: finalCode,
      });
      if (onSuccess) {
        onSuccess(res.data);
      }
      onClose();
    } catch (err) {
      console.error('Failed to create store category:', err);
      setError(
        err.response?.data?.name?.[0] ||
        err.response?.data?.code?.[0] ||
        err.response?.data?.detail ||
        'Failed to add category. Please make sure the category name/code is unique.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .scm-card {
          width: 100%;
          max-width: 480px;
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: fadeIn 0.2s ease-out;
        }
        @media (max-width: 480px) {
          .scm-card {
            border-radius: 12px;
          }
          .scm-header {
            padding: 1rem 1.25rem !important;
          }
          .scm-body {
            padding: 1.25rem 1rem !important;
          }
          .scm-footer {
            flex-direction: column-reverse;
            gap: 0.75rem;
            align-items: stretch !important;
          }
          .scm-footer button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.75rem',
        }}
        onClick={onClose}
      >
        <div className="scm-card" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div
            className="scm-header"
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#faf8f5',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#f5efe6',
                  border: '1px solid #e7d8c4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Tag size={20} color="#8b5a2b" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                  Add Store Category
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                  Create a new category for grouping inventory items
                </p>
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
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <form className="scm-body" onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
            {error && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Category Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. Abrasives, Hardware, Adhesives"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Category Code *
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="e.g. ABR, HWD, ADH"
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Unique short code to identify this category across the ERP.
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div
              className="scm-footer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                marginTop: '1.75rem',
                paddingTop: '1rem',
                borderTop: '1px solid #f1f5f9',
              }}
            >
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
                  cursor: 'pointer',
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
                  gap: '0.5rem',
                  boxShadow: '0 2px 4px rgba(139, 90, 43, 0.2)',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                <Save size={16} />
                {loading ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
