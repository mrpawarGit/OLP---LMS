// src/App.jsx - WITH LOADING STATE
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import AppNavbar from "./components/common/Navbar";
import ProtectedRoute from "./components/common/ProtectedRoute";
import PublicRoute from "./components/common/PublicRoute";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Assignments from "./pages/Assignments";
import CreateAssignment from "./pages/CreateAssignment";
import Lectures from "./pages/Lectures";
import CreateLecture from "./pages/CreateLecture";
import Unauthorized from "./pages/Unauthorized";
import SubmissionReview from "./pages/SubmissionReview";
import AssignmentDetail from "./pages/AssignmentDetail";

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

function AppContent() {
  const { loading } = useAuth();

  // Show loading spinner while auth is being determined
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div
            className="spinner-border text-primary mb-3"
            role="status"
            style={{ width: "3rem", height: "3rem" }}
          >
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading Videmy LMS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <AppNavbar />
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments/:id"
          element={
            <ProtectedRoute>
              <AssignmentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments"
          element={
            <ProtectedRoute>
              <Assignments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lectures"
          element={
            <ProtectedRoute>
              <Lectures />
            </ProtectedRoute>
          }
        />

        {/* Admin/Instructor Routes */}
        <Route
          path="/create-assignment"
          element={
            <ProtectedRoute requiredRoles={["admin", "instructor"]}>
              <CreateAssignment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-lecture"
          element={
            <ProtectedRoute requiredRoles={["admin", "instructor"]}>
              <CreateLecture />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments/:id/submissions"
          element={
            <ProtectedRoute requiredRoles={["admin", "instructor"]}>
              <SubmissionReview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments/:id"
          element={
            <ProtectedRoute>
              <AssignmentDetail />
            </ProtectedRoute>
          }
        />

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default App;
