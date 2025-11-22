// components/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import loginService from "../api/loginService";

const ProtectedRoute = () => {
  const isAuthenticated = loginService.isAuthenticated();
  const user = loginService.getUserDetails(); // should return the user object from localStorage
  const location = useLocation();

  const restrictedForStudents = [
    "/dashboard",
    "/main-dashboard",
    "/subjects",
    "/teachers",
  ];

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const userRole = user?.role?.toLowerCase(); // normalize casing

  if (
    userRole === "student" &&
    restrictedForStudents.includes(location.pathname)
  ) {
    alert("Unauthorized access.");
    return <Navigate to="/students" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
