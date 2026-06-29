import { Navigate } from 'react-router-dom';


const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('pcb_authUser'));

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;