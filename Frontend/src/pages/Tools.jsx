import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import {
  FileText, Presentation, Tag, ClipboardCheck, Calculator,
  Search, CheckSquare, Square, Download, Sparkles, Building2,
  Box, CheckCircle, AlertCircle, Plus, Trash2, UploadCloud, Layers, Image as ImageIcon, X, Pencil, FolderTree
} from 'lucide-react';

import { TableSkeleton, CardSkeleton } from '../components/TableSkeleton';
import Pagination from '../components/Pagination';
import CustomSelect from '../components/CustomSelect';

function Tools() {
  const [activeTool, setActiveTool] = useState(null); // null | 'presentation' | 'pricetag' | 'qcreport' | 'costing'

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

  // Vendor Internal Inspection PPT State
  const DEFAULT_INSPECTION_SECTIONS = [
    'Comparative Image Green Seal V/S Bulk',
    'Bulk Constriction Review Images',
    'Bulk with Green Seal Image',
    'Product Moisture Reading Images – Min 20 Check / Style Wise (MDF & Product)',
    'Inspection Finding (Defects Images)',
    'Packing Images – Step by Step',
    'Carton Moisture – 20 Pcs Style Wise',
    'MDF Spot Scan / SS Scan Image',
    'Carton Marking & Labeling Image'
  ];

  const [vendorCoverInfo, setVendorCoverInfo] = useState({
    dqa_name: 'Mahendra Singh',
    vendor_name: 'Pinkcity Enterprises',
    date: new Date().toISOString().split('T')[0],
    po_number: '626890',
    qty: '300 / 300',
    ship_window: '31 March 2026 To 10 April 2026',
    banner: 'Home Goods',
    test_report: '(6726)041-0355 & Date - 16 Feb. 2026',
    qem_date: '31-03-2026',
    inspection_result: 'PASS',
    summary_notes: 'All product specifications, moisture readings, and master carton labelings have been inspected and verified according to DQA Level 1 / Level 2 standards.'
  });

  const [vendorProducts, setVendorProducts] = useState([
    {
      id: 'prod-1',
      product_name: 'Product 1 / Style 1',
      collapsed: false,
      sections: DEFAULT_INSPECTION_SECTIONS.map((sec, idx) => ({
        id: `p1-s${idx + 1}`,
        title: sec,
        files: [],
        previews: []
      }))
    },
    {
      id: 'prod-2',
      product_name: 'Product 2 / Style 2',
      collapsed: false,
      sections: DEFAULT_INSPECTION_SECTIONS.map((sec, idx) => ({
        id: `p2-s${idx + 1}`,
        title: sec,
        files: [],
        previews: []
      }))
    }
  ]);

  const [previewModalImg, setPreviewModalImg] = useState(null);

  const getSlideNumber = (prodIdx, secIdx) => {
    let offset = 2; // Slide 1: Cover, Slide 2: Taping
    for (let i = 0; i < prodIdx; i++) {
      offset += vendorProducts[i].sections.length;
    }
    return offset + secIdx + 1;
  };

  const getTotalSlidesCount = () => {
    let total = 2; // Slide 1 + Slide 2
    vendorProducts.forEach(p => {
      total += p.sections.length;
    });
    total += 1; // Slide 21 (DQA Report document)
    return total;
  };

  const toggleProductCollapse = (prodId) => {
    setVendorProducts(prev => prev.map(p => p.id === prodId ? { ...p, collapsed: !p.collapsed } : p));
  };


  const [dqaReportImageFile, setDqaReportImageFile] = useState(null);
  const [dqaReportImagePreview, setDqaReportImagePreview] = useState(null);

  const handleDqaReportImageChange = (fileList) => {
    const file = fileList[0];
    if (!file) return;
    setDqaReportImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setDqaReportImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeDqaReportImage = () => {
    setDqaReportImageFile(null);
    setDqaReportImagePreview(null);
  };

  const [loading, setLoading] = useState(false);

  const [downloadingFormat, setDownloadingFormat] = useState(null); // 'pptx' | 'brand_pptx' | 'vendor_pptx' | 'pdf' | null


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

  // ── Vendor Inspection Report Handlers ──
  const addVendorProduct = () => {
    const nextIdx = vendorProducts.length + 1;
    setVendorProducts(prev => [
      ...prev,
      {
        id: `prod-${Date.now()}`,
        product_name: `Product ${nextIdx}`,
        sections: DEFAULT_INSPECTION_SECTIONS.map((sec, idx) => ({
          id: `p${nextIdx}-s${idx + 1}-${Date.now()}`,
          title: sec,
          files: [],
          previews: []
        }))
      }
    ]);
  };

  const removeVendorProduct = (prodId) => {
    if (vendorProducts.length === 1) {
      alert('You must keep at least one product for Vendor Inspection PPT.');
      return;
    }
    setVendorProducts(prev => prev.filter(p => p.id !== prodId));
  };

  const updateVendorProductName = (prodId, name) => {
    setVendorProducts(prev => prev.map(p => p.id === prodId ? { ...p, product_name: name } : p));
  };

  const updateVendorSectionTitle = (prodId, secId, title) => {
    setVendorProducts(prev => prev.map(p => {
      if (p.id === prodId) {
        return {
          ...p,
          sections: p.sections.map(s => s.id === secId ? { ...s, title } : s)
        };
      }
      return p;
    }));
  };

  const addVendorSectionImages = (prodId, secId, fileList) => {
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
          setVendorProducts(prev => prev.map(p => {
            if (p.id === prodId) {
              return {
                ...p,
                sections: p.sections.map(s => {
                  if (s.id === secId) {
                    return {
                      ...s,
                      files: [...s.files, ...newFiles],
                      previews: [...s.previews, ...newPreviews]
                    };
                  }
                  return s;
                })
              };
            }
            return p;
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeVendorSectionImage = (prodId, secId, imgIdx) => {
    setVendorProducts(prev => prev.map(p => {
      if (p.id === prodId) {
        return {
          ...p,
          sections: p.sections.map(s => {
            if (s.id === secId) {
              const nextFiles = [...s.files];
              const nextPreviews = [...s.previews];
              nextFiles.splice(imgIdx, 1);
              nextPreviews.splice(imgIdx, 1);
              return { ...s, files: nextFiles, previews: nextPreviews };
            }
            return s;
          })
        };
      }
      return p;
    }));
  };

  const addCustomVendorSection = (prodId) => {
    setVendorProducts(prev => prev.map(p => {
      if (p.id === prodId) {
        const nextSecNum = p.sections.length + 1;
        return {
          ...p,
          sections: [
            ...p.sections,
            {
              id: `custom-sec-${Date.now()}`,
              title: `Additional Inspection Section #${nextSecNum}`,
              files: [],
              previews: []
            }
          ]
        };
      }
      return p;
    }));
  };

  const removeVendorSection = (prodId, secId) => {
    setVendorProducts(prev => prev.map(p => {
      if (p.id === prodId) {
        return {
          ...p,
          sections: p.sections.filter(s => s.id !== secId)
        };
      }
      return p;
    }));
  };

  const handleGenerateVendorInspectionPresentation = async () => {
    setDownloadingFormat('vendor_pptx');
    try {
      const formData = new FormData();
      formData.append('presentation_type', 'vendor_inspection');
      formData.append('cover_info', JSON.stringify(vendorCoverInfo));

      const slidesMeta = [];
      vendorProducts.forEach((prod, prodIdx) => {
        prod.sections.forEach((sec, secIdx) => {
          const imageKeys = sec.files.map((_, imgIdx) => `file_${prodIdx}_${secIdx}_${imgIdx}`);
          sec.files.forEach((file, imgIdx) => {
            formData.append(`file_${prodIdx}_${secIdx}_${imgIdx}`, file);
          });

          const prefix = vendorProducts.length > 1 ? `${prod.product_name}: ` : '';
          slidesMeta.push({
            title: `${prefix}${sec.title}`,
            image_keys: imageKeys
          });
        });
      });

      formData.append('slides_meta', JSON.stringify(slidesMeta));

      if (dqaReportImageFile) {
        formData.append('dqa_report_image', dqaReportImageFile);
      }

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
      const safePo = (vendorCoverInfo.po_number || 'Report').replace(/[^a-zA-Z0-9]/g, '_');
      link.setAttribute('download', `Vendor_Internal_Inspection_Report_${safePo}_${Date.now()}.pptx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate Vendor Inspection Report presentation.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDownloadDbPdf = async (e) => {
    if (e) e.stopPropagation();
    setDownloadingFormat('db_pdf');
    try {
      const res = await api.get('/tools/database-relationships-pdf/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Database_Relationships.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download Database Relationships PDF:', err);
      alert('Failed to download Database Relationships PDF. Please try again.');
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
      id: 'db_pdf',
      title: 'Database Relationships PDF',
      description: 'Export live ERP database schema diagram showing tables, PKs, FKs & relationships.',
      icon: <FolderTree size={28} />,
      color: '#8b5a2b',
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

      {/* ── Tool Options Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {toolCards.map(tool => {
          const isSelected = activeTool === tool.id;
          return (
            <div
              key={tool.id}
              onClick={(e) => {
                if (tool.action) {
                  tool.action(e);
                  return;
                }
                if (tool.active) {
                  setActiveTool(tool.id);
                  if (tool.id === 'presentation') {
                    setTimeout(() => {
                      const el = document.getElementById('ppt-type-section');
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 60);
                  }
                }
              }}
              style={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: isSelected
                  ? `0 0 0 2px ${tool.color}, 0 6px 18px ${tool.color}30`
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

              {tool.active ? (
                isSelected ? (
                  <span style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '999px'
                  }}>
                    ✓ Active
                  </span>
                ) : (
                  <span style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '999px'
                  }}>
                    Click to Start →
                  </span>
                )
              ) : (
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

              {isSelected && (
                <div style={{
                  position: 'absolute',
                  bottom: '-9px',
                  left: '50%',
                  transform: 'translateX(-50%) rotate(45deg)',
                  width: '16px',
                  height: '16px',
                  backgroundColor: '#ffffff',
                  borderRight: `2px solid ${tool.color}`,
                  borderBottom: `2px solid ${tool.color}`,
                  zIndex: 2
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Empty Unselected State ── */}
      {activeTool === null && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '3.5rem 2rem',
          textAlign: 'center',
          border: '2px dashed #cbd5e1',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: '#f3e8ff',
            color: '#8b5cf6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <Sparkles size={32} />
          </div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.35rem', fontWeight: 800, color: '#1e293b' }}>
            Choose a Tool Above to Get Started
          </h3>
          <p style={{ margin: 0, fontSize: '0.92rem', color: '#64748b', maxWidth: '520px', marginInline: 'auto' }}>
            Click <strong>Generate PPT Presentation</strong> above to configure and generate Buyer Catalogs, Brand Presentations, or Vendor Inspection Reports.
          </p>
        </div>
      )}

      {/* ── Active Tool View: Database Relationships PDF ── */}
      {activeTool === 'db_pdf' && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '2rem',
          border: '1.5px solid #e7e5e4',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          animation: 'smoothFadeIn 0.3s ease'
        }}>
          {/* Tool Title Banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#fdf8f5', border: '1.5px solid #e9d5b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FolderTree size={28} color="#8b5a2b" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem', color: '#1e293b' }}>
                    Database Relationships PDF Generator
                  </h3>
                </div>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                  Export a high-resolution landscape A3 PDF diagram displaying all ERP database tables.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadDbPdf}
              className="btn-primary"
              disabled={downloadingFormat === 'db_pdf'}
              style={{
                backgroundColor: '#8b5a2b',
                borderColor: '#8b5a2b',
                padding: '0.75rem 1.5rem',
                fontSize: '0.92rem',
                fontWeight: 700,
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(139, 90, 43, 0.25)',
                cursor: downloadingFormat === 'db_pdf' ? 'wait' : 'pointer'
              }}
            >
              {downloadingFormat === 'db_pdf' ? (
                <>
                  <span style={{ width: '16px', height: '16px', border: '2px solid #fff', borderRightColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.75s linear infinite' }} />
                  Generating & Downloading PDF...
                </>
              ) : (
                <>
                  <Download size={18} /> Download Database_Relationships.pdf
                </>
              )}
            </button>
          </div>

          {/* Feature Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            <div style={{ backgroundColor: '#fdf8f5', border: '1px solid #f5ece1', borderRadius: '14px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#8b5a2b15', color: '#8b5a2b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#8b5a2b' }}>39 Tables</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Active Django ORM Models</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '14px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#16a34a15', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#166534' }}>Landscape A3</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>High-Res Vector Layout</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '14px', padding: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#2563eb15', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1e40af' }}>1:1, 1:N & N:N</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Foreign Key Relations</div>
              </div>
            </div>
          </div>

          {/* Information Details & Developer Reference */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={16} color="#8b5a2b" /> Dynamic Inspection Specifications
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#475569', fontSize: '0.84rem', lineHeight: 1.6 }}>
              <li><strong>Live Auto Inspection:</strong> Any future models or foreign keys added to the ERP codebase automatically appear in the PDF export.</li>
              <li><strong>Clean Compact Box Layout:</strong> Each table node shows ONLY the Table Name, Primary Keys (🔑), and Foreign Keys (🔗). Normal columns, data types, and SQL syntax are omitted.</li>
              <li><strong>90° Orthogonal Connector Routing:</strong> Connectors route cleanly around tables with directional arrowheads and cardinality badges.</li>
              <li><strong>Direct Backend URL:</strong> <code>GET /api/tools/database-relationships-pdf/</code></li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Active Tool View: Generate Presentation ── */}
      {activeTool === 'presentation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* ── CHOOSE A PPT TYPE SECTION (Matches Mockup) ── */}
          <div id="ppt-type-section" style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0',
            scrollMarginTop: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1.75rem' }}>

              <div style={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                backgroundColor: '#f3e8ff',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Presentation size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>
                  Choose a PPT Type to Get Started
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                  Select the type of presentation you want to generate
                </p>
              </div>
            </div>

            {/* 3 Presentation Option Cards Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.5rem'
            }}>

              {/* Option 1: Buyer Sample PPT */}
              <div
                onClick={() => setPresentationType('buyer_sample')}
                style={{
                  backgroundColor: presentationType === 'buyer_sample' ? '#fcfaff' : '#ffffff',
                  border: presentationType === 'buyer_sample' ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  boxShadow: presentationType === 'buyer_sample' ? '0 8px 24px rgba(139, 92, 246, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease'
                }}
              >
                {presentationType === 'buyer_sample' && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#8b5cf6',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 800
                  }}>
                    ✓
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.1rem' }}>
                  <div style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    backgroundColor: '#f3e8ff',
                    color: '#8b5cf6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FileText size={26} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.4rem', fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                      Buyer Sample PPT
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
                      Create sample presentations for buyers with style-wise details.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    backgroundColor: presentationType === 'buyer_sample' ? '#f3e8ff' : '#f8fafc',
                    color: presentationType === 'buyer_sample' ? '#8b5cf6' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Select This Option →
                </button>
              </div>

              {/* Option 2: Brand PPT (Collage & Labels) */}
              <div
                onClick={() => setPresentationType('brand')}
                style={{
                  backgroundColor: presentationType === 'brand' ? '#f8fafc' : '#ffffff',
                  border: presentationType === 'brand' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  boxShadow: presentationType === 'brand' ? '0 8px 24px rgba(59, 130, 246, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease'
                }}
              >
                {presentationType === 'brand' && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 800
                  }}>
                    ✓
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.1rem' }}>
                  <div style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    backgroundColor: '#eff6ff',
                    color: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Layers size={26} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.4rem', fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                      Brand PPT (Collage & Labels)
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
                      Generate brand presentations with collage layouts and labels.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    backgroundColor: presentationType === 'brand' ? '#eff6ff' : '#f8fafc',
                    color: presentationType === 'brand' ? '#2563eb' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Select This Option →
                </button>
              </div>

              {/* Option 3: Vendor Internal Inspection Report */}
              <div
                onClick={() => setPresentationType('vendor_inspection')}
                style={{
                  backgroundColor: presentationType === 'vendor_inspection' ? '#f0fdf4' : '#ffffff',
                  border: presentationType === 'vendor_inspection' ? '2px solid #10b981' : '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  boxShadow: presentationType === 'vendor_inspection' ? '0 8px 24px rgba(16, 185, 129, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease'
                }}
              >
                {presentationType === 'vendor_inspection' && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 800
                  }}>
                    ✓
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.1rem' }}>
                  <div style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    backgroundColor: '#f0fdf4',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <ClipboardCheck size={26} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.4rem', fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
                      Vendor Internal Inspection Report
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', lineHeight: 1.5 }}>
                      Generate inspection reports with QC details and observations.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    backgroundColor: presentationType === 'vendor_inspection' ? '#f0fdf4' : '#f8fafc',
                    color: presentationType === 'vendor_inspection' ? '#059669' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Select This Option →
                </button>
              </div>

            </div>

            {/* Bottom Purple Info Bar */}
            <div style={{
              backgroundColor: '#faf5ff',
              border: '1px solid #f3e8ff',
              borderRadius: '12px',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              fontSize: '0.88rem',
              fontWeight: 600,
              color: '#7c3aed'
            }}>
              <AlertCircle size={18} color="#8b5cf6" />
              <span>Select a PPT type above to configure settings and generate your presentation.</span>
            </div>
          </div>

          {/* Configuration Form Container */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0'
          }}>


          {/* ════════════════════════════════════════════════════════════════ */}
          {/* MODE 1: VENDOR INTERNAL INSPECTION REPORT UI */}
          {/* ════════════════════════════════════════════════════════════════ */}
          {presentationType === 'vendor_inspection' ? (
            <div>
              {/* Header Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    📋 Pinkcity Internal Inspection Report Deck Builder
                    <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.78rem', fontWeight: 800, padding: '0.2rem 0.7rem', borderRadius: '999px', border: '1px solid #fca5a5' }}>
                      {getTotalSlidesCount()} SLIDES TOTAL
                    </span>
                  </h4>
                </div>

                <button
                  className="btn-primary vendor-header-btn"
                  onClick={handleGenerateVendorInspectionPresentation}
                  disabled={downloadingFormat !== null}
                  style={{
                    backgroundColor: '#dc2626',
                    borderColor: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.7rem',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.25)'
                  }}
                >
                  <Download size={18} />
                  {downloadingFormat === 'vendor_pptx' ? 'Generating Inspection Report Deck…' : 'Generate Vendor Inspection Deck (.pptx)'}
                </button>
              </div>

              {/* Cover Metadata Form */}
              <div id="vendor-cover" className="vendor-cover-card">
                <div className="vendor-cover-header-wrap">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="vendor-slide-badge">SLIDE 1</span>
                    <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      INSPECTION COVER DETAILS
                    </h5>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Includes Level-1 & Level-2 AQL Tables</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                  <div className="vendor-input-group">
                    <label className="vendor-input-label">DQA Inspector Name</label>
                    <input
                      type="text"
                      className="vendor-form-input"
                      value={vendorCoverInfo.dqa_name}
                      onChange={e => setVendorCoverInfo(prev => ({ ...prev, dqa_name: e.target.value }))}
                      placeholder="e.g. Mahendra Singh"
                    />
                  </div>

                  <div className="vendor-input-group">
                    <label className="vendor-input-label">Vendor Name</label>
                    <input
                      type="text"
                      className="vendor-form-input"
                      value={vendorCoverInfo.vendor_name}
                      onChange={e => setVendorCoverInfo(prev => ({ ...prev, vendor_name: e.target.value }))}
                      placeholder="Pinkcity Enterprises"
                    />
                  </div>

                  <div className="vendor-input-group">
                    <label className="vendor-input-label">Inspection Date</label>
                    <input
                      type="date"
                      className="vendor-form-input"
                      value={vendorCoverInfo.date}
                      onChange={e => setVendorCoverInfo(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>

                  <div className="vendor-input-group">
                    <label className="vendor-input-label">PO Number</label>
                    <input
                      type="text"
                      className="vendor-form-input"
                      value={vendorCoverInfo.po_number}
                      onChange={e => setVendorCoverInfo(prev => ({ ...prev, po_number: e.target.value }))}
                      placeholder="e.g. 626890"
                    />
                  </div>

                  <div className="vendor-input-group">
                    <label className="vendor-input-label">Quantity (Inspected / Total)</label>
                    <input
                      type="text"
                      className="vendor-form-input"
                      value={vendorCoverInfo.qty}
                      onChange={e => setVendorCoverInfo(prev => ({ ...prev, qty: e.target.value }))}
                      placeholder="e.g. 300 / 300"
                    />
                  </div>

                  <div className="vendor-input-group">
                    <label className="vendor-input-label">Ship Window</label>
                    <input
                      type="text"
                      className="vendor-form-input"
                      value={vendorCoverInfo.ship_window}
                      onChange={e => setVendorCoverInfo(prev => ({ ...prev, ship_window: e.target.value }))}
                      placeholder="e.g. 31 March 2026 To 10 April 2026"
                    />
                  </div>

                  <div className="vendor-input-group">
                    <label className="vendor-input-label">Banner (Carton Taping Guidelines for Slide 2)</label>
                    <CustomSelect
                      value={vendorCoverInfo.banner}
                      onChange={e => {
                        const val = e.target ? e.target.value : e;
                        setVendorCoverInfo(prev => ({ ...prev, banner: val }));
                      }}
                      options={[
                        { value: 'Home Goods', label: 'Home Goods (White Tape)' },
                        { value: 'Marshalls', label: 'Marshalls (Black Tape)' },
                        { value: 'TJ Maxx', label: 'TJ Maxx (Blue Tape)' },
                        { value: 'Sierra', label: 'Sierra' },
                        { value: 'Homesense', label: 'Homesense' }
                      ]}
                    />
                  </div>

                  <div className="vendor-input-group">
                    <label className="vendor-input-label">Test Report No & Date</label>
                    <input
                      type="text"
                      className="vendor-form-input"
                      value={vendorCoverInfo.test_report}
                      onChange={e => setVendorCoverInfo(prev => ({ ...prev, test_report: e.target.value }))}
                      placeholder="e.g. (6726)041-0355 & Date - 16 Feb. 2026"
                    />
                  </div>

                  <div className="vendor-input-group">
                    <label className="vendor-input-label">QEM Date</label>
                    <input
                      type="text"
                      className="vendor-form-input"
                      value={vendorCoverInfo.qem_date}
                      onChange={e => setVendorCoverInfo(prev => ({ ...prev, qem_date: e.target.value }))}
                      placeholder="e.g. 31-03-2026"
                    />
                  </div>
                </div>
              </div>

              {/* Product & Section Inspection Slides Uploader */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    PRODUCT INSPECTION DECK SECTIONS ({vendorProducts.length} Product{vendorProducts.length > 1 ? 's' : ''} Pre-loaded)
                  </h5>

                  <button
                    className="btn-secondary vendor-header-btn"
                    onClick={addVendorProduct}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', border: '1px solid #cbd5e1' }}
                  >
                    <Plus size={16} /> Add Another Product / Style
                  </button>
                </div>

                {vendorProducts.map((prod, prodIdx) => {
                  const startSlide = getSlideNumber(prodIdx, 0);
                  const endSlide = getSlideNumber(prodIdx, prod.sections.length - 1);
                  return (
                    <div id={`vendor-prod-${prod.id}`} key={prod.id} className="vendor-prod-card">
                      <div className="vendor-prod-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, width: '100%', minWidth: 0 }}>
                          <span style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '0.8rem', fontWeight: 800, padding: '0.25rem 0.7rem', borderRadius: '6px', flexShrink: 0 }}>
                            PRODUCT {prodIdx + 1}
                          </span>
                          
                          <div className="vendor-editable-title" style={{ maxWidth: '320px', width: '100%', minWidth: 0 }}>
                            <Pencil size={15} color="#dc2626" style={{ flexShrink: 0 }} />
                            <input
                              type="text"
                              className="vendor-title-input"
                              value={prod.product_name}
                              onChange={e => updateVendorProductName(prod.id, e.target.value)}
                              placeholder="e.g. Product 1 / Leather Stool"
                            />
                          </div>

                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626', backgroundColor: '#fef2f2', padding: '0.25rem 0.7rem', borderRadius: '999px', border: '1px solid #fee2e2', flexShrink: 0 }}>
                            Slides {startSlide} - {endSlide} ({prod.sections.length} Slides)
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => toggleProductCollapse(prod.id)}
                            style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', color: '#475569' }}
                          >
                            {prod.collapsed ? '▼ Expand Sections' : '▲ Collapse Sections'}
                          </button>

                          {vendorProducts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeVendorProduct(prod.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                            >
                              <Trash2 size={16} /> Remove Product
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inspection Sections Cards Grid */}
                      {!prod.collapsed && (
                        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {prod.sections.map((sec, secIdx) => {
                            const slideNum = getSlideNumber(prodIdx, secIdx);
                            return (
                              <div key={sec.id} className="vendor-sec-card">
                                {/* Row 1: Slide Badge & Photo Count Pill */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <span className="vendor-slide-badge">
                                    SLIDE {slideNum}
                                  </span>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: sec.files.length > 0 ? '#16a34a' : '#64748b', backgroundColor: sec.files.length > 0 ? '#dcfce7' : '#f1f5f9', padding: '0.25rem 0.65rem', borderRadius: '999px', border: sec.files.length > 0 ? '1px solid #bbf7d0' : '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                      {sec.files.length} Photo{sec.files.length !== 1 ? 's' : ''} Uploaded
                                    </span>

                                    {secIdx >= 9 && (
                                      <button
                                        type="button"
                                        onClick={() => removeVendorSection(prod.id, sec.id)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Row 2: Full Width Editable Title Box */}
                                <div className="vendor-editable-title" style={{ width: '100%', marginBottom: '0.85rem', boxSizing: 'border-box' }}>
                                  <Pencil size={15} color="#dc2626" style={{ flexShrink: 0 }} />
                                  <input
                                    type="text"
                                    className="vendor-title-input"
                                    value={sec.title}
                                    onChange={e => updateVendorSectionTitle(prod.id, sec.id, e.target.value)}
                                  />
                                </div>

                                {/* Row 3: Image Upload Area */}
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                  <label className="vendor-dropzone">
                                    <UploadCloud size={18} />
                                    Upload Photos for Slide {slideNum}
                                    <input
                                      type="file"
                                      multiple
                                      accept="image/*"
                                      style={{ display: 'none' }}
                                      onChange={e => addVendorSectionImages(prod.id, sec.id, e.target.files)}
                                    />
                                  </label>

                                  {/* Image Previews Thumbnails Grid */}
                                  {sec.previews.map((preview, imgIdx) => (
                                    <div key={imgIdx} className="vendor-thumb-item" onClick={() => setPreviewModalImg(preview)}>
                                      <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      <button
                                        type="button"
                                        className="vendor-thumb-delete"
                                        onClick={(e) => { e.stopPropagation(); removeVendorSectionImage(prod.id, sec.id, imgIdx); }}
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => addCustomVendorSection(prod.id)}
                            style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed #dc2626', color: '#dc2626', padding: '0.45rem 0.9rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                          >
                            <Plus size={14} /> Add Custom Section Slide for {prod.product_name}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Internal DQA Inspection Report Image Upload (Slide 21) */}
              <div id="vendor-dqa-report" style={{ backgroundColor: '#f8fafc', borderRadius: '14px', padding: '1.25rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="vendor-slide-badge">SLIDE {getTotalSlidesCount()}</span> Internal DQA Inspection Report Document Photo
                  </h5>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: dqaReportImageFile ? '#16a34a' : '#dc2626', backgroundColor: dqaReportImageFile ? '#dcfce7' : '#fef2f2', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                    {dqaReportImageFile ? 'Document Uploaded' : 'Document Image Pending'}
                  </span>
                </div>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#64748b' }}>
                  Upload photo/scan of the physical Factory Internal Inspection Report document.
                </p>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label className="vendor-dropzone" style={{ padding: '0.75rem 1.3rem' }}>
                    <UploadCloud size={20} />
                    {dqaReportImageFile ? 'Change Internal DQA Report Photo' : 'Upload Internal DQA Report Document Photo'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => handleDqaReportImageChange(e.target.files)}
                    />
                  </label>

                  {dqaReportImagePreview && (
                    <div className="vendor-thumb-item" style={{ width: '130px', height: '95px' }} onClick={() => setPreviewModalImg(dqaReportImagePreview)}>
                      <img src={dqaReportImagePreview} alt="DQA Report" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        className="vendor-thumb-delete"
                        onClick={(e) => { e.stopPropagation(); removeDqaReportImage(); }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Mobile Floating Action Bar */}
              <div className="vendor-mobile-sticky-bar">
                <div>
                  <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>{getTotalSlidesCount()} Slides Ready</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Vendor Deck Generator</div>
                </div>

                <button
                  className="btn-primary"
                  onClick={handleGenerateVendorInspectionPresentation}
                  disabled={downloadingFormat !== null}
                  style={{
                    backgroundColor: '#dc2626',
                    borderColor: '#dc2626',
                    padding: '0.6rem 1.1rem',
                    fontSize: '0.88rem',
                    fontWeight: 800
                  }}
                >
                  {downloadingFormat === 'vendor_pptx' ? 'Generating…' : 'Generate PPTX'}
                </button>
              </div>

              {/* Desktop Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  className="btn-primary"
                  onClick={handleGenerateVendorInspectionPresentation}
                  disabled={downloadingFormat !== null}
                  style={{
                    backgroundColor: '#dc2626',
                    borderColor: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.8rem',
                    fontSize: '1rem',
                    fontWeight: 800,
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
                  }}
                >
                  <Download size={20} />
                  {downloadingFormat === 'vendor_pptx' ? 'Generating Inspection Report Deck…' : 'Generate Vendor Internal Inspection Deck (.pptx)'}
                </button>
              </div>

              {/* Image Preview Enlarge Modal */}
              {previewModalImg && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setPreviewModalImg(null)}>
                  <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                    <img src={previewModalImg} alt="" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }} />
                    <button
                      type="button"
                      onClick={() => setPreviewModalImg(null)}
                      style={{ position: 'absolute', top: '-15px', right: '-15px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : presentationType === 'brand' ? (


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
                    {/* Slide Title & Actions Card Header */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
                      {/* Top Row: Slide Badge & Delete Button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
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

                        {brandSlides.length > 1 && (
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
                        )}
                      </div>

                      {/* Middle Row: Product Name Input */}
                      <div style={{ width: '100%' }}>
                        <input
                          type="text"
                          value={slide.title}
                          onChange={e => updateBrandSlideTitle(slide.id, e.target.value)}
                          placeholder="Product Name / Style Code (e.g. Bar Stool BB-102)"
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.8rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            color: '#1e293b',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {/* Bottom Row: ERP Auto-pull Select */}
                      <div style={{ width: '100%' }}>
                        <CustomSelect
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
                          style={{ width: '100%', maxWidth: '100%' }}
                        />
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
                      Samples Catalog
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
                      Buyer Master Styles
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
        </div>
      )}
    </div>
  );
}

export default Tools;
