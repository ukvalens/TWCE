import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, PATH_TO_MODULE } from '../../context/AuthContext';
import { ROLES, getRoleName } from '../../utils/helpers';
import api from '../../utils/api';
import {
  LayoutDashboard, ShoppingBag, Heart, Bell, MessageSquare,
  Ticket, Gift, User, MapPin, Settings, LogOut, Package, Users,
  Store, Tag, BarChart2, Shield, FileText, Wrench, Truck,
  ChevronLeft, ChevronRight, Monitor, RotateCcw, Headphones, CreditCard, KeyRound, PackagePlus
} from 'lucide-react';
import './Dashboard.css';

const menuByRole = {
  [ROLES.ADMIN]: [
    { label: 'Dashboard',      path: '',               icon: <LayoutDashboard size={18} /> },
    { label: 'Users',          path: 'users',          icon: <Users size={18} /> },
    { label: 'Vendors',        path: 'vendors',        icon: <Store size={18} /> },
    { label: 'Products',       path: 'products',       icon: <Package size={18} /> },
    { label: 'Orders',         path: 'orders',         icon: <ShoppingBag size={18} /> },
    { label: 'Payments',       path: 'payments',       icon: <Gift size={18} /> },
    { label: 'Deliveries',     path: 'deliveries',     icon: <Truck size={18} /> },
    { label: 'Repairs',        path: 'repairs',        icon: <Wrench size={18} /> },
    { label: 'Returns',        path: 'returns',        icon: <RotateCcw size={18} /> },
    { label: 'Coupons',        path: 'coupons',        icon: <Tag size={18} /> },
    { label: 'Tickets',        path: 'tickets',        icon: <Ticket size={18} /> },
    { label: 'Analytics',      path: 'analytics',      icon: <BarChart2 size={18} /> },
    { label: 'Audit Logs',     path: 'audit',          icon: <Shield size={18} /> },
    { label: 'Notifications',  path: 'notifications',  icon: <Bell size={18} /> },
    { label: 'Settings',       path: 'settings',       icon: <Settings size={18} /> },
  ],
  [ROLES.VENDOR]: [
    { label: 'Dashboard',      path: '',                  icon: <LayoutDashboard size={18} /> },
    { label: 'My Products',    path: 'vendor/products',   icon: <Package size={18} /> },
    { label: 'Stock',          path: 'vendor/stock',      icon: <PackagePlus size={18} /> },
    { label: 'Orders',         path: 'vendor/orders',     icon: <ShoppingBag size={18} /> },
    { label: 'Payments',       path: 'vendor/payments',   icon: <Gift size={18} /> },
    { label: 'Warranties',     path: 'vendor/warranties', icon: <FileText size={18} /> },
    { label: 'Returns',        path: 'vendor/returns',    icon: <RotateCcw size={18} /> },
    { label: 'Messages',       path: 'messages',          icon: <MessageSquare size={18} /> },
    { label: 'Analytics',      path: 'analytics',         icon: <BarChart2 size={18} /> },
    { label: 'Deliveries',     path: 'deliveries',        icon: <Truck size={18} /> },
    { label: 'Notifications',  path: 'notifications',     icon: <Bell size={18} /> },
  ],
  [ROLES.CUSTOMER]: [
    { label: 'Dashboard',      path: '',               icon: <LayoutDashboard size={18} /> },
    { label: 'My Orders',      path: 'my-orders',      icon: <ShoppingBag size={18} /> },
    { label: 'Payments',       path: 'payments',       icon: <CreditCard size={18} /> },
    { label: 'Messages',       path: 'messages',       icon: <MessageSquare size={18} /> },
    { label: 'Wishlist',       path: 'wishlist',       icon: <Heart size={18} /> },
    { label: 'Warranties',     path: 'warranties',     icon: <FileText size={18} /> },
    { label: 'Repairs',        path: 'repairs',        icon: <Wrench size={18} /> },
    { label: 'Returns',        path: 'returns',        icon: <RotateCcw size={18} /> },
    { label: 'Tickets',        path: 'tickets',        icon: <Ticket size={18} /> },
    { label: 'Notifications',  path: 'notifications',  icon: <Bell size={18} /> },
    { label: 'Addresses',      path: 'addresses',      icon: <MapPin size={18} /> },
  ],
  [ROLES.SUPPORT]: [
    { label: 'Dashboard',      path: '',               icon: <LayoutDashboard size={18} /> },
    { label: 'Tickets',        path: 'tickets',        icon: <Ticket size={18} /> },
    { label: 'Repairs',        path: 'repairs',        icon: <Wrench size={18} /> },
    { label: 'Returns',        path: 'returns',        icon: <RotateCcw size={18} /> },
    { label: 'Messages',       path: 'messages',       icon: <MessageSquare size={18} /> },
    { label: 'Notifications',  path: 'notifications',  icon: <Bell size={18} /> },
  ],
  [ROLES.DELIVERY]: [
    { label: 'Dashboard',      path: '',               icon: <LayoutDashboard size={18} /> },
    { label: 'My Deliveries',  path: 'deliveries',     icon: <Truck size={18} /> },
    { label: 'Messages',       path: 'messages',       icon: <MessageSquare size={18} /> },
    { label: 'Notifications',  path: 'notifications',  icon: <Bell size={18} /> },
  ],
};

