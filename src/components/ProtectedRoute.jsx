import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('pcb_authUser'));
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') {
    return <>{children}</>;
  }

  const accessPages = user.accessPages || [];
  let currentPath = location.pathname;
  if (currentPath === '/dashboard') currentPath = '/';

  if (!accessPages.includes(currentPath)) {
    if (accessPages.length > 0) {
      return <Navigate to={accessPages[0]} replace />;
    } else {
      // User has no access to any pages
      localStorage.removeItem('pcb_authUser');
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;