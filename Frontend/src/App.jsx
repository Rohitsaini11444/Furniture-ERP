import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, Clock, LogOut, Users, ChevronDown, Menu, X, Shield, Briefcase, Mail, Phone, User as UserIcon, CheckCircle, Settings, ShieldCheck, Inbox, ChevronRight, ArrowLeft, Archive, ShoppingBag, Store, Warehouse, FileBox } from 'lucide-react';
import api from './api/axios';

import { AuthProvider, useAuth } from './context/AuthContext';
import { DraftsProvider, useDrafts } from './context/DraftsContext';
import DraftsModal from './components/DraftsModal';
import ProtectedRoute from './components/ProtectedRoute';

import Login          from './pages/Login';
import Dashboard          from './pages/Dashboard';
import Samples            from './pages/Samples';
import Finishing          from './pages/Finishing';
import UserManagement     from './pages/UserManagement';
import ProductionPipeline from './pages/ProductionPipeline';
import Buyers         from './pages/Buyers';
import BuyerMasters   from './pages/BuyerMasters';
import POs            from './pages/POs';
import GateEntry      from './pages/GateEntry';
import PIs            from './pages/PIs';
import BuyerPIs       from './pages/BuyerPIs';
import Stock          from './pages/Stock';
import StockDetails   from './pages/StockDetails';
import UnitManagement from './pages/UnitManagement';
import Tools          from './pages/Tools';
import NotificationsPage from './pages/NotificationsPage';
import VendorManagement from './pages/VendorManagement';
import RecordTaxInvoice from './pages/RecordTaxInvoice';
import SupplierManagement from './pages/SupplierManagement';
import StoreManagement from './pages/StoreManagement';
import StoreItemMasterPage from './pages/StoreItemMasterPage';
import StoreMaterialInPage from './pages/StoreMaterialInPage';
import StoreDailyIssuePage from './pages/StoreDailyIssuePage';
import Breadcrumbs from './components/Breadcrumbs';

import pinkcityLogo from "./assets/pinkcity_logo.png";

const ROLE_COLORS = {
  admin:      '#8b5a2b',
  supervisor: '#a855f7',
  contractor: '#22c55e',
};

