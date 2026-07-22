import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="btn-secondary"
        style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        title="Previous Page"
      >
        <ChevronLeft size={18} />
      </button>
      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#475569' }}>
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="btn-secondary"
        style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        title="Next Page"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

export default Pagination;
