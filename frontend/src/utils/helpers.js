export const ROLES = { ADMIN: 1, VENDOR: 2, CUSTOMER: 3, SUPPORT: 4, DELIVERY: 5 };

export const getRoleName = (id) =>
  ({ 1: 'Admin', 2: 'Vendor', 3: 'Customer', 4: 'Support', 5: 'Delivery' }[id] || 'Unknown');

export const formatPrice = (n) =>
  new Intl.NumberFormat('rw-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(n);

const API_BASE_URL = process.env.REACT_APP_API_URL?.replace(/\/api\/?$/, '') || '';

export const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export const imgSrc = (url) => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/${url}`;
};

export const statusBadge = (status) => {
  const map = {
    active: 'success', verified: 'success', delivered: 'success', completed: 'success', approved: 'success', paid: 'success',
    pending: 'warning', in_transit: 'warning', in_progress: 'warning', in_review: 'warning', processing: 'warning',
    banned: 'danger', rejected: 'danger', cancelled: 'danger', failed: 'danger',
    inactive: 'secondary', unpaid: 'secondary', open: 'info', confirmed: 'info', shipped: 'info',
  };
  return map[status] || 'secondary';
};
