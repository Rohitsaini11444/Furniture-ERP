import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import {
  FileText, Presentation, Tag, ClipboardCheck, Calculator,
  Search, CheckSquare, Square, Download, Sparkles, Building2,
  Box, CheckCircle, AlertCircle, Plus, Trash2, UploadCloud, Layers, Image as ImageIcon, X
} from 'lucide-react';
import { TableSkeleton, CardSkeleton } from '../components/TableSkeleton';
import Pagination from '../components/Pagination';
import CustomSelect from '../components/CustomSelect';

function Tools() {
  const [activeTool, setActiveTool] = useState('presentation'); // 'presentation' | 'pricetag' | 'qcreport' | 'costing'

  // Presentation State
  const [presentationType, setPresentationType] = useState('buyer_sample'); // 'buyer_sample' | 'brand'
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

  // Brand PPT State
  const [brandBuyerName, setBrandBuyerName] = useState('');
  const [brandPoNumbers, setBrandPoNumbers] = useState('');
  const [brandTitle, setBrandTitle] = useState('BRAND PRESENTATION');
  const [brandSlides, setBrandSlides] = useState([
    { id: 'slide-1', title: 'Product 1 - Equipment & Tags Collage', files: [], previews: [], sample_id: '', buyer_master_id: '' }
  ]);

  const [loading, setLoading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState(null); // 'pptx' | 'brand_pptx' | 'pdf' | null

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

  // Generate Buyer Sample Presentation (PPTX / PDF)
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
        presentation_type: 'buyer_sample',
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

  // Brand PPT Helper Functions
  const addBrandSlide = () => {
    setBrandSlides(prev => [
      ...prev,
      {
        id: `slide-${Date.now()}`,
        title: `Product ${prev.length + 1} - Equipment & Tags Collage`,
        files: [],
        previews: [],
        sample_id: '',
        buyer_master_id: ''
      }
    ]);
  };

  const removeBrandSlide = (id) => {
    if (brandSlides.length === 1) {
      alert('You must keep at least one product slide for Brand PPT.');
      return;
    }
    setBrandSlides(prev => prev.filter(s => s.id !== id));
  };

  const updateBrandSlideTitle = (id, title) => {
    setBrandSlides(prev => prev.map(s => s.id === id ? { ...s, title } : s));
  };

  const handleBrandSlideImagesAdd = (id, fileList) => {
    const newFiles = Array.from(fileList);
    if (newFiles.length === 0) return;

    const newPreviews = [];
    let readCount = 0;

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result);
        readCount++;
        if (readCount === newFiles.length) {
          setBrandSlides(prev => prev.map(s => {
            if (s.id === id) {
              return {
                ...s,
                files: [...s.files, ...newFiles],
                previews: [...s.previews, ...newPreviews]
              };
            }
            return s;
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeBrandSlideImage = (slideId, imgIndex) => {
    setBrandSlides(prev => prev.map(s => {
      if (s.id === slideId) {
        const nextFiles = [...s.files];
        const nextPreviews = [...s.previews];
        nextFiles.splice(imgIndex, 1);
        nextPreviews.splice(imgIndex, 1);
        return { ...s, files: nextFiles, previews: nextPreviews };
      }
      return s;
    }));
  };

  const handleLinkErpItemToSlide = (slideId, type, itemId) => {
    setBrandSlides(prev => prev.map(s => {
      if (s.id === slideId) {
        let itemTitle = s.title;
        if (itemId) {
          const matchedItem = activeItemList.find(item => String(item.id) === String(itemId));
          if (matchedItem) {
            itemTitle = matchedItem.product_name || matchedItem.sample?.product_name || matchedItem.style_no || s.title;
          }
        }
        return {
          ...s,
          title: itemTitle,
          sample_id: type === 'sample' ? itemId : '',
          buyer_master_id: type === 'buyer_master' ? itemId : ''
        };
      }
      return s;
    }));
  };

  const handleGenerateBrandPresentation = async () => {
    const hasContent = brandSlides.some(s => s.files.length > 0 || s.sample_id || s.buyer_master_id);
    if (!hasContent) {
      alert('Please upload at least one image or select an ERP product for your brand slides.');
      return;
    }

    setDownloadingFormat('brand_pptx');
    try {
      const formData = new FormData();
      formData.append('presentation_type', 'brand');

      const selectedBuyer = buyers.find(b => b.id === selectedBuyerId);
      const buyerNameFinal = brandBuyerName || (selectedBuyer ? selectedBuyer.name : '');
      
      formData.append('buyer_id', selectedBuyerId || '');
      formData.append('buyer_name', buyerNameFinal);
      formData.append('buyer_po_numbers', brandPoNumbers);
      formData.append('title', brandTitle);

      const slidesMeta = brandSlides.map((slide, slideIdx) => {
        const imageKeys = slide.files.map((_, imgIdx) => `file_${slideIdx}_${imgIdx}`);
        slide.files.forEach((file, imgIdx) => {
          formData.append(`file_${slideIdx}_${imgIdx}`, file);
        });

        return {
          title: slide.title,
          sample_id: slide.sample_id || null,
          buyer_master_id: slide.buyer_master_id || null,
          image_keys: imageKeys
        };
      });

      formData.append('slides_meta', JSON.stringify(slidesMeta));

      const res = await api.post(
        '/generate-presentation/',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
      const link = document.createElement('a');
      link.href = url;
      const safeName = buyerNameFinal ? buyerNameFinal.replace(/[^a-zA-Z0-9]/g, '_') : 'Brand';
      link.setAttribute('download', `Brand_PPT_${safeName}_${Date.now()}.pptx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate Brand PPT presentation.');
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
    <div style={{ width: '100%', paddingBottom: '3rem' }}>
      {/* ── Header ── */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={26} color="#8b5cf6" /> Presentation & Tools Suite
          </h2>
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
          {/* Header & Presentation Type Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>
                📽️ Presentation Deck Generator
              </h3>
            </div>

            {/* Selection Switch between Buyer Sample PPT & Brand PPT */}
            <div className="tools-type-switcher">
              <button
                type="button"
                onClick={() => setPresentationType('buyer_sample')}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  backgroundColor: presentationType === 'buyer_sample' ? '#fff' : 'transparent',
                  color: presentationType === 'buyer_sample' ? '#8b5cf6' : '#64748b',
                  boxShadow: presentationType === 'buyer_sample' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <FileText size={16} />
                Buyer Sample PPT
              </button>

              <button
                type="button"
                onClick={() => setPresentationType('brand')}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  backgroundColor: presentationType === 'brand' ? '#fff' : 'transparent',
                  color: presentationType === 'brand' ? '#8b5cf6' : '#64748b',
                  boxShadow: presentationType === 'brand' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Layers size={16} />
                Brand PPT (Collage & Labels)
              </button>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* MODE 1: BRAND PPT BUILDER UI */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {presentationType === 'brand' ? (
            <div>
              {/* Brand PPT Cover Info Form */}
              <div className="tools-brand-cover-grid">
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    1. Select / Enter Buyer Name
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                    <CustomSelect
                      value={selectedBuyerId}
                      onChange={e => {
                        const val = e.target ? e.target.value : e;
                        setSelectedBuyerId(val);
                        const b = buyers.find(buyer => String(buyer.id) === String(val));
                        if (b) setBrandBuyerName(b.name);
                      }}
                      options={[
                        { value: '', label: '-- Choose Existing Buyer (Optional) --' },
                        ...buyers.map(b => ({ value: b.id, label: b.code ? `${b.name} (${b.code})` : b.name }))
                      ]}
                      placeholder="-- Choose Existing Buyer (Optional) --"
                    />
                    <input
                      type="text"
                      placeholder="Or type custom Buyer Name (e.g. Brooks Brothers)"
                      value={brandBuyerName}
                      onChange={e => setBrandBuyerName(e.target.value)}
                      style={{ padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    2. Buyer PO Number(s) (Add Manually)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PO # 984512, 984513, 984514"
                    value={brandPoNumbers}
                    onChange={e => setBrandPoNumbers(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem', fontWeight: 600, boxSizing: 'border-box' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem', display: 'block' }}>
                    Printed clearly on Slide 1 Cover & Top Banners of product slides.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    3. Presentation Title
                  </label>
                  <input
                    type="text"
                    placeholder="BRAND PRESENTATION"
                    value={brandTitle}
                    onChange={e => setBrandTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.92rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Product Slides Header */}
              <div className="tools-brand-slides-header">
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                    📷 Product Collage Slides ({brandSlides.length} Slide{brandSlides.length !== 1 ? 's' : ''})
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Each slide builds an auto-collage grid of all equipment, tag, label & sticker photos for that product.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addBrandSlide}
                  style={{
                    backgroundColor: '#8b5cf6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.55rem 1.1rem',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Plus size={16} /> Add Product Slide
                </button>
              </div>

              {/* Product Slide Cards list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                {brandSlides.map((slide, idx) => (
                  <div key={slide.id} className="tools-slide-card">
                    {/* Slide Title Row */}
                    <div className="tools-slide-card-header">
                      <div className="tools-slide-title-group">
                        <span style={{
                          backgroundColor: '#8b5cf6',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          flexShrink: 0
                        }}>
                          Slide {idx + 1}
                        </span>

                        <input
                          type="text"
                          value={slide.title}
                          onChange={e => updateBrandSlideTitle(slide.id, e.target.value)}
                          placeholder="Product Name / Style Code (e.g. Bar Stool BB-102)"
                          style={{
                            flex: 1,
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #94a3b8',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: '#1e293b',
                            width: '100%',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {/* Optional ERP Item Link Dropdown & Delete Action */}
                      <div className="tools-slide-actions-group">
                        <CustomSelect
                          className="tools-slide-erp-select"
                          value={slide.sample_id || slide.buyer_master_id || ''}
                          onChange={e => {
                            const val = e.target ? e.target.value : e;
                            handleLinkErpItemToSlide(slide.id, itemSource === 'buyer_masters' ? 'buyer_master' : 'sample', val);
                          }}
                          options={[
                            { value: '', label: '-- Auto-pull images from ERP sample (Optional) --' },
                            ...activeItemList.map(item => ({
                              value: item.id,
                              label: item.product_name || item.sample_id || item.style_no
                            }))
                          ]}
                          placeholder="-- Auto-pull images from ERP sample (Optional) --"
                          style={{ minWidth: '220px' }}
                        />

                        <button
                          type="button"
                          onClick={() => removeBrandSlide(slide.id)}
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#ef4444',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.45rem 0.65rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            flexShrink: 0
                          }}
                        >
                          <Trash2 size={15} /> Delete Slide
                        </button>
                      </div>
                    </div>

                    {/* Multi-Image Upload Area */}
                    <div style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      backgroundColor: '#f8fafc',
                      textAlign: 'center',
                      position: 'relative'
                    }}>
                      <UploadCloud size={28} color="#8b5cf6" style={{ marginBottom: '0.4rem' }} />
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                        Upload Product Photos, Tags, Labels & QC Stickers
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                        Multi-select image files from your computer or phone (JPG, PNG, WebP)
                      </div>

                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={e => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleBrandSlideImagesAdd(slide.id, e.target.files);
                            e.target.value = '';
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                      />
                    </div>

                    {/* Image Previews Grid */}
                    {slide.previews && slide.previews.length > 0 ? (
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>
                          Uploaded Photos for Slide {idx + 1} ({slide.previews.length} photos ready for collage grid):
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                          gap: '0.75rem'
                        }}>
                          {slide.previews.map((src, imgIdx) => (
                            <div
                              key={imgIdx}
                              style={{
                                position: 'relative',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                height: '90px',
                                border: '1px solid #e2e8f0',
                                backgroundColor: '#fff',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                              }}
                            >
                              <img
                                src={src}
                                alt={`Tag ${imgIdx + 1}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <button
                                type="button"
                                onClick={() => removeBrandSlideImage(slide.id, imgIdx)}
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '20px',
                                  height: '20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      slide.sample_id || slide.buyer_master_id ? (
                        <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                          ✓ Linked to ERP Product images. Additional uploaded images will be combined into the collage grid.
                        </div>
                      ) : null
                    )}
                  </div>
                ))}
              </div>

              {/* Generate Brand PPT Button */}
              <div className="tools-brand-generate-btn-wrap">
                <button
                  className="btn-primary"
                  onClick={handleGenerateBrandPresentation}
                  disabled={downloadingFormat !== null}
                  style={{
                    backgroundColor: '#8b5cf6',
                    borderColor: '#8b5cf6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.8rem',
                    fontSize: '1rem',
                    fontWeight: 700
                  }}
                >
                  <Download size={20} />
                  {downloadingFormat === 'brand_pptx' ? 'Generating Brand PPT Deck…' : 'Generate Brand PPT Presentation (.pptx)'}
                </button>
              </div>
            </div>
          ) : (

            /* ════════════════════════════════════════════════════════════════ */
            /* MODE 2: BUYER SAMPLE PPT (EXISTING) */
            /* ════════════════════════════════════════════════════════════════ */
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
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
                <div className="tools-step1-layout">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Step 1: Select Buyer
                    </label>
                    <CustomSelect
                      value={selectedBuyerId}
                      onChange={e => {
                        const val = e.target ? e.target.value : e;
                        setSelectedBuyerId(val);
                        setSelectedSampleIds([]);
                      }}
                      options={[
                        { value: '', label: '-- General Catalog / All Buyers --' },
                        ...buyers.map(b => ({ value: b.id, label: b.code ? `${b.name} (${b.code})` : b.name }))
                      ]}
                      placeholder="-- General Catalog / All Buyers --"
                    />
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
                <div className="tools-custom-options">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: '#475569' }}>Items Per Slide:</span>
                    <CustomSelect
                      value={itemsPerSlide}
                      onChange={e => {
                        const val = e.target ? e.target.value : e;
                        setItemsPerSlide(Number(val));
                      }}
                      options={[
                        { value: 2, label: '2 Items / Slide' },
                        { value: 1, label: '1 Item / Slide' }
                      ]}
                      style={{ width: '160px' }}
                    />
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
                    Include Specs
                  </label>
                </div>
              </div>

              {/* ── Step 2: Select Items with Dynamic Filters ── */}
              <div>
                <div className="tools-step2-header">
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Step 2: Select Items for Slide Deck ({itemSource === 'buyer_masters' ? 'Buyer Master' : 'Samples Catalog'})
                    </label>
                    <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: '#8b5cf6', fontWeight: 700 }}>
                      ({selectedSampleIds.length} item{selectedSampleIds.length !== 1 ? 's' : ''} selected)
                    </span>
                  </div>

                  <div className="tools-filters-bar">
                    {/* Dynamic Material Filter */}
                    {dynamicMaterials.length > 0 && (
                      <CustomSelect
                        value={selectedMaterial}
                        onChange={e => {
                          const val = e.target ? e.target.value : e;
                          setSelectedMaterial(val);
                        }}
                        options={[
                          { value: '', label: `All Materials (${dynamicMaterials.length})` },
                          ...dynamicMaterials.map(m => ({ value: m, label: m }))
                        ]}
                        style={{ minWidth: '150px' }}
                      />
                    )}

                    {/* Dynamic Finish Filter */}
                    {dynamicFinishes.length > 0 && (
                      <CustomSelect
                        value={selectedFinish}
                        onChange={e => {
                          const val = e.target ? e.target.value : e;
                          setSelectedFinish(val);
                        }}
                        options={[
                          { value: '', label: `All Finishes (${dynamicFinishes.length})` },
                          ...dynamicFinishes.map(f => ({ value: f, label: f }))
                        ]}
                        style={{ minWidth: '150px' }}
                      />
                    )}

                    {/* Search Bar */}
                    <div className="tools-search-wrapper">
                      <Search size={15} color="#64748b" />
                      <input
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.88rem', width: '100%' }}
                      />
                    </div>

                    <button
                      className="btn-secondary tools-select-all-btn"
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
                          <th>Style No</th>
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
                              <td><strong>{sample.style_no || sample.sample_id}</strong></td>
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
                        style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                            <div style={{ paddingTop: '0.15rem' }} onClick={e => { e.stopPropagation(); toggleSelectSample(sample.id); }}>
                              {isSelected
                                ? <CheckSquare size={18} color="#8b5cf6" />
                                : <Square size={18} color="#94a3b8" />}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.88rem', lineHeight: '1.2' }}>{sample.product_name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 700, marginTop: '2px' }}>Style #: {sample.style_no || sample.sample_id}</div>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#8b5a2b', backgroundColor: '#fef3c7', padding: '0.15rem 0.4rem', borderRadius: '6px', flexShrink: 0 }}>
                            {sample.usd ? `$${parseFloat(sample.usd).toFixed(2)}` : '—'}
                          </div>
                        </div>

                        {/* Compact clean bullet indicators */}
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.74rem', color: '#64748b', fontWeight: 500, paddingLeft: '24px' }}>
                          {sample.material && <span>{sample.material}</span>}
                          {sample.material && <span>•</span>}
                          {sample.finish_color && <span>{sample.finish_color}</span>}
                          {sample.finish_color && <span>•</span>}
                          <span>{sample.size_length || 0}×{sample.size_breadth || 0}×{sample.size_height || 0} cm</span>
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
      )}
    </div>
  );
}

export default Tools;
