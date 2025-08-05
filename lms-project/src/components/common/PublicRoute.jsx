import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function PublicRoute({ children }) {
  const { currentUser } = useAuth();

  // Show loading while auth is being determined
  if (currentUser === undefined) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // If user is already logged in, redirect to dashboard
  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  // If user is not logged in, show the public page (login/signup)
  return children;
}
