import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Clock, ClipboardCheck, XCircle, Layers, Package, TrendingDown, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Premium StatusSelect component
 * Matches the luxury ERP status dropdown design:
 *  - Full-width trigger with circular icon badge + label + chevron
 *  - Floating card with icon-badge rows, checkmark on selected, dividers
 *  - Distinct icon & color per status
 *
 * Props:
 *   options  - [{ value, label, icon, iconBg, iconColor }]
 *   value    - currently selected value string
 *   onChange - called with new value string
 *   placeholder - text shown when value is empty/all
 *   label    - optional form label above the trigger
 *   required - adds * to label
 */
export function StatusSelect({ options = [], value, onChange, placeholder = 'All Statuses', label = null, required = false }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* ── Optional label ── */}
      {label && (
        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.92rem', color: '#1e293b', marginBottom: '0.45rem' }}>
          {label}{required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
        </label>
      )}

      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          width: '100%',
          padding: '0.6rem 0.9rem',
          backgroundColor: '#ffffff',
          border: `1.5px solid ${open ? '#8b5a2b' : '#d6c7b2'}`,
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: open ? '0 0 0 3px rgba(139,90,43,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
          outline: 'none',
          textAlign: 'left',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = '#8b5a2b'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = open ? '#8b5a2b' : '#d6c7b2'; }}
      >
        {/* Icon badge */}
        {selected ? (
          <StatusBadge icon={selected.icon} iconBg={selected.iconBg} iconColor={selected.iconColor} size={20} badgeSize={36} />
        ) : (
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Layers size={18} color="#94a3b8" />
          </div>
        )}

        {/* Label */}
        <span style={{ flex: 1, fontWeight: 600, fontSize: '0.95rem', color: selected ? '#1e293b' : '#94a3b8' }}>
          {selected ? selected.label : placeholder}
        </span>

        {/* Chevron */}
        <ChevronDown
          size={18}
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
            right: 0,
            zIndex: 9999,
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.07)',
            overflow: 'hidden',
            animation: 'fadeSlideDown 0.15s ease',
            minWidth: '220px',
            maxWidth: '92vw',
          }}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            return (
              <React.Fragment key={opt.value || `opt-${idx}`}>
                <button
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.9rem',
                    width: '100%',
                    padding: '0.9rem 1.2rem',
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
                  {/* Icon badge */}
                  <StatusBadge
                    icon={opt.icon}
                    iconBg={isSelected ? opt.iconBg : '#f1f5f9'}
                    iconColor={isSelected ? opt.iconColor : '#64748b'}
                    size={20}
                    badgeSize={38}
                  />

                  {/* Label */}
                  <span style={{ flex: 1, fontWeight: isSelected ? 700 : 500, fontSize: '0.95rem', color: isSelected ? '#8b5a2b' : '#334155' }}>
                    {opt.label}
                  </span>

                  {/* Checkmark */}
                  {isSelected && <Check size={18} color="#8b5a2b" strokeWidth={2.5} />}
                </button>

                {idx < options.length - 1 && (
                  <div style={{ height: '1px', backgroundColor: '#f1ece5', margin: '0 1.2rem' }} />
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

// ── Helper: Status Icon Badge ──────────────────────────────────────────────
function StatusBadge({ icon: Icon, iconBg, iconColor, size = 20, badgeSize = 36 }) {
  if (!Icon) return null;
  return (
    <div style={{
      width: `${badgeSize}px`,
      height: `${badgeSize}px`,
      borderRadius: '50%',
      backgroundColor: iconBg || '#f1f5f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'background 0.15s',
    }}>
      <Icon size={size} color={iconColor || '#64748b'} strokeWidth={1.8} />
    </div>
  );
}

// ── Common Status Option Presets ───────────────────────────────────────────

/** PO Status: All / Pending / Received / Cancelled */
export const PO_STATUS_OPTIONS = [
  { value: '',           label: 'All Statuses',  icon: Layers,        iconBg: '#f1f5f9', iconColor: '#64748b' },
  { value: 'Pending',    label: 'Pending',        icon: Clock,         iconBg: '#eff6ff', iconColor: '#3b82f6' },
  { value: 'Received',   label: 'Received',       icon: ClipboardCheck,iconBg: '#fdf4e7', iconColor: '#8b5a2b' },
  { value: 'Cancelled',  label: 'Cancelled',      icon: XCircle,       iconBg: '#fff1f2', iconColor: '#ef4444' },
];

/** PO form Status (no "All" option) */
export const PO_STATUS_FORM_OPTIONS = [
  { value: 'Pending',    label: 'Pending',        icon: Clock,         iconBg: '#eff6ff', iconColor: '#3b82f6' },
  { value: 'Received',   label: 'Received',       icon: ClipboardCheck,iconBg: '#fdf4e7', iconColor: '#8b5a2b' },
  { value: 'Cancelled',  label: 'Cancelled',      icon: XCircle,       iconBg: '#fff1f2', iconColor: '#ef4444' },
];

/** Stock Filter Status: All / In Stock / Low Stock / Reserved / Out of Stock */
export const STOCK_STATUS_FILTER_OPTIONS = [
  { value: '',            label: 'All Statuses',  icon: Layers,         iconBg: '#f1f5f9', iconColor: '#64748b' },
  { value: 'In Stock',    label: 'In Stock',       icon: CheckCircle2,   iconBg: '#f0fdf4', iconColor: '#16a34a' },
  { value: 'Low Stock',   label: 'Low Stock',      icon: AlertCircle,    iconBg: '#fffbeb', iconColor: '#d97706' },
  { value: 'Reserved',    label: 'Reserved',       icon: Package,        iconBg: '#eff6ff', iconColor: '#3b82f6' },
  { value: 'Out of Stock',label: 'Out of Stock',   icon: XCircle,        iconBg: '#fff1f2', iconColor: '#ef4444' },
];

/** Stock Form Status (no "All" option) */
export const STOCK_STATUS_FORM_OPTIONS = [
  { value: 'In Stock',    label: 'In Stock',       icon: CheckCircle2,   iconBg: '#f0fdf4', iconColor: '#16a34a' },
  { value: 'Low Stock',   label: 'Low Stock',      icon: AlertCircle,    iconBg: '#fffbeb', iconColor: '#d97706' },
  { value: 'Reserved',    label: 'Reserved',       icon: Package,        iconBg: '#eff6ff', iconColor: '#3b82f6' },
  { value: 'Out of Stock',label: 'Out of Stock',   icon: XCircle,        iconBg: '#fff1f2', iconColor: '#ef4444' },
];

export default StatusSelect;
