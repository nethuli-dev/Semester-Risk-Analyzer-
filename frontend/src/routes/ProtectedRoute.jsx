import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';

export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Spinner className="h-screen" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
