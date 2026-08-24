import React from 'react';

/**
 * Hollow Skeleton Loader for Tables Listing
 */
export function TableSkeleton({ rows = 6, cols = 7, hasImage = false }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="skeleton-row">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} style={{ padding: '0.9rem 1rem', verticalAlign: 'middle' }}>
              {cIdx === 0 && hasImage ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="skeleton-thumb" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                    <div className="skeleton-box" style={{ width: '75%', height: '1em' }} />
                    <div className="skeleton-box" style={{ width: '45%', height: '0.8em' }} />
                  </div>
                </div>
              ) : (
                <div
                  className="skeleton-box"
                  style={{
                    width: `${Math.floor(35 + ((cIdx * 23 + rIdx * 11) % 45))}%`,
                    height: '1em',
                  }}
                />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Hollow Skeleton Loader for Cards & Mobile Views
 */
export function CardSkeleton({ count = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="skeleton-thumb" style={{ width: '48px', height: '48px', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
              <div className="skeleton-box" style={{ width: '70%', height: '1.1em' }} />
              <div className="skeleton-box" style={{ width: '40%', height: '0.85em' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
            <div className="skeleton-box" style={{ width: '30%', height: '0.9em' }} />
            <div className="skeleton-box" style={{ width: '30%', height: '0.9em' }} />
            <div className="skeleton-box" style={{ width: '30%', height: '0.9em', marginLeft: 'auto' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Hollow Skeleton Loader for Top KPI Stat Cards
 */
export function StatCardsSkeleton({ count = 4 }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="skeleton-box" style={{ width: '55%', height: '0.85rem' }} />
            <div className="skeleton-thumb" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
          </div>
          <div className="skeleton-box" style={{ width: '70%', height: '1.6rem', marginTop: '0.6rem' }} />
          <div className="skeleton-box" style={{ width: '85%', height: '0.75rem', marginTop: '0.5rem' }} />
        </div>
      ))}
    </div>
  );
}

/**
 * Hollow Skeleton Loader for Form Opening & Page Data Loading
 */
export function FormSkeleton({ fields = 6 }) {
  return (
    <div style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="skeleton-thumb" style={{ width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <div className="skeleton-box" style={{ width: '40%', height: '1.3rem' }} />
          <div className="skeleton-box" style={{ width: '25%', height: '0.85rem' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {Array.from({ length: fields }).map((_, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="skeleton-box" style={{ width: '35%', height: '0.85rem' }} />
            <div className="skeleton-box" style={{ width: '100%', height: '42px', borderRadius: '8px' }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
        <div className="skeleton-box" style={{ width: '100px', height: '40px', borderRadius: '8px' }} />
        <div className="skeleton-box" style={{ width: '140px', height: '40px', borderRadius: '8px' }} />
      </div>
    </div>
  );
}

/**
 * Hollow Skeleton Loader for Navigation Tabs
 */
export function TabSkeleton({ count = 5 }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.25rem 0', marginBottom: '1rem' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="skeleton-box"
          style={{
            width: `${100 + (idx % 3) * 25}px`,
            height: '38px',
            borderRadius: '999px',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

export default TableSkeleton;
