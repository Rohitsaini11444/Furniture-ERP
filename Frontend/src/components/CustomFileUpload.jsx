import React, { useRef } from 'react';
import { Upload, Package, ImageIcon, Layers, Trash2, CheckCircle2 } from 'lucide-react';

/**
 * Premium Custom File Upload Component — Mobile-responsive
 */
export function CustomFileUpload({
  label = 'Upload File',
  subLabel = null,
  multiple = false,
  accept = 'image/jpeg,image/png,image/webp',
  icon: CustomIcon = null,
  newFiles = [],
  existingFiles = [],
  singleFile = null,
  onChange,
  onRemoveNew,
  onRemoveExisting,
  maxSizeMB = 5,
}) {
  const fileInputRef = useRef(null);
  const IconComponent = CustomIcon || (multiple ? ImageIcon : Package);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    if (multiple) {
      onChange(selected);
    } else {
      onChange(selected[0]);
    }
    e.target.value = '';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileExt = (name) => {
    if (!name) return '';
    const parts = name.split('.');
    return parts.length > 1 ? parts.pop().toUpperCase() : '';
  };

  const totalCount = multiple
    ? existingFiles.length + newFiles.length
    : (singleFile ? 1 : 0);
  const hasContent = totalCount > 0;

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .cfu-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 0.9rem 1rem;
          gap: 0.75rem;
        }
        .cfu-browse-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 1rem;
          background: #ffffff;
          border: 1.5px solid #d6c7b2;
          border-radius: 10px;
          color: #8b5a2b;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .cfu-browse-btn:hover {
          background: #faf6f0;
          border-color: #8b5a2b;
        }
        .cfu-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: #ffffff;
          transition: background 0.15s;
          min-width: 0;
        }
        .cfu-card:hover { background: #fdf9f5; }
        .cfu-thumb {
          width: 52px;
          height: 52px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
          background: #f4ece1;
          border: 1px solid #e7ddd1;
        }
        .cfu-info {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        .cfu-name-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          margin-bottom: 3px;
          min-width: 0;
        }
        .cfu-name {
          font-weight: 700;
          color: #1e293b;
          font-size: 0.85rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          flex: 1;
        }
        .cfu-meta {
          font-size: 0.75rem;
          color: #78716c;
          font-weight: 500;
          white-space: nowrap;
        }
        .cfu-actions {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-shrink: 0;
        }
        .cfu-check {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid #16a34a;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cfu-del {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid #fee2e2;
          background: #fff5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .cfu-del:hover { background: #fee2e2; border-color: #ef4444; }
        .cfu-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.65rem 1rem;
          border-top: 1px solid #f1ece5;
          background: #faf8f5;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .cfu-badge {
          background: #f5efe6;
          color: #8b5a2b;
          font-weight: 700;
          font-size: 0.78rem;
          padding: 3px 10px;
          border-radius: 20px;
          border: 1px solid #e7d8c4;
          white-space: nowrap;
        }
        @media (max-width: 480px) {
          .cfu-header { padding: 0.75rem 0.85rem; }
          .cfu-browse-btn { padding: 0.4rem 0.75rem; font-size: 0.8rem; }
          .cfu-card { padding: 0.65rem 0.85rem; gap: 0.6rem; }
          .cfu-thumb { width: 44px; height: 44px; }
          .cfu-name { font-size: 0.8rem; }
          .cfu-check, .cfu-del { width: 26px; height: 26px; }
        }
      `}</style>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Main Container */}
      <div
        style={{
          border: '1.5px solid #e7e0d6',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {/* ── Header Row ── */}
        <div
          className="cfu-header"
          style={{ borderBottom: hasContent ? '1px solid #f1ece5' : 'none' }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            {label && (
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b', marginBottom: '2px' }}>
                {label}
              </div>
            )}
            <div style={{ color: '#78716c', fontSize: '0.78rem', fontWeight: 500, lineHeight: 1.4 }}>
              {subLabel || `JPG, PNG or WEBP (Max. ${maxSizeMB}MB${multiple ? ' each' : ''})`}
            </div>
          </div>

          <button
            type="button"
            className="cfu-browse-btn"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <Upload size={14} color="#8b5a2b" />
            Browse
          </button>
        </div>

        {/* ── File Cards List ── */}
        {multiple ? (
          <>
            {existingFiles.map((img, idx) => {
              const src = img.image_url || img.image || '';
              const name = src.split('/').pop() || `image-${idx + 1}`;
              const ext = getFileExt(name);
              return (
                <FileCard
                  key={`existing-${img.id}`}
                  preview={src}
                  name={name}
                  ext={ext}
                  meta=""
                  isLast={idx === existingFiles.length - 1 && newFiles.length === 0}
                  onRemove={() => onRemoveExisting && onRemoveExisting(img.id)}
                />
              );
            })}

            {newFiles.map((item, idx) => {
              const file = item.file;
              const name = file?.name || `file-${idx + 1}`;
              const ext = getFileExt(name);
              const size = formatFileSize(file?.size);
              return (
                <FileCard
                  key={`new-${idx}`}
                  preview={item.preview}
                  name={name}
                  ext={ext}
                  meta={size}
                  isLast={idx === newFiles.length - 1}
                  onRemove={() => onRemoveNew && onRemoveNew(idx)}
                />
              );
            })}

            {!hasContent && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.75rem 1rem',
                  gap: '0.6rem',
                  color: '#94a3b8',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    backgroundColor: '#f4ece1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconComponent size={24} color="#8b5a2b" />
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, textAlign: 'center', color: '#94a3b8' }}>
                  No files chosen. Click <strong>Browse</strong> to add images.
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="cfu-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#78716c', fontSize: '0.78rem', fontWeight: 500 }}>
                <Layers size={13} color="#8b5a2b" />
                <span>You can select multiple files</span>
              </div>
              {totalCount > 0 && (
                <div className="cfu-badge">
                  {totalCount} file{totalCount !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {singleFile ? (
              <>
                <FileCard
                  preview={
                    typeof singleFile === 'string'
                      ? singleFile
                      : singleFile instanceof File
                        ? URL.createObjectURL(singleFile)
                        : null
                  }
                  name={
                    typeof singleFile === 'string'
                      ? singleFile.split('/').pop()
                      : singleFile?.name || 'image'
                  }
                  ext={
                    getFileExt(
                      typeof singleFile === 'string'
                        ? singleFile.split('/').pop()
                        : singleFile?.name || ''
                    )
                  }
                  meta={singleFile instanceof File ? formatFileSize(singleFile.size) : ''}
                  isLast
                  onRemove={() => onRemoveNew && onRemoveNew(null)}
                />
                <div
                  style={{
                    padding: '0.55rem 1rem',
                    borderTop: '1px solid #f1ece5',
                    backgroundColor: '#faf8f5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <CheckCircle2 size={14} color="#16a34a" />
                  <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>File selected</span>
                </div>
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1.75rem 1rem',
                  gap: '0.6rem',
                  color: '#94a3b8',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    backgroundColor: '#f4ece1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconComponent size={24} color="#8b5a2b" />
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, textAlign: 'center', color: '#94a3b8' }}>
                  No file chosen. Click <strong>Browse</strong> to upload.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Individual file card ────────────────────────────────────────────────────
function FileCard({ preview, name, ext, meta, isLast, onRemove }) {
  return (
    <div
      className="cfu-card"
      style={{ borderBottom: isLast ? 'none' : '1px solid #f5f0ea' }}
    >
      {/* Thumbnail */}
      <div className="cfu-thumb">
        {preview ? (
          <img
            src={preview}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={22} color="#8b5a2b" />
          </div>
        )}
      </div>

      {/* File info — min-width:0 ensures text ellipsis works inside flex */}
      <div className="cfu-info">
        <div className="cfu-name-row">
          <ImageIcon size={14} color="#8b5a2b" style={{ flexShrink: 0 }} />
          <span className="cfu-name" title={name}>{name}</span>
        </div>
        <div className="cfu-meta">
          {ext && <span>{ext}</span>}
          {ext && meta && <span style={{ margin: '0 0.25rem', opacity: 0.5 }}>•</span>}
          {meta && <span>{meta}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="cfu-actions">
        <div className="cfu-check">
          <CheckCircle2 size={14} color="#16a34a" />
        </div>
        {onRemove && (
          <button
            type="button"
            className="cfu-del"
            onClick={onRemove}
            title="Remove file"
          >
            <Trash2 size={13} color="#ef4444" />
          </button>
        )}
      </div>
    </div>
  );
}

export default CustomFileUpload;
