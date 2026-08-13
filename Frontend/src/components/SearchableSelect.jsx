import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Box, Sparkles, X, Plus } from 'lucide-react';

/**
 * Premium Searchable Select & Combobox Component
 * Styled to match exact design specification (Supplier, Status, Order By, Items).
 */
export function SearchableSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search by code or name...',
  showSearch = true,
  pageSize = 15,
  idKey = 'id',
  codeKey = 'code',
  titleKey = 'name',
  icon: DefaultIcon = null,
  onAddNew = null,
  addNewText = 'Add New Item',
  footerIcon: FooterIcon = Sparkles,
  footerText = null,
  clearable = true,
  disabled = false,
  className = '',
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  // Reset page to 1 when search or isOpen changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, isOpen]);

  // Find currently selected option
  const selectedOption = options.find(opt => {
    if (typeof opt !== 'object') return String(opt) === String(value);
    const val = opt[idKey] !== undefined ? opt[idKey] : (opt.id !== undefined ? opt.id : opt.value);
    return String(val) === String(value);
  });

  // Multi-token string-wise fuzzy search
  const filteredOptions = options.filter(opt => {
    if (!searchTerm || !showSearch) return true;
    const tokens = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;

    let targetText = '';
    if (typeof opt === 'string' || typeof opt === 'number') {
      targetText = String(opt).toLowerCase();
    } else {
      const code = String(opt[codeKey] || opt.item_code || opt.sample_id || opt.style_no || opt.code || opt.id || '').toLowerCase();
      const title = String(opt[titleKey] || opt.item_name || opt.product_name || opt.name || opt.label || opt.full_name || opt.username || '').toLowerCase();
      const desc = String(opt.description || opt.material || opt.unit || opt.category_name || opt.remark || '').toLowerCase();
      targetText = `${code} ${title} ${desc}`;
    }

    return tokens.every(token => targetText.includes(token));
  });

  const totalPages = Math.max(1, Math.ceil(filteredOptions.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedOptions = filteredOptions.slice(startIndex, startIndex + pageSize);

  const handleSelect = (opt) => {
    const val = typeof opt === 'object' ? (opt[idKey] !== undefined ? opt[idKey] : (opt.id !== undefined ? opt.id : opt.value)) : opt;
    onChange(val, opt);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('', null);
  };

  // Helper to extract initials
  const getInitials = (text) => {
    if (!text) return '';
    const words = String(text).trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return text.slice(0, 2).toUpperCase();
  };

  // Render Icon or Avatar for an option
  const renderOptionIcon = (opt) => {
    if (typeof opt === 'object' && opt.icon) {
      const OptIcon = opt.icon;
      return typeof OptIcon === 'function' || typeof OptIcon === 'object' ? <OptIcon size={18} color="#8b5a2b" /> : OptIcon;
    }
    if (DefaultIcon) {
      const DIcon = DefaultIcon;
      return <DIcon size={18} color="#8b5a2b" />;
    }

    const nameStr = typeof opt === 'object' ? (opt[titleKey] || opt.item_name || opt.name || opt.label || '') : String(opt);
    if (nameStr) {
      const initials = getInitials(nameStr);
      return (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#f4ece1',
            color: '#8b5a2b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.78rem',
            fontWeight: 700,
            flexShrink: 0
          }}
        >
          {initials}
        </div>
      );
    }
    return <Box size={18} color="#8b5a2b" />;
  };

  // Render Trigger Display Text
  const renderTriggerContent = () => {
    if (!selectedOption) {
      return <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>{placeholder}</span>;
    }

    if (typeof selectedOption !== 'object') {
      return <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{selectedOption}</span>;
    }

    const code = selectedOption[codeKey] || selectedOption.item_code || selectedOption.sample_id || selectedOption.style_no || selectedOption.code || '';
    const title = selectedOption[titleKey] || selectedOption.item_name || selectedOption.product_name || selectedOption.name || selectedOption.label || '';

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', minWidth: 0 }}>
        {code && (
          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem', flexShrink: 0 }}>
            {code}
          </span>
        )}
        {title && (
          <span style={{ color: code ? '#334155' : '#0f172a', fontWeight: code ? 600 : 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
            {code ? `— ${title}` : title}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-select-container ${className}`}
      style={{ position: 'relative', width: '100%', ...style }}
    >
      {/* ── Trigger Box ── */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 0.85rem',
          backgroundColor: '#ffffff',
          border: isOpen ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: isOpen ? '0 0 0 3px rgba(234, 88, 12, 0.12)' : 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          opacity: disabled ? 0.6 : 1,
          userSelect: 'none',
          outline: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden', flex: 1, minWidth: 0 }}>
          {(selectedOption && typeof selectedOption === 'object' && selectedOption.icon) ? (
            React.createElement(selectedOption.icon, { size: 18, color: '#ea580c', style: { flexShrink: 0 } })
          ) : (DefaultIcon ? <DefaultIcon size={18} color="#ea580c" style={{ flexShrink: 0 }} /> : null)}
          {renderTriggerContent()}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem', flexShrink: 0 }}>
          {clearable && selectedOption && (
            <div
              onClick={handleClear}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px',
                borderRadius: '50%',
                color: '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              title="Clear selection"
            >
              <X size={14} />
            </div>
          )}
          <ChevronDown
            size={16}
            color="#64748b"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              flexShrink: 0
            }}
          />
        </div>
      </div>

      {/* ── Dropdown Floating Panel ── */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 12px 32px -4px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06)',
            padding: '0.75rem',
            animation: 'fadeIn 0.15s ease-out',
            minWidth: '260px'
          }}
        >
          {/* Search Bar inside Panel */}
          {showSearch && (
            <div
              style={{
                position: 'relative',
                marginBottom: '0.65rem',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Search
                size={17}
                color="#64748b"
                style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.8rem 0.55rem 2.4rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* "+ Add New Item" Action Button inside Panel */}
          {onAddNew && (
            <div
              onClick={() => {
                setIsOpen(false);
                onAddNew();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px dashed #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#ea580c',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                marginBottom: '0.65rem',
                transition: 'all 0.15s'
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  border: '1px solid #fed7aa',
                  backgroundColor: '#fff7ed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Plus size={16} color="#ea580c" />
              </div>
              {addNewText}
            </div>
          )}

          {/* Options List */}
          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              paddingRight: '2px'
            }}
          >
            {paginatedOptions.length === 0 ? (
              <div style={{ padding: '1.25rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                No matching results found.
              </div>
            ) : (
              paginatedOptions.map((opt, idx) => {
                const optVal = typeof opt === 'object' ? (opt[idKey] !== undefined ? opt[idKey] : (opt.id !== undefined ? opt.id : opt.value)) : opt;
                const isSelected = String(optVal) === String(value);

                const code = typeof opt === 'object' ? (opt[codeKey] || opt.item_code || opt.sample_id || opt.style_no || opt.code || '') : '';
                const title = typeof opt === 'object' ? (opt[titleKey] || opt.item_name || opt.product_name || opt.name || opt.label || opt.full_name || opt.username || '') : String(opt);
                const unit = typeof opt === 'object' ? (opt.unit || '') : '';
                const stockQty = typeof opt === 'object' ? (opt.balance_stock_qty !== undefined ? opt.balance_stock_qty : opt.balance_qty) : null;

                return (
                  <div
                    key={idx}
                    onClick={() => handleSelect(opt)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? '#fff7ed' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      gap: '0.75rem'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden', flex: 1 }}>
                      {renderOptionIcon(opt)}
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'nowrap' }}>
                          {code && (
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem', flexShrink: 0 }}>
                              {code}
                            </span>
                          )}
                          <span style={{ color: code ? '#334155' : '#0f172a', fontWeight: code ? 600 : 700, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {title}
                          </span>
                        </div>
                        {(unit || stockQty !== null) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {unit && <span>Unit: <strong>{unit}</strong></span>}
                            {stockQty !== null && (
                              <span style={{ color: parseFloat(stockQty) <= 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                                Stock: {stockQty} {unit}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={18} color="#ea580c" style={{ flexShrink: 0 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info & Pagination Controls */}
          <div
            style={{
              marginTop: '0.6rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}
          >
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.76rem',
                color: '#64748b'
              }}>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.max(1, p - 1)); }}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
                    color: currentPage <= 1 ? '#94a3b8' : '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  ‹ Prev
                </button>
                <span>Page {currentPage} of {totalPages} ({filteredOptions.length} items)</span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
                    color: currentPage >= totalPages ? '#94a3b8' : '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next ›
                </button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
              {FooterIcon && <FooterIcon size={14} color="#ea580c" />}
              <span>Showing {paginatedOptions.length} of {filteredOptions.length} results</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
