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
  searchPlaceholder = 'Search...',
  showSearch = true,
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

  // Find currently selected option
  const selectedOption = options.find(opt => {
    if (typeof opt !== 'object') return String(opt) === String(value);
    const val = opt[idKey] !== undefined ? opt[idKey] : (opt.id !== undefined ? opt.id : opt.value);
    return String(val) === String(value);
  });

  // Filter options based on search input
  const filteredOptions = options.filter(opt => {
    if (!searchTerm || !showSearch) return true;
    const term = searchTerm.toLowerCase();
    if (typeof opt === 'string' || typeof opt === 'number') {
      return String(opt).toLowerCase().includes(term);
    }
    const code = String(opt[codeKey] || opt.sample_id || opt.style_no || opt.code || opt.id || '').toLowerCase();
    const title = String(opt[titleKey] || opt.product_name || opt.name || opt.label || '').toLowerCase();
    const desc = String(opt.description || opt.material || opt.finish_color || opt.state_name || '').toLowerCase();
    return code.includes(term) || title.includes(term) || desc.includes(term);
  });

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

  // Helper to extract initials (e.g. Rakesh Sharma -> RS)
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

    // Default: Check if supplier name / text to create avatar badge
    const nameStr = typeof opt === 'object' ? (opt[titleKey] || opt.name || opt.label || '') : String(opt);
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
      return <span style={{ color: '#94a3b8', fontSize: '0.92rem', fontWeight: 500 }}>{placeholder}</span>;
    }

    if (typeof selectedOption !== 'object') {
      return <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.92rem' }}>{selectedOption}</span>;
    }

    const code = selectedOption[codeKey] || selectedOption.sample_id || selectedOption.style_no || selectedOption.code || '';
    const title = selectedOption[titleKey] || selectedOption.product_name || selectedOption.name || selectedOption.label || '';

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', minWidth: 0 }}>
        {code && (
          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem', flexShrink: 0 }}>
            {code}
          </span>
        )}
        {title && (
          <span style={{ color: code ? '#475569' : '#1e293b', fontWeight: code ? 500 : 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
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
          padding: '0.65rem 1rem',
          backgroundColor: '#ffffff',
          border: isOpen ? '1.5px solid #8b5a2b' : '1.5px solid #d6c7b2',
          borderRadius: '12px',
          boxShadow: isOpen ? '0 0 0 3px rgba(139, 90, 43, 0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: disabled ? 0.6 : 1,
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden', flex: 1, minWidth: 0 }}>
          {selectedOption ? renderOptionIcon(selectedOption) : (DefaultIcon ? <DefaultIcon size={18} color="#8b5a2b" /> : null)}
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
            size={18}
            color="#8b5a2b"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
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
            border: '1px solid #e7e5e4',
            borderRadius: '16px',
            boxShadow: '0 12px 32px -4px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
            padding: '0.85rem',
            animation: 'fadeIn 0.15s ease-out',
            minWidth: '260px'
          }}
        >
          {/* Search Bar inside Panel */}
          {showSearch && (
            <div
              style={{
                position: 'relative',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Search
                size={17}
                color="#8b5a2b"
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
                  padding: '0.6rem 0.8rem 0.6rem 2.4rem',
                  backgroundColor: '#faf8f5',
                  border: '1px solid #e7e0d6',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  color: '#1e293b',
                  outline: 'none',
                  transition: 'all 0.2s'
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
                borderRadius: '10px',
                border: '1px dashed #d6c7b2',
                backgroundColor: '#faf8f5',
                color: '#8b5a2b',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                marginBottom: '0.65rem',
                transition: 'all 0.15s'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  border: '1px solid #d6c7b2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Plus size={16} color="#8b5a2b" />
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
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '1.25rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                No matching results found.
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const optVal = typeof opt === 'object' ? (opt[idKey] !== undefined ? opt[idKey] : (opt.id !== undefined ? opt.id : opt.value)) : opt;
                const isSelected = String(optVal) === String(value);

                const code = typeof opt === 'object' ? (opt[codeKey] || opt.sample_id || opt.style_no || opt.code || '') : '';
                const title = typeof opt === 'object' ? (opt[titleKey] || opt.product_name || opt.name || opt.label || '') : String(opt);

                return (
                  <div
                    key={idx}
                    onClick={() => handleSelect(opt)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? '#f5efe6' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      gap: '0.75rem'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#faf6f0';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden', flex: 1 }}>
                      {renderOptionIcon(opt)}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                        {code && (
                          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem', flexShrink: 0 }}>
                            {code}
                          </span>
                        )}
                        {title && (
                          <span style={{ color: code ? '#475569' : '#1e293b', fontWeight: code ? 500 : 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {title}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={18} color="#8b5a2b" style={{ flexShrink: 0 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div
            style={{
              marginTop: '0.6rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              color: '#8b5a2b',
              fontWeight: 600
            }}
          >
            {FooterIcon && <FooterIcon size={14} color="#8b5a2b" />}
            {footerText ? (
              typeof footerText === 'function' ? footerText(filteredOptions.length) : footerText
            ) : (
              `Showing ${filteredOptions.length} of ${options.length} results`
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
