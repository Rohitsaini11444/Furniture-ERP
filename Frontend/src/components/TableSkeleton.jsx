import React from 'react';

export function TableSkeleton({ rows = 6, cols = 7, hasImage = false }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="skeleton-row">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} style={{ padding: '0.9rem 1rem', verticalAlign: 'middle' }}>
              {cIdx === 0 && hasImage ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="skeleton-thumb" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                    <div className="skeleton-box" style={{ width: '75%', height: '1em' }} />
                    <div className="skeleton-box" style={{ width: '45%', height: '0.8em' }} />
                  </div>
                </div>
              ) : (
                <div
                  className="skeleton-box"
                  style={{
                    width: `${Math.floor(35 + ((cIdx * 23) % 45))}%`,
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

export function CardSkeleton({ count = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="skeleton-thumb" style={{ width: '52px', height: '52px', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
              <div className="skeleton-box" style={{ width: '75%', height: '1.1em' }} />
              <div className="skeleton-box" style={{ width: '45%', height: '0.85em' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
            <div className="skeleton-box" style={{ width: '30%', height: '0.9em' }} />
            <div className="skeleton-box" style={{ width: '30%', height: '0.9em' }} />
            <div className="skeleton-box" style={{ width: '30%', height: '0.9em', marginLeft: 'auto' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default TableSkeleton;
