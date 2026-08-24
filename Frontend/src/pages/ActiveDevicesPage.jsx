import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Monitor, Smartphone, Shield, Search, Filter, Trash2, LogOut,
  RefreshCw, CheckCircle, Clock, AlertTriangle, UserCheck, ChevronRight, X
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Breadcrumbs from '../components/Breadcrumbs';

export default function ActiveDevicesPage() {
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('all'); // 'all' | 'desktop' | 'mobile'
  const [userFilter, setUserFilter] = useState('all');
  
  // Revoke modal state
  const [sessionToRevoke, setSessionToRevoke] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const currentSessionId = localStorage.getItem('session_id');

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/devices/');
      setSessions(res.data || []);
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const confirmRevokeSession = async () => {
    if (!sessionToRevoke) return;

    setRevoking(true);
    const targetId = sessionToRevoke.id;

    try {
      await api.post('/auth/devices/', { session_id: targetId });
      setSessions(prev => prev.filter(s => String(s.id) !== String(targetId)));
      setFeedback({ type: 'success', message: `Session for "${sessionToRevoke.device_name}" revoked successfully.` });
      
      // If user revoked current session, log out
      if (currentSessionId && String(targetId) === String(currentSessionId)) {
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 1200);
      }
    } catch (err) {
      console.error('Revoke session error:', err);
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Failed to revoke session.' });
    } finally {
      setRevoking(false);
      setSessionToRevoke(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Extract unique users list for Admin filter
  const uniqueUsers = useMemo(() => {
    const map = new Map();
    sessions.forEach(s => {
      if (s.user && !map.has(s.user)) {
        map.set(s.user, s.user_full_name || s.username);
      }
    });
    return Array.from(map.entries());
  }, [sessions]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchesDevice = deviceFilter === 'all' || s.device_type === deviceFilter;
      const matchesUser = userFilter === 'all' || String(s.user) === String(userFilter);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (s.device_name || '').toLowerCase().includes(q) ||
        (s.ip_address || '').toLowerCase().includes(q) ||
        (s.username || '').toLowerCase().includes(q) ||
        (s.user_full_name || '').toLowerCase().includes(q)
      );
      return matchesDevice && matchesUser && matchesSearch;
    });
  }, [sessions, deviceFilter, userFilter, searchQuery]);

  // KPI Calculations
  const totalSessions = sessions.length;
  const desktopCount = sessions.filter(s => s.device_type === 'desktop').length;
  const mobileCount = sessions.filter(s => s.device_type === 'mobile' || s.device_type === 'tablet').length;
  const mySessionsCount = sessions.filter(s => String(s.user) === String(user?.id)).length;

  return (
    <div style={{ padding: '1.25rem 0', maxWidth: '1350px', margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs />

      {/* Feedback Toast */}
      {feedback && (
        <div style={{
          backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: feedback.type === 'success' ? '#166534' : '#991b1b',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.88rem',
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          {feedback.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
          }}>
            <Monitor size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0f172a' }}>
              Active Device Sessions
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Monitor and manage logged-in devices across enterprise user accounts
            </p>
          </div>
        </div>

        <button
          onClick={fetchSessions}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#334155',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh List
        </button>
      </div>

      {/* 4 KPI Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Total Sessions */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '1.2rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#f0f9ff',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Monitor size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Active Sessions</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{totalSessions}</div>
            <span style={{ fontSize: '0.74rem', color: '#0284c7', fontWeight: 600 }}>Connected devices</span>
          </div>
        </div>

        {/* Desktop Devices */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '1.2rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#f0fdf4',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Monitor size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Desktop Devices</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{desktopCount}</div>
            <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 600 }}>PC & Laptops</span>
          </div>
        </div>

        {/* Mobile Devices */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '1.2rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
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
            <Smartphone size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Mobile & Tablets</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{mobileCount}</div>
            <span style={{ fontSize: '0.74rem', color: '#ea580c', fontWeight: 600 }}>Portable sessions</span>
          </div>
        </div>

        {/* My Sessions */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          padding: '1.2rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            backgroundColor: '#faf5ff',
            color: '#9333ea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserCheck size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>My Account Sessions</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{mySessionsCount}</div>
            <span style={{ fontSize: '0.74rem', color: '#9333ea', fontWeight: 600 }}>Logged in as {user?.username}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Left Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setDeviceFilter('all')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: deviceFilter === 'all' ? '#0f172a' : '#f1f5f9',
              color: deviceFilter === 'all' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            All Devices ({sessions.length})
          </button>
          <button
            onClick={() => setDeviceFilter('desktop')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: deviceFilter === 'desktop' ? '#0284c7' : '#f1f5f9',
              color: deviceFilter === 'desktop' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Monitor size={14} /> Desktop ({desktopCount})
          </button>
          <button
            onClick={() => setDeviceFilter('mobile')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: deviceFilter === 'mobile' ? '#ea580c' : '#f1f5f9',
              color: deviceFilter === 'mobile' ? '#ffffff' : '#475569',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Smartphone size={14} /> Mobile ({mobileCount})
          </button>
        </div>

        {/* Search & User Filter Inputs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isAdmin && uniqueUsers.length > 0 && (
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontSize: '0.82rem',
                fontWeight: 600
              }}
            >
              <option value="all">All Users</option>
              {uniqueUsers.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          )}

          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search IP, browser, user..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>

      {/* Active Sessions List */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            Active Sessions ({filteredSessions.length})
          </h3>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
            <span>Loading active device sessions...</span>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <Monitor size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem auto' }} />
            <h4 style={{ margin: 0, fontSize: '1rem', color: '#475569' }}>No active sessions found</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              No devices match your selected search or filter criteria.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredSessions.map((session, idx) => {
              const isCurrentSession = currentSessionId && String(session.id) === String(currentSessionId);
              return (
                <div
                  key={session.id || idx}
                  style={{
                    padding: '1.1rem 1.25rem',
                    borderBottom: idx === filteredSessions.length - 1 ? 'none' : '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    backgroundColor: isCurrentSession ? '#f0f9ff' : session.time_ago === 'Active now' ? '#faf7f5' : '#ffffff'
                  }}
                >
                  {/* Left Info: Device Icon + Browser Name + User Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: session.device_type === 'mobile' ? '#fff7ed' : '#f0f9ff',
                      color: session.device_type === 'mobile' ? '#ea580c' : '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {session.device_type === 'mobile' ? <Smartphone size={22} /> : <Monitor size={22} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                          {session.device_name || 'Browser'}
                        </span>
                        {isCurrentSession && (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #bae6fd'
                          }}>
                            This Device (Current Session)
                          </span>
                        )}
                        {session.time_ago === 'Active now' && (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                            Active Now
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                          User: {session.user_full_name || session.username}
                        </span>
                        <span style={{ fontSize: '0.76rem', padding: '1px 7px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: 700 }}>
                          {session.user_role}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          IP: {session.ip_address}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action: Timing & Revoke Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                        <Clock size={13} />
                        <span>{session.time_ago}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                        Logged in: {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <button
                      onClick={() => setSessionToRevoke(session)}
                      title="Revoke and terminate this active session"
                      style={{
                        padding: '0.5rem 0.9rem',
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <LogOut size={14} />
                      <span>Revoke Session</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Revoke Session Confirmation Modal */}
      {sessionToRevoke && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Confirm Revoke Session
                </h3>
              </div>
              <button onClick={() => setSessionToRevoke(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
              Are you sure you want to revoke the session for <strong>"{sessionToRevoke.device_name}"</strong> ({sessionToRevoke.ip_address})?
              This will log out the user account on that device immediately.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSessionToRevoke(null)}
                style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRevokeSession}
                disabled={revoking}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: revoking ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <LogOut size={16} />
                <span>{revoking ? 'Revoking...' : 'Yes, Revoke Session'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
