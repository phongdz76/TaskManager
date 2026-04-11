import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Auth Pages
import Login from "./pages/Auth/Login";
import SignUp from "./pages/Auth/SignUp";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";
import OAuthCallback from "./pages/Auth/OAuthCallback";

// Admin Pages
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminCreateTask from "./pages/Admin/CreateTask";
import AdminEditTask from "./pages/Admin/EditTask";
import ManagerTask from "./pages/Admin/ManagerTask";
import AdminViewTaskDetails from "./pages/Admin/ViewTaskDetails";
import ManagerUser from "./pages/Admin/ManagerUser";
import TeamMembers from "./pages/Admin/TeamMembers";
import AllUserTasks from "./pages/Admin/ManagerAllTasks";
import AdminProfile from "./pages/Admin/Profile";

// User Pages
import UserDashboard from "./pages/User/UserDashboard";
import UserCreateTask from "./pages/User/CreateTask";
import MyTasks from "./pages/User/MyTasks";
import ViewTaskDetails from "./pages/User/ViewTaskDetails";
import UserTeamMembers from "./pages/User/TeamMembers";
import UserProfile from "./pages/User/Profile";

// Routes
import PrivateRoute from "./routes/PrivateRoute";

// Context
import UserProvider from "./context/userContext";

export default function App() {
  return (
    <UserProvider>
      <div>
        <Toaster position="top-right" />
        <Router>
          <Routes>
            {/* Auth Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/oauth-callback" element={<OAuthCallback />} />

            {/* Admin Routes */}
            <Route element={<PrivateRoute allowedRoles={["admin"]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/create-task" element={<AdminCreateTask />} />
              <Route path="/admin/tasks/create" element={<AdminCreateTask />} />
              <Route path="/admin/tasks/edit/:id" element={<AdminEditTask />} />
              <Route
                path="/admin/task-details/:id"
                element={<AdminViewTaskDetails />}
              />
              <Route path="/admin/tasks" element={<ManagerTask />} />
              <Route path="/admin/team-members" element={<TeamMembers />} />
              <Route path="/admin/users" element={<ManagerUser />} />
              <Route path="/admin/all-user-tasks" element={<AllUserTasks />} />
              <Route path="/admin/profile" element={<AdminProfile />} />
            </Route>

            {/* User Routes */}
            <Route element={<PrivateRoute allowedRoles={["user"]} />}>
              <Route path="/user/dashboard" element={<UserDashboard />} />
              <Route path="/user/create-task" element={<UserCreateTask />} />
              <Route path="/user/tasks/edit/:id" element={<AdminEditTask />} />
              <Route path="/user/my-tasks" element={<MyTasks />} />
              <Route path="/user/team-members" element={<UserTeamMembers />} />
              <Route path="/user/profile" element={<UserProfile />} />
              <Route
                path="/user/task-details/:id"
                element={<ViewTaskDetails />}
              />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </div>
    </UserProvider>
  );
}
