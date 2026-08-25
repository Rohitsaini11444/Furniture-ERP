import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCircle, Mail, Calendar, Search, Filter, Trash2,
  Shield, Package, FileText, Check, MoreVertical, RefreshCw, AlertTriangle
} from 'lucide-react';
import api from '../api/axios';
import Breadcrumbs from '../components/Breadcrumbs';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'read'
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'security' | 'inventory' | 'orders' | 'system'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest'
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch notifications from backend
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications/', { params: { nopage: true } });
      setNotifications(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Mark all as read
  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      await api.post('/notifications/mark_all_read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Mark single notification as read & navigate if link exists
  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      try {
        await api.patch(`/notifications/${n.id}/mark_read/`);
        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
      } catch (err) {
        console.error('Failed to mark read', err);
      }
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  // Delete notification
  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}/`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // KPI Calculations
  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const readCount = notifications.filter(n => n.is_read).length;

  const todayCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return notifications.filter(n => new Date(n.created_at).toDateString() === todayStr).length;
  }, [notifications]);

  // Filtered & Sorted Notifications
  const filteredNotifications = useMemo(() => {
    return notifications
      .filter(n => {
        const matchesTab = activeTab === 'all' || (activeTab === 'unread' && !n.is_read) || (activeTab === 'read' && n.is_read);
        const matchesCategory = categoryFilter === 'all' || n.category === categoryFilter;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q || (
          (n.title || '').toLowerCase().includes(q) ||
          (n.message || '').toLowerCase().includes(q)
        );
        return matchesTab && matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [notifications, activeTab, categoryFilter, searchQuery, sortBy]);

  // Helper icon for notification category
  const renderCategoryIcon = (category) => {
    switch (category) {
      case 'security':
        return <Shield size={18} color="#d97706" />;
      case 'inventory':
        return <Package size={18} color="#0284c7" />;
      case 'orders':
        return <FileText size={18} color="#16a34a" />;
      default:
        return <Bell size={18} color="#ea580c" />;
    }
  };

  return (
    <div style={{ padding: '1.25rem 0', maxWidth: '1350px', margin: '0 auto' }}>
      {/* Header Container */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            backgroundColor: '#fff7ed',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(234, 88, 12, 0.15)'
          }}>
            <Bell size={26} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
              Notifications Center
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
              View, search, and manage your recent activity alerts.
            </p>
          </div>
        </div>

        <button
          onClick={handleMarkAllRead}
          disabled={actionLoading || unreadCount === 0}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            border: '1px solid #d97706',
            backgroundColor: '#ffffff',
            color: unreadCount === 0 ? '#94a3b8' : '#b45309',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: unreadCount === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: unreadCount === 0 ? 0.6 : 1,
            transition: 'all 0.15s ease'
          }}
        >
          <Check size={16} />
          <span>Mark all as read</span>
        </button>
      </div>

      {/* Filters and Search Bar Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Left Filter Pill Tabs */}
        <div style={{
          backgroundColor: '#f1f5f9',
          borderRadius: '12px',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '0.5rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'all' ? '#8b5a2b' : 'transparent',
              color: activeTab === 'all' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>All</span>
            <span style={{
              fontSize: '0.72rem',
              padding: '2px 7px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'all' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
              color: activeTab === 'all' ? '#ffffff' : '#64748b'
            }}>
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('unread')}
            style={{
              padding: '0.5rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'unread' ? '#8b5a2b' : 'transparent',
              color: activeTab === 'unread' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Unread</span>
            <span style={{
              fontSize: '0.72rem',
              padding: '2px 7px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'unread' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
              color: activeTab === 'unread' ? '#ffffff' : '#64748b'
            }}>
              {unreadCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('read')}
            style={{
              padding: '0.5rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'read' ? '#8b5a2b' : 'transparent',
              color: activeTab === 'read' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Read</span>
            <span style={{
              fontSize: '0.72rem',
              padding: '2px 7px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'read' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
              color: activeTab === 'read' ? '#ffffff' : '#64748b'
            }}>
              {readCount}
            </span>
          </button>
        </div>

        {/* Right Search Input and Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.3rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} color="#64748b" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="all">All Categories</option>
              <option value="security">Security & Logins</option>
              <option value="inventory">Store & Stock</option>
              <option value="orders">Purchase & Orders</option>
              <option value="system">System Alerts</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4 KPI Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Total Notifications */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#fef3c7',
            color: '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bell size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Total Notifications</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{totalCount}</div>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>All time</span>
          </div>
        </div>

        {/* Unread */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#fff7ed',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Mail size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Unread</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{unreadCount}</div>
            <span style={{ fontSize: '0.74rem', color: '#ea580c', fontWeight: 600 }}>Requires attention</span>
          </div>
        </div>

        {/* Read */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#dcfce7',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Read</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{readCount}</div>
            <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 600 }}>Marked as read</span>
          </div>
        </div>

        {/* Today */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#f3e8ff',
            color: '#9333ea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Calendar size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Today</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{todayCount}</div>
            <span style={{ fontSize: '0.74rem', color: '#9333ea', fontWeight: 600 }}>New alerts</span>
          </div>
        </div>
      </div>

      {/* Recent Notifications List Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {/* Card Top Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            Recent Notifications
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Sort by:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>

        {/* List Content */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
            <span>Loading notifications...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
            <Bell size={40} color="#cbd5e1" style={{ margin: '0 auto 0.75rem auto' }} />
            <h4 style={{ margin: 0, fontSize: '1rem', color: '#475569', fontWeight: 700 }}>No notifications found</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              You don't have any activity alerts matching your filters.
            </p>
          </div>
        ) : (
          <div>
            {filteredNotifications.map((n, idx) => (
              <div
                key={n.id || idx}
                onClick={() => handleNotificationClick(n)}
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: idx === filteredNotifications.length - 1 ? 'none' : '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  cursor: 'pointer',
                  backgroundColor: n.is_read ? '#ffffff' : '#fffaf5',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {/* Left Side: Category Icon + Content */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1 }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: n.category === 'security' ? '#fff7ed' : n.category === 'inventory' ? '#f0f9ff' : '#f0fdf4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    {renderCategoryIcon(n.category)}
                  </div>

                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                      {n.title || 'Notification'}
                    </h4>
                    <p style={{
                      margin: '3px 0 0 0',
                      fontSize: '0.82rem',
                      color: '#64748b',
                      whiteSpace: 'pre-line',
                      lineHeight: 1.45
                    }}>
                      {n.message}
                    </p>
                  </div>
                </div>

                {/* Right Side: Status Badge + Timestamp + Action Menu */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  {/* Status Badge Pill */}
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    backgroundColor: n.is_read ? '#e2e8f0' : '#ffedd5',
                    color: n.is_read ? '#475569' : '#c2410c'
                  }}>
                    {n.is_read ? 'Read' : 'New'}
                  </span>

                  {/* Date / Time */}
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500, minWidth: '100px', textAlign: 'right' }}>
                    {n.created_at_formatted || n.time_ago}
                  </span>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteNotification(e, n.id)}
                    title="Delete notification"
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>

                  <button
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
