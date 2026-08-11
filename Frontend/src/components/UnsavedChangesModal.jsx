import React from 'react';
import { AlertTriangle, Save, FileText, Trash2, X } from 'lucide-react';

export function UnsavedChangesModal({
  isOpen,
  title = 'Unsaved Changes Detected',
  message = 'You have unsaved changes in this form. Would you like to save your changes or keep a draft before leaving?',
  onSave,
  onSaveDraft,
  onDiscard,
  onCancel
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e7e5e4',
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #fdf8f5, #ffffff)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706'
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                {title}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0' }}>
                Your form progress may be lost
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#faf8f5',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {onSave && (
              <button
                type="button"
                onClick={onSave}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  backgroundColor: '#8b5a2b',
                  color: '#ffffff',
                  fontWeight: 650,
                  fontSize: '0.88rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(139, 90, 43, 0.2)'
                }}
              >
                <Save size={16} /> Save Form
              </button>
            )}

            {onSaveDraft && (
              <button
                type="button"
                onClick={onSaveDraft}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  backgroundColor: '#ffffff',
                  color: '#8b5a2b',
                  fontWeight: 650,
                  fontSize: '0.88rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  border: '1.5px solid #d6c7b2',
                  cursor: 'pointer'
                }}
              >
                <FileText size={16} /> Save as Draft
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.2rem' }}>
            <button
              type="button"
              onClick={onDiscard}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                backgroundColor: '#fff1f2',
                color: '#e11d48',
                fontWeight: 600,
                fontSize: '0.82rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #fecdd3',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={15} /> Discard & Exit
            </button>

            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontWeight: 600,
                fontSize: '0.82rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                cursor: 'pointer'
              }}
            >
              Keep Editing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UnsavedChangesModal;
