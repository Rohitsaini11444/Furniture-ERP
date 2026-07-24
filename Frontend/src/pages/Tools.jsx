import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import {
  FileText, Presentation, Tag, ClipboardCheck, Calculator,
  Search, CheckSquare, Square, Download, Sparkles, Building2,
  Box, CheckCircle, AlertCircle
} from 'lucide-react';
import { TableSkeleton, CardSkeleton } from '../components/TableSkeleton';
import Pagination from '../components/Pagination';

function Tools() {
  const [activeTool, setActiveTool] = useState('presentation'); // 'presentation' | 'pricetag' | 'qcreport' | 'costing'

  // Presentation State
  const [buyers, setBuyers] = useState([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [itemSource, setItemSource] = useState('samples'); // 'samples' | 'buyer_masters'
  const [samples, setSamples] = useState([]);
  const [buyerMasters, setBuyerMasters] = useState([]);
  const [selectedSampleIds, setSelectedSampleIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedFinish, setSelectedFinish] = useState('');
  const [itemsPerSlide, setItemsPerSlide] = useState(2);
  const [includePrice, setIncludePrice] = useState(true);
  const [includeSpecs, setIncludeSpecs] = useState(true);

  const [loading, setLoading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState(null); // 'pptx' | 'pdf' | null

  // Pagination for Samples
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch Buyers
  useEffect(() => {
    api.get('/buyers/')
      .then(res => {
        const data = res.data.results || res.data;
        setBuyers(data);
      })
      .catch(err => console.error(err));
  }, []);

  // Fetch Samples / Buyer Masters dynamically based on itemSource & selectedBuyerId
  const fetchItems = useCallback(() => {
    setLoading(true);
    if (itemSource === 'buyer_masters') {
      const params = { page: currentPage };
      if (selectedBuyerId) params.buyer = selectedBuyerId;
      api.get('/buyer-masters/', { params })
        .then(res => {
          const data = res.data.results || res.data;
          setBuyerMasters(data);
          if (res.data.count !== undefined) {
            setTotalPages(Math.ceil(res.data.count / 50));
          } else {
            setTotalPages(1);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else {
      const params = { page: currentPage };
      if (selectedBuyerId) params.buyer = selectedBuyerId;
      api.get('/samples/', { params })
        .then(res => {
          const data = res.data.results || res.data;
          setSamples(data);
          if (res.data.count !== undefined) {
            setTotalPages(Math.ceil(res.data.count / 50));
          } else {
            setTotalPages(1);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [currentPage, itemSource, selectedBuyerId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const activeItemList = itemSource === 'buyer_masters' ? buyerMasters : samples;

  // Extract Dynamic Material & Finish Options
  const dynamicMaterials = Array.from(
    new Set(activeItemList.map(s => s.material || s.sample?.material).filter(Boolean))
  );

  const dynamicFinishes = Array.from(
    new Set(activeItemList.map(s => s.finish_color || s.sample?.finish_color).filter(Boolean))
  );

  // Filter items dynamically
  const filteredSamples = activeItemList.filter(s => {
    const mat = s.material || s.sample?.material || '';
    const fin = s.finish_color || s.sample?.finish_color || '';
    const name = s.product_name || s.sample?.product_name || '';
    const styleId = s.sample_id || s.style_no || '';

    if (selectedMaterial && mat !== selectedMaterial) return false;
    if (selectedFinish && fin !== selectedFinish) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      styleId.toLowerCase().includes(term) ||
      name.toLowerCase().includes(term) ||
      mat.toLowerCase().includes(term) ||
      fin.toLowerCase().includes(term)
    );
  });

  // Toggle sample selection
  const toggleSelectSample = (id) => {
    setSelectedSampleIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllFilteredSamples = () => {
    const filteredIds = filteredSamples.map(s => s.id);
    const allSelected = filteredIds.every(id => selectedSampleIds.includes(id));
    if (allSelected) {
      setSelectedSampleIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedSampleIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Generate Presentation (PPTX / PDF)
  const handleGeneratePresentation = async (format) => {
    if (selectedSampleIds.length === 0) {
      alert('Please select at least one sample item to generate presentation.');
      return;
    }

    setDownloadingFormat(format);
    try {
      const selectedBuyer = buyers.find(b => b.id === selectedBuyerId);
      const buyerCode = selectedBuyer ? selectedBuyer.code : 'Catalog';

      const payload = {
        buyer_id: selectedBuyerId || null,
        format: format,
        items_per_slide: itemsPerSlide,
        include_price: includePrice,
        include_specs: includeSpecs
      };

      if (itemSource === 'buyer_masters') {
        payload.buyer_master_ids = selectedSampleIds;
      } else {
        payload.sample_ids = selectedSampleIds;
      }

      const res = await api.post(
        '/generate-presentation/',
        payload,
        { responseType: 'blob' }
      );

      const blobType = format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

      const url = window.URL.createObjectURL(new Blob([res.data], { type: blobType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Presentation_${buyerCode}_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(`Failed to generate ${format.toUpperCase()} presentation.`);
    } finally {
      setDownloadingFormat(null);
    }
  };


  const toolCards = [
    {
      id: 'presentation',
      title: 'Generate PPT Presentation',
      description: 'Create slide deck catalogs for buyers with cover page, 1-item slides, specs & thank-you slide.',
      icon: <Presentation size={28} />,
      color: '#8b5cf6',
      active: true,
    },
    {
      id: 'pricetag',
      title: 'Generate Price Tag',
      description: 'Printable barcode & QR price tags for showroom furniture items.',
      icon: <Tag size={28} />,
      color: '#ec4899',
      active: false,
    },
    {
      id: 'qcreport',
      title: 'Generate QC Report',
      description: 'Audit & quality inspection summaries for batch shipments.',
      icon: <ClipboardCheck size={28} />,
      color: '#059669',
      active: false,
    },
    {
      id: 'costing',
      title: 'Manufacturing Costing Finder',
      description: 'Calculate raw material, hardware & labor breakdown for furniture items.',
      icon: <Calculator size={28} />,
      color: '#3b82f6',
      active: false,
    },
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* ── Header ── */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={26} color="#8b5cf6" /> Presentation & Tools Suite
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Generate buyer presentation slide decks, price tags, QC audit logs, and manufacturing costing
          </p>
        </div>
      </div>

      {/* ── 4 Tool Options Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {toolCards.map(tool => (
          <div
            key={tool.id}
            onClick={() => {
              if (tool.active) setActiveTool(tool.id);
            }}
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: activeTool === tool.id
                ? `0 0 0 2px ${tool.color}, 0 4px 12px ${tool.color}25`
                : '0 1px 3px rgba(0,0,0,0.08)',
              cursor: tool.active ? 'pointer' : 'not-allowed',
              opacity: tool.active ? 1 : 0.65,
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
          >
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '14px',
              backgroundColor: `${tool.color}15`,
              color: tool.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              {tool.icon}
            </div>
            
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#1e293b' }}>
              {tool.title}
            </h3>
            
            <p style={{ fontSize: '0.83rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              {tool.description}
            </p>

            {!tool.active && (
              <span style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '999px'
              }}>
                Coming Soon
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── Active Tool View: Generate Presentation ── */}
      {activeTool === 'presentation' && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>
                📽️ Generate Buyer Presentation Slide Deck
              </h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                Select a buyer and furniture samples to automatically assemble a presentation (.pptx / .pdf)
              </p>
            </div>

            {/* Download Button */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                onClick={() => handleGeneratePresentation('pptx')}
                disabled={downloadingFormat !== null || selectedSampleIds.length === 0}
                style={{
                  backgroundColor: '#8b5cf6',
                  borderColor: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.4rem',
                  fontSize: '0.95rem',
                  fontWeight: 600
                }}
              >
                <Download size={18} />
                {downloadingFormat === 'pptx' ? 'Generating PPT Presentation…' : 'Generate PPT Presentation (.pptx)'}
              </button>
            </div>
          </div>

          {/* ── Dynamic Presentation Controls & Options ── */}
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            {/* Step 1: Select Buyer & Source */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Step 1: Select Buyer (Branding & Catalog)
                </label>
                <select
                  className="filter-input"
                  value={selectedBuyerId}
                  onChange={e => {
                    setSelectedBuyerId(e.target.value);
                    setSelectedSampleIds([]);
                  }}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.95rem' }}
                >
                  <option value="">-- General Catalog / All Buyers --</option>
                  {buyers.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Catalog Source
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => { setItemSource('samples'); setSelectedSampleIds([]); }}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.75rem',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: itemSource === 'samples' ? '#fff' : 'transparent',
                      color: itemSource === 'samples' ? '#8b5cf6' : '#64748b',
                      boxShadow: itemSource === 'samples' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    📦 Samples Catalog
                  </button>
                  <button
                    type="button"
                    onClick={() => { setItemSource('buyer_masters'); setSelectedSampleIds([]); }}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.75rem',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      backgroundColor: itemSource === 'buyer_masters' ? '#fff' : 'transparent',
                      color: itemSource === 'buyer_masters' ? '#8b5cf6' : '#64748b',
                      boxShadow: itemSource === 'buyer_masters' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    🏷️ Buyer Master Styles
                  </button>
                </div>
              </div>
            </div>

            {/* Dynamic Layout & Content Customization Options */}
            <div style={{
              display: 'flex',
              gap: '1.25rem',
              alignItems: 'center',
              flexWrap: 'wrap',
              paddingTop: '0.75rem',
              borderTop: '1px stroke #cbd5e1',
              fontSize: '0.88rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 700, color: '#475569' }}>Items Per Slide:</span>
                <select
                  value={itemsPerSlide}
                  onChange={e => setItemsPerSlide(Number(e.target.value))}
                  style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                >
                  <option value={2}>2 Items / Slide (Side by Side)</option>
                  <option value={1}>1 Item / Slide (Full Detail)</option>
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={includePrice}
                  onChange={e => setIncludePrice(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#8b5cf6' }}
                />
                Include Price (USD)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={includeSpecs}
                  onChange={e => setIncludeSpecs(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#8b5cf6' }}
                />
                Include Specs (Material, Finish, Dimensions)
              </label>
            </div>
          </div>

          {/* ── Step 2: Select Items with Dynamic Filters ── */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Step 2: Select Items for Slide Deck ({itemSource === 'buyer_masters' ? 'Buyer Master' : 'Samples Catalog'})
                </label>
                <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: '#8b5cf6', fontWeight: 700 }}>
                  ({selectedSampleIds.length} item{selectedSampleIds.length !== 1 ? 's' : ''} selected)
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Dynamic Material Filter */}
                {dynamicMaterials.length > 0 && (
                  <select
                    value={selectedMaterial}
                    onChange={e => setSelectedMaterial(e.target.value)}
                    style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <option value="">All Materials ({dynamicMaterials.length})</option>
                    {dynamicMaterials.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}

                {/* Dynamic Finish Filter */}
                {dynamicFinishes.length > 0 && (
                  <select
                    value={selectedFinish}
                    onChange={e => setSelectedFinish(e.target.value)}
                    style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <option value="">All Finishes ({dynamicFinishes.length})</option>
                    {dynamicFinishes.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                )}

                {/* Search Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <Search size={15} color="#64748b" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.88rem', width: '150px' }}
                  />
                </div>

                <button
                  className="btn-secondary"
                  onClick={selectAllFilteredSamples}
                  style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                >
                  {filteredSamples.length > 0 && filteredSamples.every(s => selectedSampleIds.includes(s.id))
                    ? 'Deselect Page'
                    : 'Select Page Items'}
                </button>
              </div>
            </div>


            {/* Desktop Table View */}
            <div className="tools-desktop-table">
              <div className="table-container">
                <table className="data-table" style={{ fontSize: '0.88rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>Select</th>
                      <th>Sample ID / Style No</th>
                      <th>Product Name</th>
                      <th>Material / Wood</th>
                      <th>Finish Color</th>
                      <th>Dimensions (L×B×H cm)</th>
                      <th>Price (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={6} cols={7} hasImage={false} />
                    ) : filteredSamples.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                          No samples found.
                        </td>
                      </tr>
                    ) : filteredSamples.map(sample => {
                      const isSelected = selectedSampleIds.includes(sample.id);
                      return (
                        <tr
                          key={sample.id}
                          onClick={() => toggleSelectSample(sample.id)}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#f3e8ff' : 'transparent',
                            transition: 'background 0.15s'
                          }}
                          className="smooth-fade-in"
                        >
                          <td onClick={e => { e.stopPropagation(); toggleSelectSample(sample.id); }}>
                            {isSelected
                              ? <CheckSquare size={18} color="#8b5cf6" />
                              : <Square size={18} color="#94a3b8" />}
                          </td>
                          <td><strong>{sample.sample_id}</strong></td>
                          <td>{sample.product_name}</td>
                          <td>{sample.material || '—'}</td>
                          <td>{sample.finish_color || '—'}</td>
                          <td>
                            {sample.size_length || 0} × {sample.size_breadth || 0} × {sample.size_height || 0} cm
                          </td>
                          <td style={{ fontWeight: 700, color: '#8b5a2b' }}>
                            {sample.usd ? `$${parseFloat(sample.usd).toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="tools-mobile-cards">
              {loading ? (
                <CardSkeleton count={4} />
              ) : filteredSamples.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>No samples found.</div>
              ) : filteredSamples.map(sample => {
                const isSelected = selectedSampleIds.includes(sample.id);
                return (
                  <div
                    key={sample.id}
                    className={`tools-mobile-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSelectSample(sample.id)}
                    style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div onClick={e => { e.stopPropagation(); toggleSelectSample(sample.id); }}>
                          {isSelected
                            ? <CheckSquare size={22} color="#8b5cf6" />
                            : <Square size={22} color="#94a3b8" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem' }}>{sample.product_name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#8b5cf6', fontWeight: 700 }}>Style #: {sample.sample_id}</div>
                        </div>
                      </div>

                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#8b5a2b', backgroundColor: '#fef3c7', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>
                        {sample.usd ? `$${parseFloat(sample.usd).toFixed(2)}` : '—'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                      {sample.material && (
                        <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                          🪵 {sample.material}
                        </span>
                      )}
                      {sample.finish_color && (
                        <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                          🎨 {sample.finish_color}
                        </span>
                      )}
                      <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                        📐 {sample.size_length || 0}×{sample.size_breadth || 0}×{sample.size_height || 0} cm
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Tools;
