import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, ZoomIn, ZoomOut, RotateCcw, ExternalLink, ChevronLeft, ChevronRight,
  Download, Palette, Shield, Gem, Scissors, FileEdit, Layers
} from 'lucide-react';

function DotGridIcon({ color = "#9a5323", size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="3" cy="3" r="1.5" fill={color} />
      <circle cx="8" cy="3" r="1.5" fill={color} />
      <circle cx="13" cy="3" r="1.5" fill={color} />
      <circle cx="3" cy="8" r="1.5" fill={color} />
      <circle cx="8" cy="8" r="1.5" fill={color} />
      <circle cx="13" cy="8" r="1.5" fill={color} />
      <circle cx="3" cy="13" r="1.5" fill={color} />
      <circle cx="8" cy="13" r="1.5" fill={color} />
      <circle cx="13" cy="13" r="1.5" fill={color} />
    </svg>
  );
}

const CATEGORY_CONFIG = {
  wood: { label: 'Wood Finish', shortLabel: 'Wood', icon: Palette, color: '#d97706', bg: 'rgba(217, 119, 6, 0.15)', border: 'rgba(217, 119, 6, 0.35)' },
  metal: { label: 'Metal Finish', shortLabel: 'Metal', icon: Shield, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.35)' },
  marble: { label: 'Marble Finish', shortLabel: 'Marble', icon: Gem, color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.35)' },
  fabric: { label: 'Fabric Type', shortLabel: 'Fabric', icon: Scissors, color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)', border: 'rgba(192, 132, 252, 0.35)' },
  plastic: { label: 'Plastic Type', shortLabel: 'Plastic', icon: Layers, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' },
};

/**
 * FinishImageModal
 * Interactive High-Definition Finish Texture & Detailing Inspector Lightbox
 */
export default function FinishImageModal({
  finish,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  currentIndex = null,
  totalCount = null,
  onViewDetails = null
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const containerRef = useRef(null);

  const rawSrc = finish?.image_url || finish?.image;
  // If the path starts with /media or is relative, make sure it's accessible
  const imgSrc = rawSrc;

  const category = finish?.category || 'wood';
  const catConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.wood;
  const CatIcon = catConfig.icon;

  // Reset zoom & pan when finish changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setImageLoaded(false);
  }, [finish?.id, imgSrc]);

  // Lock background body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      } else if (e.key === '+' || e.key === '=') {
        setZoom(z => Math.min(Number((z + 0.25).toFixed(2)), 4));
      } else if (e.key === '-' || e.key === '_') {
        setZoom(z => {
          const nextZ = Math.max(Number((z - 0.25).toFixed(2)), 1);
          if (nextZ === 1) setPan({ x: 0, y: 0 });
          return nextZ;
        });
      } else if (e.key === '0') {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  // Wheel zoom handling
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Zoom in
      setZoom(z => Math.min(Number((z + 0.25).toFixed(2)), 4));
    } else {
      // Zoom out
      setZoom(z => {
        const nextZ = Math.max(Number((z - 0.25).toFixed(2)), 1);
        if (nextZ === 1) setPan({ x: 0, y: 0 });
        return nextZ;
      });
    }
  }, []);

  // Double click toggles 1x and 2x
  const handleDoubleClick = () => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  // Drag pan handling
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e) => {
    if (zoom <= 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - pan.x,
      y: e.touches[0].clientY - pan.y
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || zoom <= 1 || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const zoomIn = () => setZoom(z => Math.min(Number((z + 0.5).toFixed(2)), 4));
  const zoomOut = () => setZoom(z => {
    const nextZ = Math.max(Number((z - 0.5).toFixed(2)), 1);
    if (nextZ === 1) setPan({ x: 0, y: 0 });
    return nextZ;
  });
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Direct file download using Blob to force disk save (bypasses browser opening in tab)
  const handleDownload = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!imgSrc || downloading) return;

    try {
      setDownloading(true);
      // Route through local proxy if pointing to backend host to guarantee same-origin blob download
      const proxyUrl = imgSrc
        .replace(/^http:\/\/127\.0\.0\.1:8000/, '')
        .replace(/^http:\/\/localhost:8000/, '');

      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      const codePart = finish.finish_code ? `${finish.finish_code}_` : '';
      const namePart = (finish.name || 'finish').trim().replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_');
      link.download = `${codePart}${namePart}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('Blob fetch failed, falling back to direct link download:', err);
      const link = document.createElement('a');
      link.href = imgSrc;
      link.target = '_blank';
      link.download = `${finish.name || 'finish'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  };

  // Category specific spec text & icon
  let specLabel = 'Wood Type';
  let specIcon = <DotGridIcon size={15} color="#d97706" />;
  let specVal = finish?.wood_type || '—';

  if (category === 'metal') {
    specLabel = 'Metal & Coating';
    specIcon = <Shield size={15} color="#94a3b8" />;
    specVal = [finish?.metal_type, finish?.coating_type].filter(Boolean).join(' • ') || '—';
  } else if (category === 'marble') {
    specLabel = 'Marble & Treatment';
    specIcon = <Gem size={15} color="#34d399" />;
    specVal = [finish?.marble_type, finish?.surface_treatment].filter(Boolean).join(' • ') || '—';
  } else if (category === 'fabric') {
    specLabel = 'Material & Pattern';
    specIcon = <Scissors size={15} color="#c084fc" />;
    specVal = [finish?.material_type, finish?.pattern].filter(Boolean).join(' • ') || '—';
  } else if (category === 'plastic') {
    specLabel = 'Polymer & Finish';
    specIcon = <Layers size={15} color="#38bdf8" />;
    specVal = [finish?.plastic_type, finish?.plastic_finish].filter(Boolean).join(' • ') || '—';
  }

  if (!finish) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(8, 12, 20, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem',
        userSelect: 'none',
        animation: 'finishModalFadeIn 220ms ease-out forwards',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes finishModalFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes finishImgPulse {
          0% { opacity: 0.5; }
          50% { opacity: 0.8; }
          100% { opacity: 0.5; }
        }
      `}</style>

      {/* ── Top Header Bar ── */}
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '0.6rem 1rem',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
          zIndex: 10,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Left: Code, Category, Finish Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          {finish.finish_code && (
            <span
              style={{
                backgroundColor: '#fff2e2',
                color: '#9a5323',
                fontWeight: 800,
                fontSize: '0.85rem',
                padding: '4px 12px',
                borderRadius: '8px',
                letterSpacing: '0.02em',
                flexShrink: 0
              }}
            >
              {finish.finish_code}
            </span>
          )}

          <span
            style={{
              backgroundColor: catConfig.bg,
              color: catConfig.color,
              border: `1px solid ${catConfig.border}`,
              fontWeight: 700,
              fontSize: '0.78rem',
              padding: '3px 10px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              flexShrink: 0
            }}
          >
            <CatIcon size={13} />
            {catConfig.shortLabel}
          </span>

          <h2
            style={{
              margin: 0,
              fontSize: '1.15rem',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            title={finish.name}
          >
            {finish.name}
          </h2>
        </div>

        {/* Right: Counter, Action Buttons & Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
          {currentIndex !== null && totalCount !== null && (
            <span
              style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                fontWeight: 600,
                marginRight: '0.4rem',
                padding: '3px 8px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '6px'
              }}
            >
              {currentIndex + 1} / {totalCount}
            </span>
          )}

          {imgSrc && (
            <a
              href={imgSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-link"
              title="Open full-resolution image in a new browser tab"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1',
                borderRadius: '10px',
                padding: '6px 11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Open in Tab</span>
            </a>
          )}

          {imgSrc && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              title="Save image directly to your Downloads folder"
              style={{
                background: downloading ? 'rgba(217, 119, 6, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                border: downloading ? '1px solid rgba(217, 119, 6, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
                color: downloading ? '#fde68a' : '#cbd5e1',
                borderRadius: '10px',
                padding: '6px 11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: downloading ? 'wait' : 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                if (!downloading) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
                  e.currentTarget.style.color = '#ffffff';
                }
              }}
              onMouseLeave={e => {
                if (!downloading) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#cbd5e1';
                }
              }}
            >
              <Download size={14} />
              <span className="hidden sm:inline">{downloading ? 'Downloading...' : 'Download'}</span>
            </button>
          )}

          {onViewDetails && (
            <button
              type="button"
              onClick={onViewDetails}
              title="View / Edit finish record"
              style={{
                background: 'rgba(217, 119, 6, 0.2)',
                border: '1px solid rgba(217, 119, 6, 0.4)',
                color: '#fde68a',
                borderRadius: '10px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'rgba(217, 119, 6, 0.35)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'rgba(217, 119, 6, 0.2)';
              }}
            >
              <FileEdit size={14} />
              <span>Edit Record</span>
            </button>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: '#ffffff',
              borderRadius: '10px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── Main Canvas Viewport ── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '1200px',
          margin: '0.75rem 0',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.5)',
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
        onClick={e => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        {/* Navigation Arrows (Prev / Next) */}
        {hasPrev && onPrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            title="Previous Finish (Left Arrow)"
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 30,
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '46px',
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
              transition: 'all 0.18s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(217, 119, 6, 0.85)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >
            <ChevronLeft size={26} />
          </button>
        )}

        {hasNext && onNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            title="Next Finish (Right Arrow)"
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 30,
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              borderRadius: '50%',
              width: '46px',
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
              transition: 'all 0.18s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(217, 119, 6, 0.85)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >
            <ChevronRight size={26} />
          </button>
        )}

        {/* Loading Spinner / Shimmer */}
        {!imageLoaded && imgSrc && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: '#94a3b8',
              zIndex: 5,
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.1)',
                borderTopColor: '#d97706',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Loading finish texture...</span>
          </div>
        )}

        {/* The Enlarged Image */}
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={finish.name}
            onLoad={() => setImageLoaded(true)}
            style={{
              maxWidth: '92%',
              maxHeight: '92%',
              objectFit: 'contain',
              borderRadius: '14px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8)',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: 'auto',
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
              opacity: imageLoaded ? 1 : 0,
            }}
            draggable={false}
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
            <CatIcon size={64} style={{ opacity: 0.4, margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#ffffff', fontSize: '1.2rem', margin: 0 }}>No Image Available</h3>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>This finish does not have an attached swatch image yet.</p>
          </div>
        )}

        {/* Floating Zoom & Inspection HUD Controls */}
        <div
          style={{
            position: 'absolute',
            bottom: '18px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '30px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Zoom Out */}
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= 1}
            title="Zoom Out (-)"
            style={{
              background: 'transparent',
              border: 'none',
              color: zoom <= 1 ? 'rgba(255,255,255,0.3)' : '#ffffff',
              cursor: zoom <= 1 ? 'not-allowed' : 'pointer',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={e => { if (zoom > 1) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <ZoomOut size={16} />
          </button>

          {/* Zoom Percentage Badge */}
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#f8fafc',
              minWidth: '52px',
              textAlign: 'center',
              letterSpacing: '0.02em',
              padding: '2px 6px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)'
            }}
          >
            {Math.round(zoom * 100)}%
          </span>

          {/* Zoom In */}
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= 4}
            title="Zoom In (+)"
            style={{
              background: 'transparent',
              border: 'none',
              color: zoom >= 4 ? 'rgba(255,255,255,0.3)' : '#ffffff',
              cursor: zoom >= 4 ? 'not-allowed' : 'pointer',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={e => { if (zoom < 4) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <ZoomIn size={16} />
          </button>

          {/* Reset Zoom */}
          <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

          <button
            type="button"
            onClick={resetZoom}
            disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
            title="Reset Zoom & Pan (0)"
            style={{
              background: 'transparent',
              border: 'none',
              color: (zoom === 1 && pan.x === 0 && pan.y === 0) ? 'rgba(255,255,255,0.3)' : '#ffffff',
              cursor: (zoom === 1 && pan.x === 0 && pan.y === 0) ? 'not-allowed' : 'pointer',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={e => { if (zoom !== 1 || pan.x !== 0) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* ── Bottom Specifications Strip ── */}
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '0.75rem 1.25rem',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
          zIndex: 10,
          flexWrap: 'wrap'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Left: Color & Category Spec */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          {/* Color item */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'rgba(217, 119, 6, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(217, 119, 6, 0.3)'
              }}
            >
              <Palette size={14} color="#f59e0b" />
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500, lineHeight: 1 }}>Color / Shade</span>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: '#ffffff', fontWeight: 700, marginTop: '2px' }}>
                {finish.color || '—'}
              </strong>
            </div>
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

          {/* Specific Type item */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: catConfig.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${catConfig.border}`
              }}
            >
              {specIcon}
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500, lineHeight: 1 }}>{specLabel}</span>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: '#ffffff', fontWeight: 700, marginTop: '2px' }}>
                {specVal}
              </strong>
            </div>
          </div>
        </div>

        {/* Right: Helpful hint badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#94a3b8', fontSize: '0.78rem' }}>
          <span style={{ opacity: 0.85 }}>
            🔍 <strong>Scroll</strong> or <strong>double-click</strong> to zoom • <strong>Drag</strong> to pan texture
          </span>
        </div>
      </div>
    </div>
  );
}
