import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import Profile from './pages/dashboard/Profile';
import Messages from './pages/dashboard/Messages';
import AdminUsers from './pages/dashboard/admin/AdminUsers';
import AdminVendors from './pages/dashboard/admin/AdminVendors';
import AdminProducts from './pages/dashboard/admin/AdminProducts';
import AdminOrders from './pages/dashboard/admin/AdminOrders';
import AdminPayments from './pages/dashboard/admin/AdminPayments';
import AdminDeliveries from './pages/dashboard/admin/AdminDeliveries';
import AdminCoupons from './pages/dashboard/admin/AdminCoupons';
import AdminTickets from './pages/dashboard/admin/AdminTickets';
import AdminAnalytics from './pages/dashboard/admin/AdminAnalytics';
import AdminAuditLogs from './pages/dashboard/admin/AdminAuditLogs';
import AdminSettings from './pages/dashboard/admin/AdminSettings';
import AdminRoles from './pages/dashboard/admin/AdminRoles';
import AdminRepairs from './pages/dashboard/admin/AdminRepairs';
import AdminReturns from './pages/dashboard/admin/AdminReturns';
import VendorOrders from './pages/dashboard/vendor/VendorOrders';
import VendorProducts from './pages/dashboard/vendor/VendorProducts';
import VendorStock from './pages/dashboard/vendor/VendorStock';
import VendorWarranties from './pages/dashboard/vendor/VendorWarranties';
import VendorReturns from './pages/dashboard/vendor/VendorReturns';
import VendorPayments from './pages/dashboard/vendor/VendorPayments';
import CustomerOrders from './pages/dashboard/customer/CustomerOrders';
import CustomerRepairs from './pages/dashboard/customer/CustomerRepairs';
import CustomerTickets from './pages/dashboard/customer/CustomerTickets';
import CustomerPayments from './pages/dashboard/customer/CustomerPayments';
import Notifications from './pages/dashboard/Notifications';
import Wishlist from './pages/dashboard/Wishlist';
import Warranties from './pages/dashboard/Warranties';
import Returns from './pages/dashboard/Returns';
import Addresses from './pages/dashboard/Addresses';
import PaymentCallback from './pages/PaymentCallback';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import { useAuth } from './context/AuthContext';
import './index.css';

const PublicLayout = () => (<><Navbar /><Outlet /><Footer /></>);

// Wraps a route element with a permission check — redirects to /dashboard if denied
const Perm = ({ module, action = 'view', children }) => {
  const { user, can } = useAuth();
  if (!user) return null;
  if (user.role_id === 1) return children; // admin always allowed
  if (!can(module, action)) return <Navigate to="/dashboard" replace />;
  return children;
};

const PaymentsRouter = () => {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role_id === 1) return <AdminPayments />;
  return <CustomerPayments />;
};

const TicketsRouter = () => {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role_id === 1 || user.role_id === 4) return <AdminTickets />;
  return <CustomerTickets />;
};

const RepairsRouter = () => {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role_id === 1 || user.role_id === 4) return <AdminRepairs />;
  return <CustomerRepairs />;
};

const ReturnsRouter = () => {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role_id === 1 || user.role_id === 4) return <AdminReturns />;
  return <Returns />;
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Navigate to="/products" replace />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/payment/callback" element={<PaymentCallback />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/products" replace />} />
        </Route>

        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DashboardHome />} />
          <Route path="profile"   element={<Profile />} />
          <Route path="messages"  element={<Perm module="messages"><Messages /></Perm>} />
          <Route path="notifications" element={<Perm module="notifications"><Notifications /></Perm>} />
          <Route path="addresses" element={<Addresses />} />
          <Route path="wishlist"  element={<Wishlist />} />

          {/* Permission-gated routes */}
          <Route path="users"      element={<Perm module="users"><AdminUsers /></Perm>} />
          <Route path="vendors"    element={<Perm module="vendors"><AdminVendors /></Perm>} />
          <Route path="products"   element={<Perm module="products"><AdminProducts /></Perm>} />
          <Route path="orders"     element={<Perm module="orders"><AdminOrders /></Perm>} />
          <Route path="payments"   element={<Perm module="payments"><PaymentsRouter /></Perm>} />
          <Route path="deliveries" element={<Perm module="deliveries"><AdminDeliveries /></Perm>} />
          <Route path="repairs"    element={<Perm module="repairs"><RepairsRouter /></Perm>} />
          <Route path="tickets"    element={<Perm module="tickets"><TicketsRouter /></Perm>} />
          <Route path="coupons"    element={<Perm module="coupons"><AdminCoupons /></Perm>} />
          <Route path="analytics"  element={<Perm module="analytics"><AdminAnalytics /></Perm>} />
          <Route path="audit"      element={<Perm module="audit"><AdminAuditLogs /></Perm>} />
          <Route path="settings"   element={<Perm module="settings"><AdminSettings /></Perm>} />
          <Route path="roles"      element={<Perm module="settings"><AdminRoles /></Perm>} />
          <Route path="warranties" element={<Perm module="warranties"><Warranties /></Perm>} />
          <Route path="returns"    element={<Perm module="returns"><ReturnsRouter /></Perm>} />
          <Route path="my-orders"  element={<Perm module="orders"><CustomerOrders /></Perm>} />

          {/* Vendor sub-routes */}
          <Route path="vendor/products"   element={<Perm module="products"><VendorProducts /></Perm>} />
          <Route path="vendor/stock"      element={<Perm module="products"><VendorStock /></Perm>} />
          <Route path="vendor/orders"     element={<Perm module="orders"><VendorOrders /></Perm>} />
          <Route path="vendor/payments"   element={<Perm module="payments"><VendorPayments /></Perm>} />
          <Route path="vendor/warranties" element={<Perm module="warranties"><VendorWarranties /></Perm>} />
          <Route path="vendor/returns"    element={<Perm module="returns"><VendorReturns /></Perm>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
