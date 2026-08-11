import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrafts } from '../context/DraftsContext';
import {
  FileBox, X, Trash2, ArrowRight, Clock, Layers, Receipt,
  ClipboardCheck, Box, Palette, Search, SlidersHorizontal,
  ChevronDown, Lightbulb, Plus, MoreVertical, FileText
} from 'lucide-react';

const FORM_ICONS = {
  pi: Receipt,
  po: ClipboardCheck,
  sample: Box,
  buyer_master: Layers,
  finishing: Palette,
};

const FORM_COLORS = {
  pi: '#8b5cf6',
  po: '#14b8a6',
  sample: '#22c55e',
  buyer_master: '#6366f1',
  finishing: '#8b5a2b',
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'pi', label: 'PI' },
  { id: 'po', label: 'PO' },
  { id: 'sample', label: 'Sample' },
  { id: 'buyer_master', label: 'Buyer Master' },
  { id: 'finishing', label: 'Finishing' },
];

export function DraftsModal({ isOpen, onClose }) {
  const { drafts, deleteDraft } = useDrafts();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeMenuDraftId, setActiveMenuDraftId] = useState(null);

  // Filter & Sort Drafts
  const processedDrafts = useMemo(() => {
    let result = [...drafts];

    if (selectedCategory !== 'all') {
      result = result.filter(d => d.formType === selectedCategory);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(d =>
        (d.title && d.title.toLowerCase().includes(q)) ||
        (d.targetPath && d.targetPath.toLowerCase().includes(q)) ||
        (d.formLabel && d.formLabel.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [drafts, selectedCategory, searchTerm, sortOrder]);

  if (!isOpen) return null;

  const handleResumeDraft = (draft) => {
    onClose();
    navigate(draft.targetPath, { state: { draftId: draft.id, draftData: draft.data } });
  };

  const formatRelativeTime = (isoString) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSecs = Math.floor((now - date) / 1000);
      if (diffSecs < 60) return 'Just now';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 99998,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-12px 0 35px -5px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Top Header ────────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '1.35rem 1.5rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                backgroundColor: '#f6eedf',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b3e1f',
                flexShrink: 0
              }}
            >
              <FileBox size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1c1917', margin: 0, letterSpacing: '-0.01em' }}>
                Saved Drafts ({drafts.length})
              </h3>
              <p style={{ fontSize: '0.83rem', color: '#78716c', margin: '3px 0 0' }}>
                Resume unfinished forms anytime.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: '#f6eedf',
              border: 'none',
              color: '#6b3e1f',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s'
            }}
            title="Close Drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Category Filter Pills ────────────────────────────────────────────── */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            display: 'flex',
            gap: '0.45rem',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            borderBottom: '1px solid #fafaf9'
          }}
        >
          {CATEGORIES.map(cat => {
            const count = cat.id === 'all' ? drafts.length : drafts.filter(d => d.formType === cat.id).length;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '0.4rem 0.95rem',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 500,
                  border: isActive ? 'none' : '1px solid #e7e5e4',
                  backgroundColor: isActive ? '#5c3a21' : '#ffffff',
                  color: isActive ? '#ffffff' : '#57534e',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s'
                }}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* ── Search & Sort Controls ───────────────────────────────────────────── */}
        <div
          style={{
            padding: '0.5rem 1.5rem 1rem',
            display: 'flex',
            gap: '0.65rem',
            alignItems: 'center'
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              backgroundColor: '#ffffff',
              border: '1px solid #e7e5e4',
              borderRadius: '12px',
              padding: '0.5rem 0.85rem',
              transition: 'border-color 0.15s'
            }}
          >
            <Search size={16} color="#a8a29e" />
            <input
              type="text"
              placeholder="Search drafts..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '0.88rem',
                color: '#1c1917',
                backgroundColor: 'transparent'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ background: 'none', border: 'none', color: '#a8a29e', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowSortMenu(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e7e5e4',
                borderRadius: '12px',
                padding: '0.5rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#44403c',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <SlidersHorizontal size={15} color="#78716c" />
              <span>Sort</span>
              <ChevronDown size={14} color="#78716c" />
            </button>

            {showSortMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid #e7e5e4',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  zIndex: 10,
                  overflow: 'hidden',
                  minWidth: '130px'
                }}
              >
                <button
                  type="button"
                  onClick={() => { setSortOrder('newest'); setShowSortMenu(false); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.82rem',
                    fontWeight: sortOrder === 'newest' ? 700 : 500,
                    color: sortOrder === 'newest' ? '#5c3a21' : '#44403c',
                    backgroundColor: sortOrder === 'newest' ? '#fdf8f4' : 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Newest First
                </button>
                <button
                  type="button"
                  onClick={() => { setSortOrder('oldest'); setShowSortMenu(false); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.82rem',
                    fontWeight: sortOrder === 'oldest' ? 700 : 500,
                    color: sortOrder === 'oldest' ? '#5c3a21' : '#44403c',
                    backgroundColor: sortOrder === 'oldest' ? '#fdf8f4' : 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Oldest First
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Scrollable Body / Content Area ───────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem' }}>
          {processedDrafts.length === 0 ? (
            /* Empty State */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2.5rem 1rem 1.5rem',
                textAlign: 'center'
              }}
            >
              {/* Folder Box Graphic */}
              <div
                style={{
                  position: 'relative',
                  width: '130px',
                  height: '110px',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* Oval shadow */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    width: '110px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#f6eedf',
                    zIndex: 1
                  }}
                />
                {/* Folder icon illustration */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    width: '76px',
                    height: '56px',
                    borderRadius: '10px',
                    backgroundColor: '#ffffff',
                    border: '2px solid #d6c7b2',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.04)'
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '30px',
                      borderRadius: '6px',
                      backgroundColor: '#f8f4ec',
                      border: '1.5px solid #d6c7b2',
                      marginTop: '-14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <FileText size={16} color="#6b3e1f" />
                  </div>
                </div>

                {/* Decorative Sparkles */}
                <div style={{ position: 'absolute', top: '10px', left: '10px', color: '#f5d0a9', fontSize: '14px' }}>✨</div>
                <div style={{ position: 'absolute', top: '20px', right: '10px', color: '#f5d0a9', fontSize: '14px' }}>✦</div>
              </div>

              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1c1917', margin: '0 0 0.4rem' }}>
                No saved drafts found
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#78716c', margin: '0 0 2rem', maxWidth: '300px', lineHeight: 1.5 }}>
                {selectedCategory === 'all'
                  ? 'When you choose "Save as Draft" in any form, it will appear here.'
                  : 'No drafts found for this category.'}
              </p>

              {/* Tip Banner */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '360px',
                  backgroundColor: '#fffbf3',
                  border: '1.5px dashed #f5d0a9',
                  borderRadius: '16px',
                  padding: '1.15rem 1.25rem',
                  textAlign: 'left',
                  display: 'flex',
                  gap: '0.85rem',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ fontSize: '1.3rem', lineHeight: 1, marginTop: '2px' }}>💡</div>
                <div>
                  <h5 style={{ fontSize: '0.9rem', fontWeight: 750, color: '#6b3e1f', margin: '0 0 4px' }}>
                    Tip
                  </h5>
                  <p style={{ fontSize: '0.82rem', color: '#8c5e38', margin: 0, lineHeight: 1.45 }}>
                    You can save your progress in forms and continue later from here.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Populated Draft Cards List */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {processedDrafts.map(draft => {
                const IconComp = FORM_ICONS[draft.formType] || FileBox;
                const themeColor = FORM_COLORS[draft.formType] || '#8b5a2b';
                return (
                  <div
                    key={draft.id}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #f0eae1',
                      borderLeft: `4px solid ${themeColor}`,
                      borderRadius: '16px',
                      padding: '1.15rem',
                      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                      position: 'relative',
                      transition: 'transform 0.15s, box-shadow 0.15s'
                    }}
                  >
                    {/* Top Row: Icon + Label + Time + Menu */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            backgroundColor: `${themeColor}18`,
                            color: themeColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <IconComp size={17} />
                        </div>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            color: themeColor,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                          }}
                        >
                          {draft.formLabel || draft.formType}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#78716c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} color="#a8a29e" /> {formatRelativeTime(draft.updatedAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveMenuDraftId(activeMenuDraftId === draft.id ? null : draft.id)}
                          style={{ background: 'none', border: 'none', color: '#a8a29e', cursor: 'pointer', padding: '2px' }}
                          title="More options"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Middle Title & Path */}
                    <div>
                      <h4
                        style={{
                          fontSize: '0.98rem',
                          fontWeight: 750,
                          color: '#1c1917',
                          margin: '0 0 4px 0',
                          lineHeight: 1.35
                        }}
                      >
                        {draft.title}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: '#78716c', margin: 0 }}>
                        Path: <span style={{ fontFamily: 'monospace', color: '#57534e' }}>{draft.targetPath}</span>
                      </p>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '0.2rem',
                        paddingTop: '0.65rem',
                        borderTop: '1px solid #fafaf9'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => deleteDraft(draft.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px 6px',
                          borderRadius: '6px',
                          fontSize: '0.83rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'opacity 0.15s'
                        }}
                      >
                        <Trash2 size={15} /> Delete
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResumeDraft(draft)}
                        style={{
                          backgroundColor: '#5c3a21',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '0.45rem 1.05rem',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 4px rgba(92, 58, 33, 0.2)',
                          transition: 'transform 0.1s, backgroundColor 0.15s'
                        }}
                      >
                        Resume Draft <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Sticky Bottom Footer Bar ─────────────────────────────────────────── */}
        <div
          style={{
            padding: '0.9rem 1.5rem',
            backgroundColor: '#faf5ee',
            borderTop: '1px solid #f0eae1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                border: '1px solid #e7e5e4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b3e1f',
                flexShrink: 0
              }}
            >
              <FileText size={17} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: '#1c1917', fontWeight: 750 }}>
                Drafts help you save time
              </strong>
              <span style={{ fontSize: '0.78rem', color: '#78716c' }}>
                Your progress is safe and secure.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/samples/new');
            }}
            style={{
              backgroundColor: '#5c3a21',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.5rem 1rem',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 5px rgba(92, 58, 33, 0.2)'
            }}
          >
            <Plus size={15} /> Start New
          </button>
        </div>
      </div>
    </div>
  );
}

export default DraftsModal;
