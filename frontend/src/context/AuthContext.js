import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const PATH_TO_MODULE = {
  '':                  'dashboard',
  'users':             'users',
  'vendors':           'vendors',
  'products':          'products',
  'orders':            'orders',
  'my-orders':         'orders',
  'payments':          'payments',
  'deliveries':        'deliveries',
  'repairs':           'repairs',
  'tickets':           'tickets',
  'coupons':           'coupons',
  'analytics':         'analytics',
  'audit':             'audit',
  'settings':          'settings',
  'roles':             'settings',
  'messages':          'messages',
  'notifications':     'notifications',
  'warranties':        'warranties',
  'vendor/warranties': 'warranties',
  'returns':           'returns',
  'vendor/returns':    'returns',
  'vendor/products':   'products',
  'vendor/orders':     'orders',
  'vendor/payments':   'payments',
  'vendor/stock':      'products',
  'addresses':         'dashboard',
  'profile':           'dashboard',
  'wishlist':          'dashboard',
};

// Fallback defaults used when no permissions are saved yet
const DEFAULT_PERMISSIONS = {
  1: { dashboard:['view'], users:['view','create','edit','delete'], vendors:['view','create','edit','delete','approve'], products:['view','create','edit','delete','approve'], orders:['view','edit','cancel'], payments:['view','refund'], deliveries:['view','edit'], repairs:['view','create','edit'], tickets:['view','create','edit','close'], coupons:['view','create','edit','delete'], analytics:['view'], audit:['view'], settings:['view','edit'], messages:['view','send'], notifications:['view'], warranties:['view','create'], returns:['view','create','approve'] },
  2: { dashboard:['view'], products:['view','create','edit'], orders:['view'], payments:['view'], deliveries:['view'], warranties:['view','create'], returns:['view'], messages:['view','send'], notifications:['view'], analytics:['view'] },
  3: { dashboard:['view'], orders:['view','cancel'], payments:['view'], messages:['view','send'], notifications:['view'], warranties:['view','create'], repairs:['view','create'], returns:['view','create'], tickets:['view','create'] },
  4: { dashboard:['view'], tickets:['view','create','edit','close'], repairs:['view','edit'], returns:['view','approve'], messages:['view','send'], notifications:['view'] },
  5: { dashboard:['view'], deliveries:['view','edit'], messages:['view','send'], notifications:['view'] },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
  const userRef = useRef(null); // keep a ref so fetchPermissions always has latest user

  // Fetch permissions from a PUBLIC endpoint (no auth required)
  const fetchPermissions = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/permissions');
      if (data && typeof data === 'object') {
        // Normalise keys to numbers so permissions[role_id] works
        const normalised = {};
        Object.entries(data).forEach(([k, v]) => { normalised[parseInt(k)] = v; });
        setPermissions(normalised);
      }
    } catch {
      // Fall back to defaults silently
      setPermissions(DEFAULT_PERMISSIONS);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) fetchProfile();
    else setLoading(false);
    // Re-fetch permissions every 60s so live users pick up admin changes
    const id = setInterval(fetchPermissions, 60000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  const fetchProfile = async () => {
    try {
      const [profileRes] = await Promise.all([
        api.get('/users/profile'),
        fetchPermissions(),
      ]);
      userRef.current = profileRes.data;
      setUser(profileRes.data);
    } catch {
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  };

  // can(module, action) — role_id is a number, permissions keys are numbers after normalisation
  const can = useCallback((module, action = 'view') => {
    const u = userRef.current;
    if (!u) return false;
    if (u.role_id === 1) return true; // admin always allowed
    const rolePerms = permissions[u.role_id];
    if (!rolePerms) return false;
    return (rolePerms[module] || []).includes(action);
  }, [permissions]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken',  data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    userRef.current = data.user;
    setUser(data.user);
    await fetchPermissions();
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  };

  const logout = () => {
    localStorage.clear();
    userRef.current = null;
    setUser(null);
    setPermissions(DEFAULT_PERMISSIONS);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, fetchProfile, can, permissions }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
