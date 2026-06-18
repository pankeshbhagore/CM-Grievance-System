import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import {
  LayoutDashboard, FileText, MapPin, Users, Building2,
  ClipboardList, ShieldAlert, LogOut, Menu, Bell,
  AlertTriangle, Car, User as UserIcon, Sun, Moon, Command
} from 'lucide-react';

const NAV = {
  cm: [
    { to: '/cm-dashboard', label: 'CM Dashboard', icon: LayoutDashboard },
    { to: '/complaints', label: 'All Complaints', icon: FileText },
    { to: '/map', label: 'Grievance Map', icon: MapPin },
    { to: '/officers', label: 'Officers', icon: Users },
    { to: '/visits', label: 'Visit Logs', icon: Car },
    { to: '/audit', label: 'Audit & Integrity', icon: ShieldAlert },
  ],
  super_admin: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/complaints', label: 'All Complaints', icon: FileText },
    { to: '/map', label: 'Grievance Map', icon: MapPin },
    { to: '/officers', label: 'Officers', icon: Users },
    { to: '/users', label: 'User Management', icon: UserIcon },
    { to: '/departments', label: 'Departments', icon: Building2 },
    { to: '/visits', label: 'Visit Logs', icon: Car },
    { to: '/audit', label: 'Audit & Integrity', icon: ShieldAlert },
  ],
  department_head: [
    { to: '/my-complaints', label: 'My Dashboard', icon: LayoutDashboard },
    { to: '/complaints', label: 'All Complaints', icon: FileText },
    { to: '/officers', label: 'Officers', icon: Users },
    { to: '/map', label: 'Grievance Map', icon: MapPin },
  ],
  employee: [
    { to: '/my-complaints', label: 'My Tasks', icon: ClipboardList },
    { to: '/complaints', label: 'View Complaints', icon: FileText },
    { to: '/map', label: 'Map View', icon: MapPin },
  ],
  citizen: [
    { to: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { to: '/complaints/new', label: 'Submit Complaint', icon: FileText },
    { to: '/complaints', label: 'My Complaints', icon: ClipboardList },
    { to: '/map', label: 'Area Map', icon: MapPin },
  ]
};

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const { unreadCount, setUnreadCount } = useSocket();
  const navigate = useNavigate();
  const ref = useRef(null);

  const fetchNotifications = () => {
    setLoading(true);
    getNotifications({ limit: 20 })
      .then(({ data }) => { setNotifications(data.notifications); setUnreadCount(data.unreadCount); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(); }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => { setOpen((o) => !o); if (!open) fetchNotifications(); };

  const handleClick = async (n) => {
    if (!n.isRead) {
      await markNotificationRead(n._id);
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.complaint?._id) navigate(`/complaints/${n.complaint._id}`);
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((ns) => ns.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="dropdown" ref={ref}>
      <button className="btn btn-icon" style={{ background: 'var(--card-hover)', border: '1px solid var(--border)', position: 'relative' }} onClick={handleOpen}>
        <Bell size={16} />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--danger)', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="dropdown-menu">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 13 }}>Notifications</strong>
            {unreadCount > 0 && <button onClick={handleMarkAll} style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>}
          </div>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto', width: 20, height: 20 }} /></div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No notifications yet</div>
          ) : notifications.map((n) => (
            <div key={n._id} className="dropdown-item" onClick={() => handleClick(n)} style={{ background: n.isRead ? 'transparent' : 'var(--badge-assigned-bg)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{n.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.message}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { criticalAlerts } = useSocket();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform || navigator.userAgent);

  const navItems = NAV[user?.role] || NAV.citizen;
  const handleLogout = () => { logout(); navigate('/login'); };

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <div className="app-layout">
      {sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #ff6b35, #ffaa00)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏛️</div>
            <div>
              <div className="sidebar-logo-title">CM Grievance</div>
              <div className="sidebar-logo-sub">Delhi Government</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: '8px 0' }}>
          <div className="sidebar-section">Navigation</div>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
          <div className="sidebar-section" style={{ marginTop: 12 }}>Account</div>
          <NavLink to="/profile" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <UserIcon size={16} /> My Profile
          </NavLink>
        </div>

        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ padding: '10px 16px', marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</div>
          </div>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', border: 'none', cursor: 'pointer', background: 'none', color: 'rgba(255,255,255,0.7)' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="header">
          <button className="btn btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: 'none' }} id="mob-menu">
            <Menu size={20} />
          </button>
          <div style={{ flex: 1 }} />

          <button className="kbd-chip" onClick={openCommandPalette} id="quick-search-chip" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Command size={12} /> Quick search <span className="cmdk-kbd">{isMac ? '⌘' : 'Ctrl'} K</span>
          </button>

          {criticalAlerts.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--badge-critical-bg)', border: '1px solid var(--badge-critical-border)', padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}
              onClick={() => navigate('/complaints?priority=critical')}>
              <AlertTriangle size={14} color="var(--badge-critical-fg)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--badge-critical-fg)' }}>{criticalAlerts.length} Critical</span>
            </div>
          )}

          <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Toggle theme">
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <NotificationBell />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--card-hover)', padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer' }}
            onClick={() => navigate('/profile')} id="profile-chip">
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>
              {user?.name?.charAt(0)}
            </div>
            <div className="profile-chip-text">
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
        </header>

        <div className="page-content"><Outlet /></div>
      </div>

      <style>{`
        @media (max-width: 768px) { #mob-menu { display: flex !important; } #quick-search-chip { display: none !important; } .profile-chip-text { display: none; } }
        @media (max-width: 480px) { #profile-chip { padding: 6px 10px; } }
      `}</style>
    </div>
  );
}
