import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

/**
 * CustomSelect - Reusable luxury brown ERP dropdown matching the design in Image 1.
 * Upgraded with React Portal rendering so dropdown menus never get trapped or clipped
 * inside scrollable table containers or overflow hidden parent elements.
 *
 * Supports options via:
 * 1. options prop: [{ value, label, badge, sublabel, image }] or ["Option 1", "Option 2"]
 */
export function CustomSelect({
  options = [],
  children,
  value = '',
  onChange,
  name = '',
  placeholder = '-- Select --',
  className = '',
  style = {},
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Search...',
}) {
  const [open, setOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Measure trigger element and compute viewport coordinates
  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuMaxHeight = 260;
    const openUpward = spaceBelow < menuMaxHeight && rect.top > menuMaxHeight;

    setMenuCoords({
      top: openUpward ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      openUpward
    });
  }, []);

  // Sync coordinates and handle click outside & scroll/resize tracking
  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      return;
    }
    updateCoords();

    const handleClickOutside = (e) => {
      const clickedTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const clickedMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!clickedTrigger && !clickedMenu) {
        setOpen(false);
        setSearchTerm('');
      }
    };

    const handleScrollOrResize = () => {
      updateCoords();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [open, updateCoords]);

  // Extract options array from options prop OR React children
  let normalizedOptions = [];
  if (options && options.length > 0) {
    normalizedOptions = options.map(opt => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value !== undefined ? opt.value : opt.label,
          label: opt.label !== undefined ? opt.label : String(opt.value),
          badge: opt.badge || null,
          sublabel: opt.sublabel || null,
          image: opt.image || null,
        };
      }
      return { value: opt, label: String(opt) };
    });
  } else if (children) {
    React.Children.forEach(children, child => {
      if (React.isValidElement(child)) {
        if (child.type === 'option') {
          const val = child.props.value !== undefined ? child.props.value : child.props.children;
          const lbl = child.props.children !== undefined ? child.props.children : child.props.value;
          normalizedOptions.push({
            value: val,
            label: typeof lbl === 'string' || typeof lbl === 'number' ? String(lbl) : String(val)
          });
        } else if (child.props && child.props.value !== undefined) {
          normalizedOptions.push({
            value: child.props.value,
            label: String(child.props.children || child.props.value)
          });
        }
      }
    });
  }

  const selectedOpt = normalizedOptions.find(o => String(o.value) === String(value));
  const displayLabel = selectedOpt ? selectedOpt.label : (value || placeholder);

  const filteredOptions = searchTerm.trim()
    ? normalizedOptions.filter(opt => {
        const term = searchTerm.trim().toLowerCase();
        const lbl = String(opt.label || '').toLowerCase();
        const sub = String(opt.sublabel || '').toLowerCase();
        const bdg = String(opt.badge || '').toLowerCase();
        const val = String(opt.value || '').toLowerCase();
        return lbl.includes(term) || sub.includes(term) || bdg.includes(term) || val.includes(term);
      })
    : normalizedOptions;

  const handleSelect = (optValue) => {
    if (disabled) return;
    setOpen(false);
    setSearchTerm('');
    if (onChange) {
      const fakeEvent = {
        target: { name: name || '', value: optValue },
        currentTarget: { name: name || '', value: optValue },
        value: optValue
      };
      onChange(fakeEvent, optValue);
    }
  };

  const containerWidth = style?.width ? style.width : (style?.minWidth ? 'auto' : '100%');

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: containerWidth,
        maxWidth: '100%',
        boxSizing: 'border-box',
        userSelect: 'none',
        ...style
      }}
    >
      {/* ── Trigger Box ── */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            if (!open) updateCoords();
            setOpen(prev => !prev);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          width: '100%',
          minHeight: '38px',
          padding: '0.5rem 0.8rem',
          backgroundColor: '#ffffff',
          border: `1.5px solid ${open ? '#8b5a2b' : '#d6c7b2'}`,
          borderRadius: '10px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: open ? '0 0 0 3px rgba(139,90,43,0.14)' : '0 1px 2px rgba(0,0,0,0.04)',
          outline: 'none',
          opacity: disabled ? 0.6 : 1,
          boxSizing: 'border-box'
        }}
        onMouseEnter={e => { if (!open && !disabled) e.currentTarget.style.borderColor = '#8b5a2b'; }}
        onMouseLeave={e => { if (!open && !disabled) e.currentTarget.style.borderColor = '#d6c7b2'; }}
      >
        <span style={{
          flex: 1,
          fontWeight: 600,
          fontSize: '0.9rem',
          color: selectedOpt || value ? '#1e293b' : '#64748b',
          textAlign: 'left',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {displayLabel}
        </span>

        <ChevronDown
          size={17}
          color="#8b5a2b"
          strokeWidth={2.2}
          style={{
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0
          }}
        />
      </button>

      {/* ── Portal-Rendered Dropdown Overlay Card (Floats over all tables & containers) ── */}
      {open && menuCoords && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: menuCoords.openUpward ? 'auto' : `${menuCoords.top}px`,
            bottom: menuCoords.openUpward ? `${window.innerHeight - menuCoords.top}px` : 'auto',
            left: `${menuCoords.left}px`,
            width: `${menuCoords.width}px`,
            boxSizing: 'border-box',
            zIndex: 9999999,
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 36px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
            maxHeight: '260px',
            overflowY: 'auto',
            animation: menuCoords.openUpward ? 'fadeSlideUp 0.15s ease' : 'fadeSlideDown 0.15s ease',
            scrollbarWidth: 'thin',
            scrollbarColor: '#d6c7b2 transparent'
          }}
        >
          {searchable && (
            <div
              style={{
                position: 'sticky',
                top: 0,
                backgroundColor: '#ffffff',
                padding: '6px 8px',
                borderBottom: '1px solid #f1f5f9',
                zIndex: 2,
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '4px 8px'
              }}>
                <Search size={14} color="#94a3b8" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.82rem',
                    color: '#1e293b'
                  }}
                  autoFocus
                />
                {searchTerm && (
                  <X
                    size={13}
                    color="#94a3b8"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSearchTerm('')}
                  />
                )}
              </div>
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
              {searchTerm ? `No matches for "${searchTerm}"` : 'No options available'}
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={`${opt.value}-${idx}`}
                  onClick={() => handleSelect(opt.value)}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.65rem',
                    padding: '0.6rem 0.85rem 0.6rem 1rem',
                    backgroundColor: isSelected ? '#fdf8f5' : '#ffffff',
                    color: isSelected ? '#8b5a2b' : '#334155',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'background 0.12s ease, color 0.12s ease',
                    borderBottom: idx === filteredOptions.length - 1 ? 'none' : '1px solid #f8fafc'
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#fcf7f3';
                      e.currentTarget.style.color = '#8b5a2b';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.color = '#334155';
                    }
                  }}
                >
                  {/* Brown Left Accent Bar for Selected Item */}
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        backgroundColor: '#8b5a2b',
                        borderRadius: '2px 0 0 2px'
                      }}
                    />
                  )}

                  {/* Option Content */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    {opt.image && (
                      <img
                        src={opt.image}
                        alt=""
                        style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e8f0' }}
                      />
                    )}
                    {opt.badge && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        flexShrink: 0
                      }}>
                        {opt.badge}
                      </span>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {opt.label}
                      </div>
                      {opt.sublabel && (
                        <div style={{ fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Brown Checkmark Icon for Selected Item */}
                  {isSelected && (
                    <Check size={16} color="#8b5a2b" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  )}
                </div>
              );
            })
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export default CustomSelect;