function Navbar() {
  const { user, setUser, logout, isAdmin, isSandingSupervisor, isContractor } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { draftCount } = useDrafts();

  // ── Global & Expandable Search State ──
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchDebounceRef = useRef(null);

  const [settings, setSettingsState] = useState(() => {
    try {
      const saved = localStorage.getItem('notification_preferences');
      return saved ? JSON.parse(saved) : { logins: true, production: true, orders: true, system: true };
    } catch (e) {
      return { logins: true, production: true, orders: true, system: true };
    }
  });

  const handleSaveSettings = () => {
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem('notification_preferences', JSON.stringify(settings));
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowSettingsModal(false);
      }, 1000);
    }, 600);
  };

  const fetchNotifications = useCallback(() => {
    if (user) {
      api.get('/notifications/', { params: { nopage: true } })
        .then(res => setNotifications(res.data.results || res.data))
        .catch(err => console.error(err));
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllAsRead = () => {
    api.post('/notifications/mark_all_read/')
      .then(() => fetchNotifications())
      .catch(err => console.error(err));
  };

  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      try {
        await api.patch(`/notifications/${n.id}/mark_read/`);
        setNotifications(prev => prev.filter(notif => notif.id !== n.id));
      } catch (err) {
        console.error('Failed to mark read', err);
      }
    }
    if (n.link) {
      navigate(n.link);
      setShowNotifications(false);
    }
  };

  useEffect(() => {
    if (user) {
      api.get('/auth/me/')
        .then(res => {
          const updatedUser = {
            id: res.data.id,
            username: res.data.username,
            full_name: `${res.data.first_name || ''} ${res.data.last_name || ''}`.trim() || res.data.username,
            first_name: res.data.first_name,
            last_name: res.data.last_name,
            email: res.data.email,
            phone: res.data.phone,
            role: res.data.role,
            batch_category: res.data.batch_category,
            supervisor_name: res.data.supervisor_name,
            profile_image: res.data.profile_image,
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        })
        .catch(err => {
          console.error('Failed to sync user profile', err);
          if (err.response?.status === 401) {
            logout();
          }
        });
    }
  }, []);

  const notifRefDesktop = useRef(null);
  const notifRefMobile = useRef(null);

  // ── Search Mode Open / Close / Keyboard Listener ──
  const handleOpenSearch = () => {
    setIsSearchOpen(true);
    setMobileMenuOpen(false);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 40);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchDrop(false);
  };

  const handleClearOrClose = () => {
    if (searchQuery && searchQuery.trim().length > 0) {
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchDrop(false);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    } else {
      handleCloseSearch();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isSearchOpen) {
        handleCloseSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // ── Search debounce + outside click ──
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDrop(false);
      }
      if (
        (notifRefDesktop.current && !notifRefDesktop.current.contains(event.target)) &&
        (notifRefMobile.current && !notifRefMobile.current.contains(event.target))
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(searchDebounceRef.current);
    if (!val.trim()) {
      setSearchResults([]);
      setShowSearchDrop(false);
      return;
    }
    setSearchLoading(true);
    setShowSearchDrop(true);
    searchDebounceRef.current = setTimeout(() => {
      api.get('/samples/', { params: { search: val.trim(), page_size: 8, compact: true } })
        .then(res => {
          setSearchResults(res.data.results || res.data || []);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 300);
  };

  const handleSearchSelect = (sample) => {
    handleCloseSearch();
    navigate(`/samples/${sample.id}`);
  };

  const formatNotificationTime = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      
      const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const diffTime = dNow - dDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {
      return '';
    }
  };

  const renderNotificationIcon = (msg, isRead) => {
    const msgLower = msg.toLowerCase();
    const isSuccess = msgLower.includes('success') || msgLower.includes('verified') || msgLower.includes('received') || msgLower.includes('approved') || msgLower.includes('completed');
    const isLogin = msgLower.includes('login') || msgLower.includes('logged');
    
    // Choose icon based on context
    const Icon = isSuccess ? ShieldCheck : (isLogin ? Shield : Clock);
    const bgColor = isSuccess ? '#f0fdf4' : '#fdfaf6';
    const borderColor = isSuccess ? '#e6f4ea' : '#f5ece1';
    const iconColor = isSuccess ? '#16a34a' : '#8b5a2b';
    
    return (
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: bgColor,
        border: `1.2px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={15} color={iconColor} />
      </div>
    );
  };

  const renderBell = (ref, containerClass) => {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    
    return (
      <div ref={ref} className={containerClass} style={{ position: 'relative' }}>
        {/* Bell Trigger Icon */}
        <div 
          className={`bell-trigger-wrapper ${unreadCount > 0 ? 'bell-shake-loop' : ''}`}
          style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <Bell size={28} color="#8b5a2b" className="navbar-action-icon bell-shake-hover" />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '-1px', right: '-2px',
              backgroundColor: '#8b5a2b', color: 'white',
              fontSize: '0.62rem', fontWeight: '800',
              width: '17px', height: '17px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%',
              boxShadow: '0 0 0 2px #ffffff'
            }}>
              {unreadCount}
            </span>
          )}
        </div>
        
        {/* Dropdown Card */}
        {showNotifications && (
          <div className="notif-panel">
            {/* Arrow pointer top */}
            <div className="notif-arrow-pointer" />

            {/* Header */}
            <div style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #f1ece5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative',
              zIndex: 1002,
              backgroundColor: '#ffffff'
            }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b', fontWeight: 700 }}>Notifications</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button 
                  onClick={markAllAsRead} 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#8b5a2b', 
                    fontSize: '0.8rem', 
                    fontWeight: 700, 
                    cursor: 'pointer', 
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'opacity 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <CheckCircle size={14} color="#8b5a2b" /> Mark all read
                </button>
                <div style={{ width: '1px', height: '14px', backgroundColor: '#e2e8f0' }} />
                <Settings 
                  size={15} 
                  color="#8b5a2b" 
                  style={{ cursor: 'pointer', transition: 'transform 0.3s ease' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'rotate(45deg)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'rotate(0deg)'}
                  onClick={() => { setShowNotifications(false); setShowSettingsModal(true); }}
                />
              </div>
            </div>

            {/* List */}
            <div style={{ maxHeight: '300px', overflowY: 'auto', backgroundColor: '#ffffff' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                  No notifications
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {notifications.map(n => {
                    let title = n.message || '';
                    let details = [];
                    
                    if (title.includes('\n')) {
                      const lines = title.split('\n');
                      title = lines[0];
                      details = lines.slice(1);
                    } else {
                      const regex = /^New\s+login\s+detected\s+from\s+([^\s]+)\s*\((.+)\)$/i;
                      const match = title.match(regex);
                      if (match) {
                        title = "New login detected";
                        details = [
                          `from ${match[1]}`,
                          match[2]
                        ];
                      }
                    }
                    
                    return (
                      <div 
                        key={n.id} 
                        onClick={() => handleNotificationClick(n)}
                        style={{
                          display: 'flex',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid #f1ece5',
                          cursor: 'pointer',
                          backgroundColor: '#ffffff',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = '#faf8f5';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        {renderNotificationIcon(n.message, n.is_read)}
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.15rem' }}>
                            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                              {title}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {formatNotificationTime(n.created_at)}
                            </span>
                          </div>
                          {details.map((line, idx) => (
                            <div key={idx} style={{ fontSize: '0.76rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.05rem' }}>
                              {line}
                            </div>
                          ))}
                        </div>

                        {/* Status dot indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, paddingLeft: '0.15rem' }}>
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: n.is_read ? '#cbd5e1' : (n.message.toLowerCase().includes('success') ? '#22c55e' : '#3b82f6'),
                            transition: 'background-color 0.25s ease'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div 
              onClick={() => { setShowNotifications(false); navigate('/notifications'); }}
              style={{
                padding: '0.7rem 1rem',
                backgroundColor: '#faf6f0',
                borderTop: '1px solid #f1ece5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                position: 'relative',
                zIndex: 1002
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3ebd9'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#faf6f0'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Inbox size={16} color="#8b5a2b" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#8b5a2b' }}>
                  View all notifications
                </span>
              </div>
              <ChevronRight size={16} color="#8b5a2b" />
            </div>
          </div>
        )}

        <style>{`
          .notif-panel {
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 8px;
            width: 360px;
            max-width: calc(100vw - 24px);
            background-color: white;
            box-shadow: 0 12px 32px rgba(0,0,0,0.14), 0 4px 12px rgba(0,0,0,0.06);
            border-radius: 14px;
            border: 1px solid #e7e5e4;
            z-index: 9999;
            animation: notifPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            overflow: hidden;
          }
          .notif-arrow-pointer {
            position: absolute;
            top: -6px;
            right: 16px;
            width: 12px;
            height: 12px;
            backgroundColor: #ffffff;
            border-left: 1px solid #e7e5e4;
            border-top: 1px solid #e7e5e4;
            transform: rotate(45deg);
            z-index: 10001;
          }
          @media (max-width: 768px) {
            .notif-panel {
              position: absolute;
              top: calc(100% + 12px);
              right: -42px;
              left: auto;
              width: min(340px, calc(100vw - 24px));
              max-width: calc(100vw - 24px);
              box-shadow: 0 16px 40px rgba(0,0,0,0.22);
              z-index: 99999;
            }
            .notif-arrow-pointer {
              display: block;
              right: 48px;
            }
          }
          @keyframes bellRing {
            0% { transform: rotate(0); }
            10% { transform: rotate(15deg); }
            20% { transform: rotate(-10deg); }
            30% { transform: rotate(10deg); }
            40% { transform: rotate(-8deg); }
            50% { transform: rotate(6deg); }
            60% { transform: rotate(-4deg); }
            70% { transform: rotate(3deg); }
            80% { transform: rotate(-2deg); }
            90% { transform: rotate(1deg); }
            100% { transform: rotate(0); }
          }
          .bell-shake-hover:hover {
            animation: bellRing 0.8s ease-in-out;
          }
          .bell-shake-loop {
            animation: bellRing 1.2s ease-in-out;
            animation-iteration-count: 2;
          }
          @keyframes notifPop {
            from { opacity: 0; transform: translateY(-10px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    );
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  return (
    <>
      <nav className="navbar" style={{ position: 'sticky', top: 0, zIndex: 1000, backgroundColor: '#ffffff' }}>
      <div className="navbar-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        
        {/* ── Brand Logo & Name ── */}
        <Link 
          to="/" 
          className="navbar-brand" 
          onClick={() => setMobileMenuOpen(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            transition: 'opacity 250ms ease-in-out, transform 250ms ease-in-out, visibility 250ms ease-in-out',
            opacity: isSearchOpen ? 0 : 1,
            transform: isSearchOpen ? 'scale(0.9)' : 'scale(1)',
            visibility: isSearchOpen ? 'hidden' : 'visible',
            pointerEvents: isSearchOpen ? 'none' : 'auto'
          }}
        >
          <img src={pinkcityLogo} alt="Pinkcity Logo" className="navbar-logo-img" />
          <span className="navbar-brand-text">Pinkcity Enterprises</span>
        </Link>

        {/* ── Mobile-Only Right Header Action Controls ── */}
        <div 
          className="navbar-mobile-right-actions mobile-only"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '10px',
            transition: 'opacity 250ms ease-in-out, transform 250ms ease-in-out, visibility 250ms ease-in-out',
            opacity: isSearchOpen ? 0 : 1,
            transform: isSearchOpen ? 'translateY(-8px)' : 'translateY(0)',
            visibility: isSearchOpen ? 'hidden' : 'visible',
            pointerEvents: isSearchOpen ? 'none' : 'auto'
          }}
        >
          {/* Mobile Search Trigger Icon */}
          <button 
            type="button" 
            className="navbar-search-btn"
            onClick={handleOpenSearch}
            aria-label="Open Search"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              color: '#8b5a2b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background-color 0.2s'
            }}
          >
            <Search size={22} color="#8b5a2b" />
          </button>

          {/* Mobile Drafts Button */}
          <div
            style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={() => setShowDraftsModal(true)}
            title="Saved Drafts"
          >
            <FileBox size={22} color="#8b5a2b" />
            {draftCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  backgroundColor: '#14b8a6',
                  color: 'white',
                  fontSize: '0.6rem',
                  fontWeight: '800',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  boxShadow: '0 0 0 2px #ffffff'
                }}
              >
                {draftCount}
              </span>
            )}
          </div>

          {/* Mobile Notification Bell */}
          {renderBell(notifRefMobile, "navbar-mobile-bell-container")}

          {/* Mobile menu toggle */}
          <button 
            className="navbar-toggle-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <div 
              style={{
                width: '20px',
                height: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transform: mobileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
              }}
            >
              <span style={{
                width: '100%',
                height: '2px',
                backgroundColor: '#64748b',
                borderRadius: '2px',
                transform: mobileMenuOpen ? 'translateY(6px) rotate(45deg)' : 'translateY(0) rotate(0deg)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'absolute',
                top: '0'
              }} />
              <span style={{
                width: '100%',
                height: '2px',
                backgroundColor: '#64748b',
                borderRadius: '2px',
                opacity: mobileMenuOpen ? 0 : 1,
                transition: 'opacity 0.2s ease',
                position: 'absolute',
                top: '6px'
              }} />
              <span style={{
                width: '100%',
                height: '2px',
                backgroundColor: '#64748b',
                borderRadius: '2px',
                transform: mobileMenuOpen ? 'translateY(-6px) rotate(-45deg)' : 'translateY(0) rotate(0deg)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'absolute',
                bottom: '0'
              }} />
            </div>
          </button>
        </div>

        {/* ── Mobile-Only Expandable Search Mode Overlay (Gmail / YouTube Style) ── */}
        <div
          ref={searchRef}
          className="navbar-expandable-search mobile-only"
          style={{
            position: 'absolute',
            top: '-4px',
            bottom: '-4px',
            left: '-8px',
            right: '-8px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#ffffff',
            padding: '0 8px',
            zIndex: 100,
            transition: 'opacity 250ms ease-in-out, transform 250ms ease-in-out, visibility 250ms ease-in-out',
            opacity: isSearchOpen ? 1 : 0,
            transform: isSearchOpen ? 'scale(1)' : 'scale(0.98)',
            visibility: isSearchOpen ? 'visible' : 'hidden',
            pointerEvents: isSearchOpen ? 'auto' : 'none'
          }}
        >
          {/* Back Arrow Button */}
          <button
            type="button"
            onClick={handleCloseSearch}
            aria-label="Close search"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8b5a2b',
              borderRadius: '50%',
              flexShrink: 0
            }}
          >
            <ArrowLeft size={22} color="#8b5a2b" />
          </button>

          {/* Search Input Box */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#F8F6F2',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '999px',
            height: '40px',
            padding: '0 14px',
            position: 'relative'
          }}>
            <Search size={17} color="#94a3b8" style={{ marginRight: '8px', flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search Buyer, Supplier, PO, PI..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.trim() && setShowSearchDrop(true)}
              autoComplete="off"
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: '0.88rem',
                color: '#1e293b',
                fontFamily: 'inherit'
              }}
            />
            {/* Clear / Close X Button */}
            <button
              type="button"
              onClick={handleClearOrClose}
              aria-label="Clear search text or close search"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                flexShrink: 0
              }}
            >
              <X size={18} color="#64748b" />
            </button>
          </div>

          {/* Dropdown Results Panel */}
          <div className={`search-dropdown-panel ${showSearchDrop && isSearchOpen ? 'is-visible' : ''}`} style={{ top: 'calc(100% + 4px)', left: 0, right: 0 }}>
            {searchLoading && [0, 1, 2, 3].map(i => (
              <div key={i} className="search-skeleton-row" style={{ borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
                <div className="search-skeleton-thumb" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="search-skeleton-text" style={{ width: '30%', animationDelay: `${i * 0.08}s` }} />
                  <div className="search-skeleton-text" style={{ width: '65%', animationDelay: `${i * 0.08 + 0.05}s` }} />
                </div>
              </div>
            ))}

            {!searchLoading && searchResults.length === 0 && (
              <div style={{ padding: '1.1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>
                No samples found
              </div>
            )}

            {!searchLoading && searchResults.map((sample, idx) => (
              <div
                key={sample.id}
                className="search-result-row"
                style={{
                  borderBottom: idx < searchResults.length - 1 ? '1px solid #f1f5f9' : 'none',
                  animationDelay: `${idx * 0.045}s`
                }}
                onClick={() => {
                  handleSearchSelect(sample);
                  handleCloseSearch();
                }}
              >
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #e2e8f0'
                }}>
                  {sample.images?.[0]?.image ? (
                    <img src={sample.images[0].image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <svg width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="1.5" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="m21 15-5-5L5 21"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8b5a2b', minWidth: '72px', flexShrink: 0 }}>
                  {sample.style_no || sample.id || '—'}
                </span>
                <span style={{ fontSize: '0.83rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sample.product_name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Standard Desktop Navbar Menu & Mobile Drawer Menu ── */}
        <div className={`navbar-menu ${mobileMenuOpen ? 'is-open' : ''}`}>
          
          {/* Centered Desktop Search Bar (Hidden on Mobile) */}
          <div className="navbar-search-wrapper desktop-only" ref={searchRef} style={{ position: 'relative', flex: '1 1 450px', maxWidth: '680px', margin: '0 auto' }}>
            <Search size={16} color="#94a3b8" className="navbar-search-icon" />
            <input
              type="text"
              placeholder="Search samples by style no. or name…"
              className="navbar-search-input"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.trim() && setShowSearchDrop(true)}
              autoComplete="off"
            />

            {/* Desktop search dropdown results panel */}
            <div className={`search-dropdown-panel ${showSearchDrop && !isSearchOpen ? 'is-visible' : ''}`}>
              {searchLoading && [0, 1, 2, 3].map(i => (
                <div key={i} className="search-skeleton-row" style={{ borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
                  <div className="search-skeleton-thumb" />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div className="search-skeleton-text" style={{ width: '30%', animationDelay: `${i * 0.08}s` }} />
                    <div className="search-skeleton-text" style={{ width: '65%', animationDelay: `${i * 0.08 + 0.05}s` }} />
                  </div>
                </div>
              ))}

              {!searchLoading && searchResults.length === 0 && (
                <div style={{ padding: '1.1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>
                  No samples found
                </div>
              )}

              {!searchLoading && searchResults.map((sample, idx) => (
                <div
                  key={sample.id}
                  className="search-result-row"
                  style={{
                    borderBottom: idx < searchResults.length - 1 ? '1px solid #f1f5f9' : 'none',
                    animationDelay: `${idx * 0.045}s`
                  }}
                  onClick={() => handleSearchSelect(sample)}
                >
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #e2e8f0'
                  }}>
                    {sample.images?.[0]?.image ? (
                      <img src={sample.images[0].image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="1.5" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="m21 15-5-5L5 21"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8b5a2b', minWidth: '72px', flexShrink: 0 }}>
                    {sample.style_no || sample.id || '—'}
                  </span>
                  <span style={{ fontSize: '0.83rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sample.product_name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Actions & User Section */}
          <div className="navbar-actions">
            <div className="navbar-action-icons">
              {/* Drafts Button */}
              <div
                style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                onClick={() => setShowDraftsModal(true)}
                title="Saved Drafts"
              >
                <FileBox size={26} color="#8b5a2b" className="navbar-action-icon" />
                {draftCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-1px',
                      right: '-2px',
                      backgroundColor: '#14b8a6',
                      color: 'white',
                      fontSize: '0.62rem',
                      fontWeight: '800',
                      width: '17px',
                      height: '17px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      boxShadow: '0 0 0 2px #ffffff'
                    }}
                  >
                    {draftCount}
                  </span>
                )}
              </div>

              {/* Desktop Notification Bell */}
              {renderBell(notifRefDesktop, "desktop-only")}
            </div>

            {user && (
              <div className="navbar-user-section">
                {/* Role badge */}
                <span
                  className="navbar-role-badge"
                  style={{ backgroundColor: ROLE_COLORS[user.role] + '20', color: ROLE_COLORS[user.role] }}
                >
                  {isSandingSupervisor ? 'Sanding Supervisor' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>

                {/* User info */}
                <div className="navbar-user" onClick={() => setShowProfileModal(true)} style={{ cursor: 'pointer' }}>
                   {user.profile_image ? (
                     <img
                       src={user.profile_image}
                       alt={user.full_name || user.username}
                       className="navbar-avatar"
                       style={{ objectFit: 'cover', border: `2px solid ${ROLE_COLORS[user.role]}` }}
                     />
                   ) : (
                     <div
                       className="navbar-avatar"
                       style={{ backgroundColor: ROLE_COLORS[user.role] }}
                     >
                       {(user.full_name?.[0] || user.username?.[0] || 'U').toUpperCase()}
                     </div>
                   )}
                   <span className="navbar-username">{user.full_name || user.username}</span>
                </div>

                {/* Store Management link */}
                <Link to="/store-management" className="navbar-icon-btn" title="Store Management" onClick={() => setMobileMenuOpen(false)}>
                  <Warehouse size={18} color="#ea580c" />
                  <span className="navbar-mobile-label">Store Management</span>
                </Link>

                {/* Admin link */}
                {isAdmin && (
                  <Link to="/users" className="navbar-icon-btn" title="User Management" onClick={() => setMobileMenuOpen(false)}>
                    <Users size={18} color="#64748b" />
                    <span className="navbar-mobile-label">User Management</span>
                  </Link>
                )}

                {/* Logout */}
                <button className="navbar-logout-btn" onClick={handleLogout} title="Logout">
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </nav>

      {/* Profile Details Modal */}
      {showProfileModal && user && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" style={{ maxWidth: '380px', borderRadius: '12px', padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h2>User Profile</h2>
              <button className="modal-close" onClick={() => setShowProfileModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem', paddingTop: '1rem' }}>
              <div style={{ position: 'relative' }}>
                {user.profile_image ? (
                  <img 
                    src={user.profile_image} 
                    alt="Profile" 
                    style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${ROLE_COLORS[user.role]}` }}
                  />
                ) : (
                  <div 
                    style={{ 
                      width: '110px', 
                      height: '110px', 
                      borderRadius: '50%', 
                      backgroundColor: ROLE_COLORS[user.role], 
                      color: '#fff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '2.5rem', 
                      fontWeight: 'bold' 
                    }}
                  >
                    {(user.full_name?.[0] || user.username?.[0] || 'U').toUpperCase()}
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: '0.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-color)', margin: 0 }}>
                  {user.full_name || user.username}
                </h3>
                <span 
                  className="navbar-role-badge"
                  style={{ 
                    backgroundColor: ROLE_COLORS[user.role] + '20', 
                    color: ROLE_COLORS[user.role], 
                    display: 'inline-block', 
                    marginTop: '0.35rem',
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.5rem'
                  }}
                >
                  {isSandingSupervisor ? 'Sanding Supervisor' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
              </div>

              <div style={{ width: '100%', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <UserIcon size={16} color="#64748b" style={{ flexShrink: 0 }} />
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Username</span>
                    <strong style={{ color: 'var(--text-color)' }}>{user.username}</strong>
                  </div>
                </div>

                {user.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Mail size={16} color="#64748b" style={{ flexShrink: 0 }} />
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Email</span>
                      <strong style={{ color: 'var(--text-color)', wordBreak: 'break-all' }}>{user.email}</strong>
                    </div>
                  </div>
                )}

                {user.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Phone size={16} color="#64748b" style={{ flexShrink: 0 }} />
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Phone</span>
                      <strong style={{ color: 'var(--text-color)' }}>{user.phone}</strong>
                    </div>
                  </div>
                )}

                {user.role === 'supervisor' && user.batch_category && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Briefcase size={16} color="#64748b" style={{ flexShrink: 0 }} />
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Batch Category</span>
                      <strong style={{ color: 'var(--text-color)' }}>
                        {user.batch_category.charAt(0).toUpperCase() + user.batch_category.slice(1)}
                      </strong>
                    </div>
                  </div>
                )}

                {user.role === 'contractor' && user.supervisor_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Briefcase size={16} color="#64748b" style={{ flexShrink: 0 }} />
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Supervisor</span>
                      <strong style={{ color: 'var(--text-color)' }}>{user.supervisor_name}</strong>
                    </div>
                  </div>
                )}
              </div>

              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setShowProfileModal(false)}
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.4rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" style={{ maxWidth: '420px', borderRadius: '12px', padding: '1.5rem', animation: 'notifPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-color)', margin: 0 }}>Notification Settings</h2>
              <button className="modal-close" onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 0, marginBottom: '1.5rem', borderBottom: '1px solid #f1ece5', paddingBottom: '0.75rem' }}>
              Configure your notifications. Toggled options will alert you via the navbar bell icon.
            </p>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Security switch */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ flex: 1, paddingRight: '1rem' }}>
                  <span style={{ fontWeight: 650, color: 'var(--text-color)', display: 'block', fontSize: '0.88rem' }}>Security & Logins</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Notify on new logins from unrecognized devices.</span>
                </div>
                <div 
                  onClick={() => setSettingsState(prev => ({ ...prev, logins: !prev.logins }))}
                  style={{
                    width: '42px',
                    height: '22px',
                    borderRadius: '11px',
                    backgroundColor: settings.logins ? '#8b5a2b' : '#cbd5e1',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: settings.logins ? '22px' : '2px',
                    transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>

              {/* Production switch */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ flex: 1, paddingRight: '1rem' }}>
                  <span style={{ fontWeight: 650, color: 'var(--text-color)', display: 'block', fontSize: '0.88rem' }}>Production Milestones</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Notify when products enter Sanding, Gate QC or Finished Goods.</span>
                </div>
                <div 
                  onClick={() => setSettingsState(prev => ({ ...prev, production: !prev.production }))}
                  style={{
                    width: '42px',
                    height: '22px',
                    borderRadius: '11px',
                    backgroundColor: settings.production ? '#8b5a2b' : '#cbd5e1',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: settings.production ? '22px' : '2px',
                    transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>

              {/* Orders switch */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #f8fafc' }}>
                <div style={{ flex: 1, paddingRight: '1rem' }}>
                  <span style={{ fontWeight: 650, color: 'var(--text-color)', display: 'block', fontSize: '0.88rem' }}>Order & PI Operations</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Notify on new sample orders, PO arrivals, or PI generation.</span>
                </div>
                <div 
                  onClick={() => setSettingsState(prev => ({ ...prev, orders: !prev.orders }))}
                  style={{
                    width: '42px',
                    height: '22px',
                    borderRadius: '11px',
                    backgroundColor: settings.orders ? '#8b5a2b' : '#cbd5e1',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: settings.orders ? '22px' : '2px',
                    transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>

              {/* System alerts switch */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem' }}>
                <div style={{ flex: 1, paddingRight: '1rem' }}>
                  <span style={{ fontWeight: 650, color: 'var(--text-color)', display: 'block', fontSize: '0.88rem' }}>System Announcements</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Notify on system maintenance, downtime, or general notices.</span>
                </div>
                <div 
                  onClick={() => setSettingsState(prev => ({ ...prev, system: !prev.system }))}
                  style={{
                    width: '42px',
                    height: '22px',
                    borderRadius: '11px',
                    backgroundColor: settings.system ? '#8b5a2b' : '#cbd5e1',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    flexShrink: 0
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: settings.system ? '22px' : '2px',
                    transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setShowSettingsModal(false)}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveSettings}
                disabled={saving || saveSuccess}
                style={{ 
                  flex: 1, 
                  padding: '0.5rem', 
                  backgroundColor: '#8b5a2b', 
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (saving || saveSuccess) ? 'default' : 'pointer',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 600,
                  opacity: (saving || saveSuccess) ? 0.8 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                {saving ? (
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid white', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                ) : saveSuccess ? (
                  'Saved ✓'
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Render Drafts Modal */}
      <DraftsModal isOpen={showDraftsModal} onClose={() => setShowDraftsModal(false)} />
    </>
  );
}

function Footer() {
  return (
    <footer className="app-company-footer">
      <div className="footer-content-wrap">
        {/* Brand Block */}
        <div className="footer-brand-block">
          <img src={pinkcityLogo} alt="Pinkcity Enterprises Logo" className="footer-logo" />
          <div>
            <h3 className="footer-company-name">Pinkcity Enterprises</h3>
            <p className="footer-company-tagline">Manufacturing & Furniture Export ERP</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="footer-details-grid">
          <div className="footer-detail-card">
            <span className="footer-detail-title">📍 Official Address & Works</span>
            <p className="footer-detail-text">
              G-78, EPIP, Sitapura Industrial Area, Tonk Road, Jaipur-302022 Rajasthan, India.
            </p>
          </div>

          <div className="footer-detail-card">
            <span className="footer-detail-title">📞 Contact Telephone</span>
            <p className="footer-detail-text">
              +91-141-2771144 / 2770033
            </p>
          </div>

          <div className="footer-detail-card">
            <span className="footer-detail-title">📋 Registrations & Codes</span>
            <p className="footer-detail-text">
              <strong>GSTIN/UIN:</strong> 08ABXPS4077R1Z8<br />
              <strong>IEC CODE:</strong> 1397002620<br />
              <strong>State:</strong> Rajasthan (Code: 08)
            </p>
          </div>
        </div>
      </div>

      <div className="footer-bottom-bar">
        <span>© {new Date().getFullYear()} Pinkcity Enterprises. All Rights Reserved.</span>
        <span>Enterprise Furniture ERP Platform</span>
      </div>
    </footer>
  );
}

function AppLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search]);

  return (
    <div className="app-container">
      {isAuthenticated && !isLogin && <Navbar />}
      <main className={isLogin ? '' : 'container'}>
        {isAuthenticated && !isLogin && <Breadcrumbs />}
        <div key={location.pathname} className="page-transition-wrapper">
          <Routes location={location}>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/samples" element={<ProtectedRoute allowedRoles={['admin']}><Samples /></ProtectedRoute>} />
            <Route path="/samples/:id" element={<ProtectedRoute allowedRoles={['admin']}><Samples /></ProtectedRoute>} />
            <Route path="/finishing" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><Finishing /></ProtectedRoute>} />
            <Route path="/finishing/:id" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><Finishing /></ProtectedRoute>} />
            <Route path="/buyers" element={<ProtectedRoute allowedRoles={['admin']}><Buyers /></ProtectedRoute>} />
            <Route path="/buyers/:id" element={<ProtectedRoute allowedRoles={['admin']}><Buyers /></ProtectedRoute>} />
            <Route path="/buyer-masters" element={<ProtectedRoute allowedRoles={['admin']}><BuyerMasters /></ProtectedRoute>} />
            <Route path="/buyer-masters/buyer/:buyerId" element={<ProtectedRoute allowedRoles={['admin']}><BuyerMasters /></ProtectedRoute>} />
            <Route path="/buyer-masters/edit/:buyerId" element={<ProtectedRoute allowedRoles={['admin']}><BuyerMasters /></ProtectedRoute>} />
            <Route path="/buyer-masters/:id" element={<ProtectedRoute allowedRoles={['admin']}><BuyerMasters /></ProtectedRoute>} />
            <Route path="/pos" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><POs /></ProtectedRoute>} />
            <Route path="/pos/:id" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><POs /></ProtectedRoute>} />
            <Route path="/vendor-management" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><VendorManagement /></ProtectedRoute>} />
            <Route path="/vendor-management/:id" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><VendorManagement /></ProtectedRoute>} />
            <Route path="/record-tax-invoice" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><RecordTaxInvoice /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><SupplierManagement /></ProtectedRoute>} />
            
            {/* Gate Entry, Store & Stock */}
            <Route path="/store-management" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><StoreManagement /></ProtectedRoute>} />
            <Route path="/store-management/material-in" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><StoreMaterialInPage /></ProtectedRoute>} />
            <Route path="/store-management/daily-issue" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><StoreDailyIssuePage /></ProtectedRoute>} />
            <Route path="/store-management/item-master/new" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><StoreItemMasterPage /></ProtectedRoute>} />
            <Route path="/store-management/item-master/edit/:id" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><StoreItemMasterPage /></ProtectedRoute>} />
            <Route path="/gate-entry" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><GateEntry /></ProtectedRoute>} />
            <Route path="/gate-entry/:id" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><GateEntry /></ProtectedRoute>} />
            <Route path="/stock" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><Stock /></ProtectedRoute>} />
            <Route path="/stock/details/:stageKey" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><StockDetails /></ProtectedRoute>} />
            <Route path="/stock-details/:stageKey" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><StockDetails /></ProtectedRoute>} />

            {/* Tools & Catalog Generators */}
            <Route path="/tools" element={<ProtectedRoute allowedRoles={['admin', 'supervisor']}><Tools /></ProtectedRoute>} />

            <Route path="/performa-invoices" element={<ProtectedRoute allowedRoles={['admin']}><BuyerPIs /></ProtectedRoute>} />
            <Route path="/performa-invoices/:id" element={<ProtectedRoute allowedRoles={['admin']}><BuyerPIs /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute allowedRoles={['admin']}><PIs /></ProtectedRoute>} />
            <Route path="/invoices/:id" element={<ProtectedRoute allowedRoles={['admin']}><PIs /></ProtectedRoute>} />
            <Route path="/pis" element={<ProtectedRoute allowedRoles={['admin']}><PIs /></ProtectedRoute>} />
            <Route path="/pis/:id" element={<ProtectedRoute allowedRoles={['admin']}><PIs /></ProtectedRoute>} />

            {/* Production & Stock Pipeline — accessible to Supervisor, Contractor, and Admin */}
            <Route
              path="/production-pipeline"
              element={
                <ProtectedRoute>
                  <Stock />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sanding"
              element={
                <ProtectedRoute>
                  <Stock />
                </ProtectedRoute>
              }
            />

            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin only */}
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/units"
              element={
                <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                  <UnitManagement />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </main>
      {isAuthenticated && location.pathname === '/' && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <DraftsProvider>
          <AppLayout />
        </DraftsProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
