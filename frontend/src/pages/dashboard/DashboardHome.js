import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/helpers';
import AdminHome    from './admin/AdminHome';
import VendorHome   from './vendor/VendorHome';
import CustomerHome from './customer/CustomerHome';
import DeliveryHome from './delivery/DeliveryHome';
import SupportHome  from './support/SupportHome';

const DashboardHome = () => {
  const { user } = useAuth();
  switch (user?.role_id) {
    case ROLES.ADMIN:    return <AdminHome />;
    case ROLES.VENDOR:   return <VendorHome />;
    case ROLES.CUSTOMER: return <CustomerHome />;
    case ROLES.DELIVERY: return <DeliveryHome />;
    case ROLES.SUPPORT:  return <SupportHome />;
    default: return <div className="page-header"><h1>Dashboard</h1></div>;
  }
};

export default DashboardHome;
