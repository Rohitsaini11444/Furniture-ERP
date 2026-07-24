import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Premium Responsive Custom Date Picker
 * Styled to match exact design specification.
 *
 * Props:
 *   value       - String (YYYY-MM-DD)
 *   onChange    - Function (called with YYYY-MM-DD)
 *   label       - String (optional, rendered above picker)
 *   required    - Boolean (adds red asterisk to label)
 *   placeholder - String (default is Select Date)
 *   disabled    - Boolean
 */
export function CustomDatePicker({
  value = '',
  onChange,
  label = null,
  required = false,
  placeholder = 'Select Date',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial date value or default to today's month/year for navigation
  const getParsedDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  };

  const parsedValue = getParsedDate(value);
  const today = new Date();

  // Navigation state (month index 0-11, year)
  const [navMonth, setNavMonth] = useState(parsedValue ? parsedValue.getMonth() : today.getMonth());
  const [navYear, setNavYear] = useState(parsedValue ? parsedValue.getFullYear() : today.getFullYear());

  // Update nav state when value changes externally
  useEffect(() => {
    if (parsedValue) {
      setNavMonth(parsedValue.getMonth());
      setNavYear(parsedValue.getFullYear());
    }
  }, [value]);

  // Close calendar on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear(prev => prev - 1);
    } else {
      setNavMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear(prev => prev + 1);
    } else {
      setNavMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day, isCurrentMonth, offset = 0) => {
    let targetMonth = navMonth + offset;
    let targetYear = navYear;

    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }

    const pad = (num) => String(num).padStart(2, '0');
    const dateStr = `${targetYear}-${pad(targetMonth + 1)}-${pad(day)}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const handleToday = () => {
    const pad = (num) => String(num).padStart(2, '0');
    const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  // Format date as DD-MM-YYYY for display
  const getDisplayValue = () => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  // Generate calendar grid (42 days)
  const generateDays = () => {
    const days = [];
    const firstDayIndex = new Date(navYear, navMonth, 1).getDay();
    const totalDays = new Date(navYear, navMonth + 1, 0).getDate();
    const prevTotalDays = new Date(navYear, navMonth, 0).getDate();

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: prevTotalDays - i,
        isCurrentMonth: false,
        offset: -1
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        offset: 0
      });
    }

    // Next month leading days
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        offset: 1
      });
    }

    return days;
  };

  const calendarDays = generateDays();

  // Helper to check if a day is today
  const isToday = (day, offset) => {
    let checkMonth = navMonth + offset;
    let checkYear = navYear;
    if (checkMonth < 0) {
      checkMonth = 11;
      checkYear -= 1;
    } else if (checkMonth > 11) {
      checkMonth = 0;
      checkYear += 1;
    }
    return (
      day === today.getDate() &&
      checkMonth === today.getMonth() &&
      checkYear === today.getFullYear()
    );
  };

  // Helper to check if a day is selected
  const isSelected = (day, offset) => {
    if (!parsedValue) return false;
    let checkMonth = navMonth + offset;
    let checkYear = navYear;
    if (checkMonth < 0) {
      checkMonth = 11;
      checkYear -= 1;
    } else if (checkMonth > 11) {
      checkMonth = 0;
      checkYear += 1;
    }
    return (
      day === parsedValue.getDate() &&
      checkMonth === parsedValue.getMonth() &&
      checkYear === parsedValue.getFullYear()
    );
  };

  return (
    <div ref={containerRef} className="custom-datepicker-wrapper" style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
        </label>
      )}

      {/* ── Input Trigger ── */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.65rem 1.1rem',
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
        <CalendarIcon size={18} color="#8b5a2b" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, color: value ? '#1e293b' : '#94a3b8', fontSize: '0.92rem', fontWeight: value ? 600 : 500 }}>
          {getDisplayValue() || placeholder}
        </span>
        <ChevronDown size={18} color="#8b5a2b" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      {/* ── Calendar Popup Panel ── */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 1000,
            backgroundColor: '#ffffff',
            border: '1px solid #e7e5e4',
            borderRadius: '16px',
            boxShadow: '0 12px 32px -4px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
            padding: '1.15rem',
            animation: 'fadeIn 0.15s ease-out',
            width: '290px',
            maxWidth: '92vw'
          }}
        >
          {/* Calendar Header: Prev / Month Year / Next */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#f5efe6',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ebe2d6'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f5efe6'}
            >
              <ChevronLeft size={16} color="#8b5a2b" />
            </button>

            <span style={{ fontWeight: 700, fontSize: '0.98rem', color: '#8b5a2b' }}>
              {monthNames[navMonth]} {navYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#f5efe6',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ebe2d6'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f5efe6'}
            >
              <ChevronRight size={16} color="#8b5a2b" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.45rem', marginBottom: '0.45rem', textAlign: 'center' }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
              <span key={i} style={{ fontSize: '0.78rem', fontWeight: 600, color: '#78716c' }}>
                {d}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.45rem', textAlign: 'center' }}>
            {calendarDays.map((item, idx) => {
              const currentSelected = isSelected(item.day, item.offset);
              const currentToday = isToday(item.day, item.offset);

              let cellStyle = {
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                margin: '0 auto',
                border: '1.5px solid transparent'
              };

              if (currentSelected) {
                cellStyle.backgroundColor = '#8b5a2b';
                cellStyle.color = '#ffffff';
                cellStyle.fontWeight = '700';
              } else if (currentToday) {
                cellStyle.borderColor = '#d6c7b2';
                cellStyle.color = '#8b5a2b';
                cellStyle.fontWeight = '700';
              } else if (!item.isCurrentMonth) {
                cellStyle.color = '#cbd5e1';
              } else {
                cellStyle.color = '#1e293b';
              }

              return (
                <div
                  key={idx}
                  onClick={() => handleSelectDay(item.day, item.isCurrentMonth, item.offset)}
                  style={cellStyle}
                  onMouseEnter={e => {
                    if (!currentSelected) {
                      e.currentTarget.style.backgroundColor = '#f5efe6';
                      e.currentTarget.style.color = '#8b5a2b';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!currentSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      if (currentToday) {
                        e.currentTarget.style.color = '#8b5a2b';
                      } else if (!item.isCurrentMonth) {
                        e.currentTarget.style.color = '#cbd5e1';
                      } else {
                        e.currentTarget.style.color = '#1e293b';
                      }
                    }
                  }}
                >
                  {item.day}
                </div>
              );
            })}
          </div>

          {/* Footer Action Buttons */}
          <div style={{ display: 'flex', borderTop: '1px solid #f1ece5', marginTop: '0.95rem', paddingTop: '0.75rem', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleClear}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                color: '#8b5a2b',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                padding: '0.45rem',
                textAlign: 'left'
              }}
            >
              Clear
            </button>
            <div style={{ width: '1px', backgroundColor: '#f1ece5' }} />
            <button
              type="button"
              onClick={handleToday}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                color: '#8b5a2b',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                padding: '0.45rem',
                textAlign: 'right'
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default CustomDatePicker;
