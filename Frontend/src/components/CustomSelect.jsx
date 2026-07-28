import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * CustomSelect - Reusable luxury brown ERP dropdown matching the design in Image 1.
 * Replaces native HTML <select> elements across the app.
 *
 * Supports options via:
 * 1. options prop: [{ value, label }] or ["Option 1", "Option 2"]
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
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Extract options array from options prop OR React children
  let normalizedOptions = [];
  if (options && options.length > 0) {
    normalizedOptions = options.map(opt => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value !== undefined ? opt.value : opt.label,
          label: opt.label !== undefined ? opt.label : String(opt.value)
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

  const handleSelect = (optValue) => {
    if (disabled) return;
    setOpen(false);
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
        boxSizing: 'border-box',
        userSelect: 'none',
        ...style
      }}
    >
      {/* ── Trigger Box ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(prev => !prev)}
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

      {/* ── Dropdown Overlay Card ── */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            width: '100%',
            boxSizing: 'border-box',
            zIndex: 99999,
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            maxHeight: '240px',
            overflowY: 'auto',
            animation: 'fadeSlideDown 0.15s ease',
            scrollbarWidth: 'thin',
            scrollbarColor: '#d6c7b2 transparent'
          }}
        >
          {normalizedOptions.length === 0 ? (
            <div style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
              No options available
            </div>
          ) : (
            normalizedOptions.map((opt, idx) => {
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
                    gap: '0.5rem',
                    padding: '0.65rem 0.85rem 0.65rem 1rem',
                    backgroundColor: isSelected ? '#fdf8f5' : '#ffffff',
                    color: isSelected ? '#8b5a2b' : '#334155',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'background 0.12s ease, color 0.12s ease',
                    borderBottom: idx === normalizedOptions.length - 1 ? 'none' : '1px solid #f1f5f9'
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

                  {/* Label Text */}
                  <span style={{
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {opt.label}
                  </span>

                  {/* Brown Checkmark Icon for Selected Item */}
                  {isSelected && (
                    <Check size={16} color="#8b5a2b" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
