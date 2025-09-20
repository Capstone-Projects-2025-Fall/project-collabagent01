import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import "./index.css";
import RootLayout from "./RootLayout";
import Dashboard from "./pages/Dashboard";
import Quiz from "./pages/Quiz";
import Landing from "./pages/Landing";
import LogIn from "./pages/LogIn";
import SignUp from "./pages/SignUp";
import About from "./pages/About";
import { useAuth } from "./hooks/useAuth";
import Download from "./pages/Download";
import Help from "./pages/Help";
import AuthCallback from "./components/AuthCallback";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import { useUserData } from "./hooks/useUserData";
import { Loader2 } from "lucide-react";
import Reset from "./pages/PasswordReset";
import PasswordCallback from "./pages/PasswordCallback";

/**
 * ProtectedRoute component that checks if the user is authenticated.
 * @returns {JSX.Element} - Renders the Outlet if authenticated, otherwise redirects to the main page.
 */
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen w-full bg-gray-900 text-white">
        Loading...
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/" />;
};

/**
 * App component that contains the main routing logic for the application.
 * @returns {JSX.Element} - The main application component.
 */
const App = () => {
  const { userData, loading } = useUserData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-10 w-10 dark:text-white" />
      </div>
    );
  }

  return (
    <main className="flex flex-col">
      <Routes>
        <Route element={<RootLayout />}>
          {/* Auth Routes */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/dashboard"
              element={<Dashboard userData={userData} loading={loading} />}
            />
            <Route path="/quiz" element={<Quiz />} />
            <Route
              path="/settings"
              element={<Settings userData={userData} />}
            />
            <Route
              path="/profile"
              element={<Profile userData={userData} loading={loading} />}
            />
          </Route>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LogIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/about" element={<About />} />
          <Route path="/download" element={<Download />} />
          <Route path="/getting-started" element={<Help />} />
          <Route path="/auth" element={<AuthCallback />} />
          <Route path="/passwordreset" element={<Reset />} />
          <Route path="/resetform" element={<PasswordCallback />} />
        </Route>
      </Routes>
    </main>
  );
};

export default App;
