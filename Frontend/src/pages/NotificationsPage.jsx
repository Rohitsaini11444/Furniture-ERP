import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Shield, Clock, CheckCircle, Search, Trash2, Inbox, ChevronLeft } from 'lucide-react';
import api from '../api/axios';

const ROLE_COLORS = {
  admin:      '#8b5a2b',
  supervisor: '#a855f7',
  contractor: '#22c55e',
};

function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unread', 'read'
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch all notifications from the backend
  const fetchAllNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications/', { params: { nopage: true } });
      setNotifications(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllNotifications();
  }, [fetchAllNotifications]);

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      setActionLoading(true);
      await api.post('/notifications/mark_all_read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Mark a single notification as read and navigate
  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      try {
        await api.patch(`/notifications/${n.id}/mark_read/`);
        setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, is_read: true } : notif));
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  // Delete a notification (dismiss)
  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation(); // Prevent trigger click navigation
    try {
      await api.delete(`/notifications/${id}/`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Format timestamp helper
  const formatTime = (dateStr) => {
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
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) {
      return '';
    }
  };

  // Render notification Icon Badge
  const getIconBadge = (msg) => {
    const msgLower = msg.toLowerCase();
    const isSuccess = msgLower.includes('success') || msgLower.includes('verified') || msgLower.includes('received') || msgLower.includes('approved') || msgLower.includes('completed');
    const isLogin = msgLower.includes('login') || msgLower.includes('logged');
    
    const Icon = isSuccess ? ShieldCheck : (isLogin ? Shield : Clock);
    const bgColor = isSuccess ? '#f0fdf4' : '#fdfaf6';
    const borderColor = isSuccess ? '#e6f4ea' : '#f5ece1';
    const iconColor = isSuccess ? '#16a34a' : '#8b5a2b';
    
    return (
      <div style={{
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        backgroundColor: bgColor,
        border: `1.5px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={18} color={iconColor} />
      </div>
    );
  };

  // Message parser
  const parseMessage = (msg) => {
    let title = msg || '';
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
    return { title, details };
  };

  // Apply tab filters and search filters
  const filteredNotifications = notifications.filter(n => {
    // 1. Search Query filter
    const matchesSearch = (n.message || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Tab filter
    if (activeTab === 'unread') {
      return matchesSearch && !n.is_read;
    }
    if (activeTab === 'read') {
      return matchesSearch && n.is_read;
    }
    return matchesSearch;
  });

  return (
    <div style={{ padding: '1.5rem 0', width: '100%' }}>
      
      {/* Back to Dashboard Link */}
      <div 
        onClick={() => navigate('/')}
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.4rem', 
          color: '#8b5a2b', 
          fontSize: '0.9rem', 
          fontWeight: 600, 
          cursor: 'pointer',
          marginBottom: '1rem',
          transition: 'transform 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateX(-3px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
      >
        <ChevronLeft size={16} /> Back to Dashboard
      </div>

      {/* Main card */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.02)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        
        {/* Header bar */}
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Notifications Center</h1>
            <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>View, search, and manage your recent activity alerts.</p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={handleMarkAllRead}
              disabled={actionLoading || notifications.filter(n => !n.is_read).length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'transparent',
                border: '1px solid #d6c7b2',
                color: '#8b5a2b',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: notifications.filter(n => !n.is_read).length === 0 ? 0.5 : 1
              }}
              onMouseEnter={e => {
                if (notifications.filter(n => !n.is_read).length > 0) {
                  e.currentTarget.style.backgroundColor = '#faf8f5';
                }
              }}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <CheckCircle size={15} /> Mark all read
            </button>
          </div>
        </div>

        {/* Filters and Search toolbar */}
        <div style={{
          padding: '1rem 2rem',
          backgroundColor: '#faf8f5',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#e2e8f0', padding: '0.25rem', borderRadius: '8px' }}>
            {['all', 'unread', 'read'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.35rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === tab ? '#ffffff' : 'transparent',
                  color: activeTab === tab ? '#8b5a2b' : '#475569',
                  boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize'
                }}
              >
                {tab} {tab === 'unread' && notifications.filter(n => !n.is_read).length > 0 && `(${notifications.filter(n => !n.is_read).length})`}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <input 
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 1rem 0.5rem 2.2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#8b5a2b'}
              onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
            />
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>

        {/* List Content */}
        <div style={{ minHeight: '300px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '1rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #8b5a2b', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading alerts...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', textAlign: 'center', padding: '2rem' }}>
              <Inbox size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#334155', fontWeight: 600 }}>No notifications found</h3>
              <p style={{ margin: '0.2rem 0 0', color: '#94a3b8', fontSize: '0.82rem', maxWidth: '300px' }}>
                There are no alerts matching your filters.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredNotifications.map((n, idx) => {
                const { title, details } = parseMessage(n.message);
                
                return (
                  <div 
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      display: 'flex',
                      gap: '1.25rem',
                      padding: '1.25rem 2rem',
                      borderBottom: idx < filteredNotifications.length - 1 ? '1px solid #f1f5f9' : 'none',
                      cursor: n.link ? 'pointer' : 'default',
                      backgroundColor: n.is_read ? 'transparent' : '#fdfaf6',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      alignItems: 'flex-start',
                      position: 'relative'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = '#faf8f5';
                      const btn = e.currentTarget.querySelector('.dismiss-btn');
                      if (btn) btn.style.opacity = '1';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = n.is_read ? 'transparent' : '#fdfaf6';
                      const btn = e.currentTarget.querySelector('.dismiss-btn');
                      if (btn) btn.style.opacity = '0';
                    }}
                  >
                    {/* Icon */}
                    {getIconBadge(n.message)}

                    {/* Text content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: n.is_read ? 600 : 700, color: '#1e293b' }}>
                          {title}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {formatTime(n.created_at)}
                        </span>
                      </div>
                      
                      {details.map((line, lIdx) => (
                        <p key={lIdx} style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#475569', lineHeight: 1.4, wordBreak: 'break-word' }}>
                          {line}
                        </p>
                      ))}
                    </div>

                    {/* Action panel (Center Dot / Trash Action) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', alignSelf: 'center', height: '100%', paddingLeft: '0.5rem', flexShrink: 0 }}>
                      {/* Read status dot */}
                      {!n.is_read && (
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: n.message.toLowerCase().includes('success') ? '#22c55e' : '#3b82f6',
                        }} />
                      )}

                      {/* Dismiss trash icon (visible on hover) */}
                      <button
                        className="dismiss-btn"
                        onClick={(e) => handleDeleteNotification(e, n.id)}
                        title="Dismiss notification"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '0.35rem',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.15s ease, background-color 0.15s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Embedded Spin Keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default NotificationsPage;
