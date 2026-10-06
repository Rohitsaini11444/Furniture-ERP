import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, Box, Sparkles, X, Plus } from 'lucide-react';

/**
 * Premium Searchable Select & Combobox Component
 * Upgraded with React Portal rendering and smart viewport positioning so menus
 * never get clipped or trapped inside scrollable tables or overflow-hidden containers.
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
  hasError = false,
  className = '',
  style = {},
  usePortal = true
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

  // Compute bounding coordinates and flip direction
  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = 360;
    const openUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    const width = Math.max(rect.width, 360);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }

    const maxHeight = openUpward ? Math.min(380, spaceAbove - 20) : Math.min(380, spaceBelow - 20);

    setMenuCoords({
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      left: Math.max(12, left),
      width,
      maxHeight,
      openUpward
    });
  }, []);

  // Close dropdown on click outside & track scroll/resize
  useEffect(() => {
    if (!isOpen) {
      setMenuCoords(null);
      return;
    }
    updateCoords();

    function handleClickOutside(event) {
      const clickedTrigger = triggerRef.current && triggerRef.current.contains(event.target);
      const clickedMenu = menuRef.current && menuRef.current.contains(event.target);
      if (!clickedTrigger && !clickedMenu) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      updateCoords();
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updateCoords]);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen && showSearch) {
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showSearch]);

  // Reset page to 1 when search or isOpen changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updateCoords();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

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
        ref={triggerRef}
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 0.85rem',
          backgroundColor: hasError ? '#fff5f5' : '#ffffff',
          border: hasError ? '1.5px solid #dc2626' : (isOpen ? '1.5px solid #ea580c' : '1px solid #cbd5e1'),
          borderRadius: '8px',
          boxShadow: hasError ? '0 0 0 2px rgba(220, 38, 38, 0.15)' : (isOpen ? '0 0 0 3px rgba(234, 88, 12, 0.12)' : 'none'),
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
      {isOpen && (() => {
        const panel = (
          <div
            ref={menuRef}
            style={{
              position: usePortal ? 'fixed' : 'absolute',
              ...(usePortal && menuCoords ? {
                top: menuCoords.openUpward ? 'auto' : `${menuCoords.top}px`,
                bottom: menuCoords.openUpward ? `${Math.max(10, window.innerHeight - menuCoords.top)}px` : 'auto',
                left: `${menuCoords.left}px`,
                width: `${menuCoords.width}px`,
                maxHeight: `${menuCoords.maxHeight || 380}px`,
              } : {
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
              }),
              zIndex: 9999999,
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 12px 36px -4px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)',
              padding: '0.75rem',
              animation: 'fadeIn 0.15s ease-out',
              minWidth: '320px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Bar inside Panel */}
            {showSearch && (
              <div
                style={{
                  position: 'relative',
                  marginBottom: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0
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
                  transition: 'all 0.15s',
                  flexShrink: 0
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
                maxHeight: menuCoords ? `${Math.max(140, menuCoords.maxHeight - 120)}px` : '260px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                paddingRight: '2px',
                flex: 1
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
                  const unitStock = typeof opt === 'object' && opt.unit_balance_stock_qty !== undefined && opt.unit_balance_stock_qty !== null
                    ? opt.unit_balance_stock_qty
                    : null;
                  const totalStock = typeof opt === 'object' && opt.balance_stock_qty !== undefined && opt.balance_stock_qty !== null
                    ? opt.balance_stock_qty
                    : (typeof opt === 'object' && opt.balance_qty !== undefined ? opt.balance_qty : null);
                  const stockQty = unitStock !== null ? unitStock : totalStock;

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
                          {(unit || (stockQty !== null && stockQty !== undefined)) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b', marginTop: '2px', flexWrap: 'wrap' }}>
                              {unit && <span>Unit: <strong>{unit}</strong></span>}
                              {unitStock !== null && totalStock !== null && parseFloat(unitStock) !== parseFloat(totalStock) ? (
                                <span style={{ fontSize: '0.75rem' }}>
                                  <strong style={{ color: parseFloat(unitStock) <= 0 ? '#dc2626' : '#16a34a' }}>
                                    Unit Stock: {unitStock} {unit}
                                  </strong>
                                  <span style={{ color: '#64748b', fontWeight: 600, marginLeft: '5px' }}>
                                    (Total: {totalStock} {unit})
                                  </span>
                                </span>
                              ) : (stockQty !== null && stockQty !== undefined) ? (
                                <span style={{ color: parseFloat(stockQty) <= 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                                  Stock: {stockQty} {unit}
                                </span>
                              ) : null}
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
                gap: '0.35rem',
                flexShrink: 0
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
        );

        return usePortal ? (menuCoords ? createPortal(panel, document.body) : null) : panel;
      })()}
    </div>
  );
}

export default SearchableSelect;