// Paths that are always visible regardless of permissions
const ALWAYS_VISIBLE = ['', 'profile', 'addresses', 'wishlist'];

const DashboardLayout = () => {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs]     = useState(0);

  // Admin always sees full menu; other roles filtered by saved permissions
  const rawMenu = menuByRole[user?.role_id] || [];
  const menu = user?.role_id === 1
    ? rawMenu
    : rawMenu.filter(item => {
        if (ALWAYS_VISIBLE.includes(item.path)) return true;
        const mod = PATH_TO_MODULE[item.path];
        if (!mod) return true;
        return can(mod, 'view');
      });

  useEffect(() => {
    const fetchCounts = () => {
      api.get('/communications/notifications').then(r => {
        setUnreadNotifs((r.data || []).filter(n => !n.is_read).length);
      }).catch(() => {});
      api.get('/communications/messages/unread-count').then(r => {
        setUnreadMsgs(r.data.count || 0);
      }).catch(() => {});
    };
    fetchCounts();
    const id = setInterval(fetchCounts, 30000);
    return () => clearInterval(id);
  }, []);

  const handleNotifClick = () => {
    api.put('/communications/notifications/read-all').catch(() => {});
    setUnreadNotifs(0);
  };

  const handleMsgClick = () => setUnreadMsgs(0);
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className={`dash-layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="dash-sidebar">
        <div className="dash-sidebar-header">
          <div className="dash-logo">
            <Monitor size={22} />
            {!collapsed && <span>TWCE</span>}
          </div>
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <div className="dash-user-info">
          <div className="dash-avatar">{user?.full_name?.[0]?.toUpperCase()}</div>
          {!collapsed && (
            <div className="dash-user-text">
              <strong>{user?.full_name}</strong>
              <span className="role-tag">{getRoleName(user?.role_id)}</span>
            </div>
          )}
        </div>

        <nav className="dash-nav">
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path === '' ? '/dashboard' : `/dashboard/${item.path}`}
              end={item.path === ''}
              className={({ isActive }) => `dash-nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : ''}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          <NavLink to="/dashboard/profile" className="dash-nav-item" title={collapsed ? 'Profile' : ''}>
            <User size={18} />{!collapsed && <span>Profile</span>}
          </NavLink>
          <button className="dash-nav-item logout-btn" onClick={handleLogout} title={collapsed ? 'Logout' : ''}>
            <LogOut size={18} />{!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="dash-main">
        <div className="dash-topbar">
          <div className="dash-breadcrumb">
            <Headphones size={16} />
            <span>Welcome, <strong>{user?.full_name}</strong></span>
          </div>
          <div className="dash-topbar-actions">
            <NavLink to="/dashboard/notifications" className="icon-btn-dash" onClick={handleNotifClick} style={{ position: 'relative' }}>
              <Bell size={18} />
              {unreadNotifs > 0 && <span style={{ position:'absolute', top:-4, right:-4, background:'#e63946', color:'#fff', borderRadius:'50%', fontSize:10, fontWeight:700, minWidth:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>{unreadNotifs}</span>}
            </NavLink>
            <NavLink to="/dashboard/messages" className="icon-btn-dash" onClick={handleMsgClick} style={{ position: 'relative' }}>
              <MessageSquare size={18} />
              {unreadMsgs > 0 && <span style={{ position:'absolute', top:-4, right:-4, background:'#0077B6', color:'#fff', borderRadius:'50%', fontSize:10, fontWeight:700, minWidth:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>{unreadMsgs}</span>}
            </NavLink>
            <NavLink to="/products" className="btn btn-outline btn-sm">← Store</NavLink>
          </div>
        </div>
        <div className="dash-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
