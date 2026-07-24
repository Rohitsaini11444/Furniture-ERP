import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Clock, History, ArrowDownAZ, ArrowUpZA, ArrowUpDown, ArrowDownUp, TrendingDown, TrendingUp } from 'lucide-react';

/**
 * Premium OrderBySelect component
 * Matches the exact luxury ERP design: trigger pill with sort icon + label,
 * floating card with icon + label rows, checkmark on selected, dividers between items.
 *
 * Props:
 *   options  - [{ value, label, icon }]
 *   value    - currently selected value string
 *   onChange - called with new value string
 */
export function OrderBySelect({ options = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find(o => o.value === value) || options[0];
  const SelectedIcon = selected?.icon || ArrowDownUp;

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block', userSelect: 'none' }}
    >
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.5rem 1rem 0.5rem 0.9rem',
          backgroundColor: '#ffffff',
          border: `1.5px solid ${open ? '#8b5a2b' : '#d6c7b2'}`,
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          minWidth: '160px',
          boxShadow: open ? '0 0 0 3px rgba(139,90,43,0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
          outline: 'none',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = '#8b5a2b'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = '#d6c7b2'; }}
      >
        {/* Sort icon */}
        <SelectedIcon size={18} color="#8b5a2b" strokeWidth={2} />

        {/* Label */}
        <span style={{ flex: 1, fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', textAlign: 'left' }}>
          {selected?.label || 'Select...'}
        </span>

        {/* Chevron */}
        <ChevronDown
          size={16}
          color="#8b5a2b"
          style={{ transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
        />
      </button>

      {/* ── Dropdown Card ── */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 9999,
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.07)',
            minWidth: '210px',
            maxWidth: '92vw',
            overflow: 'hidden',
            animation: 'fadeSlideDown 0.15s ease',
          }}
        >
          {options.map((opt, idx) => {
            const Icon = opt.icon || ArrowDownUp;
            const isSelected = opt.value === value;
            return (
              <React.Fragment key={opt.value}>
                <button
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    width: '100%',
                    padding: '0.85rem 1.15rem',
                    backgroundColor: isSelected ? '#f5ede2' : '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.12s ease',
                    outline: 'none',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#faf6f0'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff'; }}
                >
                  {/* Option icon */}
                  <Icon size={19} color={isSelected ? '#8b5a2b' : '#64748b'} strokeWidth={1.8} />

                  {/* Option label */}
                  <span style={{ flex: 1, fontWeight: isSelected ? 700 : 500, fontSize: '0.9rem', color: isSelected ? '#8b5a2b' : '#334155' }}>
                    {opt.label}
                  </span>

                  {/* Checkmark */}
                  {isSelected && <Check size={16} color="#8b5a2b" strokeWidth={2.5} />}
                </button>

                {/* Divider between items (not after last) */}
                {idx < options.length - 1 && (
                  <div style={{ height: '1px', backgroundColor: '#f1ece5', margin: '0 1rem' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Common option presets ────────────────────────────────────────────────────

export const ORDER_OPTIONS_DATE_NAME = [
  { value: '-created_at', label: 'Latest First',  icon: Clock },
  { value: 'created_at',  label: 'Oldest First',  icon: History },
  { value: 'name',        label: 'Name (A-Z)',    icon: ArrowDownAZ },
  { value: '-name',       label: 'Name (Z-A)',    icon: ArrowUpZA },
];

export const ORDER_OPTIONS_DATE_STYLE = [
  { value: '-created_at', label: 'Latest First',     icon: Clock },
  { value: 'created_at',  label: 'Oldest First',     icon: History },
  { value: 'style_no',    label: 'Style No (A-Z)',   icon: ArrowDownAZ },
  { value: '-style_no',   label: 'Style No (Z-A)',   icon: ArrowUpZA },
];

export const ORDER_OPTIONS_DATE_QTY = [
  { value: '-created_at', label: 'Latest First',          icon: Clock },
  { value: 'created_at',  label: 'Oldest First',          icon: History },
  { value: '-quantity',   label: 'Quantity (High → Low)', icon: TrendingDown },
  { value: 'quantity',    label: 'Quantity (Low → High)', icon: TrendingUp },
  { value: 'style_no',    label: 'Style No (A-Z)',        icon: ArrowDownAZ },
];

export const ORDER_OPTIONS_DATE_PINO = [
  { value: '-created_at', label: 'Latest First',       icon: Clock },
  { value: 'created_at',  label: 'Oldest First',       icon: History },
  { value: 'pi_no',       label: 'Invoice No (A-Z)',   icon: ArrowDownAZ },
  { value: '-pi_no',      label: 'Invoice No (Z-A)',   icon: ArrowUpZA },
];

export const ORDER_OPTIONS_DATE_PONO = [
  { value: '-created_at', label: 'Latest First',  icon: Clock },
  { value: 'created_at',  label: 'Oldest First',  icon: History },
  { value: 'po_number',   label: 'PO No (A-Z)',   icon: ArrowDownAZ },
  { value: '-po_number',  label: 'PO No (Z-A)',   icon: ArrowUpZA },
];

export const ORDER_OPTIONS_DATE_PRODUCT = [
  { value: '-created_at',  label: 'Latest First',  icon: Clock },
  { value: 'created_at',   label: 'Oldest First',  icon: History },
  { value: 'product_name', label: 'Name (A-Z)',    icon: ArrowDownAZ },
  { value: '-product_name',label: 'Name (Z-A)',    icon: ArrowUpZA },
];

export default OrderBySelect;
