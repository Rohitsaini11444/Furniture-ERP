import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, Box } from 'lucide-react';

export function MultiSearchableSelect({
  options = [],
  values = [],
  onChange,
  placeholder = 'Select Style No (Autofill Source)...',
  searchPlaceholder = 'Search style no or name...',
  idKey = 'id',
  codeKey = 'style_no',
  titleKey = 'product_name',
  maxVisiblePills = 3,
  disabled = false,
  className = '',
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const selectedOptions = options.filter(opt => {
    const idVal = typeof opt === 'object' ? (opt[idKey] ?? opt.id ?? opt.value) : opt;
    return values.some(v => String(v) === String(idVal));
  });

  const filteredOptions = options.filter(opt => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (typeof opt === 'string' || typeof opt === 'number') {
      return String(opt).toLowerCase().includes(term);
    }
    const code = String(opt[codeKey] || opt.sample_id || opt.style_no || opt.code || opt.id || '').toLowerCase();
    const title = String(opt[titleKey] || opt.product_name || opt.name || opt.label || '').toLowerCase();
    return code.includes(term) || title.includes(term);
  });

  const toggleOption = (opt, e) => {
    if (e) e.stopPropagation();
    const idVal = typeof opt === 'object' ? (opt[idKey] ?? opt.id ?? opt.value) : opt;
    const isSelected = values.some(v => String(v) === String(idVal));
    
    let nextValues;
    if (isSelected) {
      nextValues = values.filter(v => String(v) !== String(idVal));
    } else {
      nextValues = [...values, idVal];
    }
    onChange(nextValues);
  };

  const removeValue = (valToRemove, e) => {
    e.stopPropagation();
    onChange(values.filter(v => String(v) !== String(valToRemove)));
  };

  const visiblePills = selectedOptions.slice(0, maxVisiblePills);
  const hiddenCount = selectedOptions.length - visiblePills.length;

  return (
    <div 
      className={`multi-searchable-select-container ${className}`} 
      ref={containerRef}
      style={{ position: 'relative', width: '100%', ...style }}
    >
      <div
        className={`multi-select-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '44px',
          padding: '0.4rem 0.75rem',
          backgroundColor: '#fff',
          border: isOpen ? '1.5px solid #8b5a2b' : '1px solid #d6c7b2',
          borderRadius: '12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: isOpen ? '0 0 0 3px rgba(139, 90, 43, 0.12)' : 'none',
          transition: 'all 0.2s ease',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          {selectedOptions.length === 0 ? (
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{placeholder}</span>
          ) : (
            <>
              {visiblePills.map(opt => {
                const idVal = opt[idKey] ?? opt.id ?? opt.value;
                const codeStr = opt[codeKey] || opt.style_no || opt.name || idVal;
                return (
                  <span
                    key={idVal}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: '#f5efe6',
                      border: '1px solid #e6d7c3',
                      color: '#6b4423',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>{codeStr}</span>
                    <X
                      size={13}
                      color="#8b5a2b"
                      style={{ cursor: 'pointer', borderRadius: '50%', padding: '1px' }}
                      onClick={e => removeValue(idVal, e)}
                    />
                  </span>
                );
              })}
              {hiddenCount > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    backgroundColor: '#faf6f0',
                    border: '1px solid #e6d7c3',
                    color: '#8b5a2b',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '8px'
                  }}
                >
                  +{hiddenCount} more
                </span>
              )}
            </>
          )}
        </div>

        <ChevronDown
          size={18}
          color="#8b5a2b"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0
          }}
        />
      </div>

      {isOpen && (
        <div
          className="multi-select-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: '#ffffff',
            border: '1.5px solid #d6c7b2',
            borderRadius: '14px',
            boxShadow: '0 12px 28px -6px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            animation: 'fadeSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{ padding: '0.6rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fdfbf7' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} color="#8b5a2b" style={{ position: 'absolute', left: '10px' }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                  fontSize: '0.85rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  outline: 'none',
                  backgroundColor: '#fff'
                }}
              />
            </div>
          </div>

          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '0.4rem' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No styles found
              </div>
            ) : (
              filteredOptions.map(opt => {
                const idVal = typeof opt === 'object' ? (opt[idKey] ?? opt.id ?? opt.value) : opt;
                const codeStr = typeof opt === 'object' ? (opt[codeKey] || opt.style_no || idVal) : opt;
                const titleStr = typeof opt === 'object' ? (opt[titleKey] || opt.product_name || '') : '';
                const isSelected = values.some(v => String(v) === String(idVal));

                return (
                  <div
                    key={idVal}
                    onClick={e => toggleOption(opt, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#f5efe6' : 'transparent',
                      transition: 'background-color 0.15s ease',
                      marginBottom: '2px'
                    }}
                    onMouseEnter={e => !isSelected && (e.currentTarget.style.backgroundColor = '#faf6f0')}
                    onMouseLeave={e => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      style={{ width: '16px', height: '16px', accentColor: '#8b5a2b', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 650, fontSize: '0.88rem', color: '#334155' }}>{codeStr}</div>
                      {titleStr && (
                        <div style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {titleStr}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MultiSearchableSelect;
