import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { AUTH_ENDPOINT } from "../api/endpoints";
import { Eye, EyeOff } from "lucide-react";

/**
 * LoginForm component for user authentication.
 * It allows users to log in using email and password or GitHub OAuth.
 * @returns LoginForm component for user authentication.
 */
export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  // Handle GitHub Login
  const handleGitHubLogin = async () => {
    try {
      window.location.href = `${AUTH_ENDPOINT}/login?provider=github&next=https://clover.nickrucinski.com/auth`; // Redirect user to GitHub OAuth
      // window.location.href = `${AUTH_ENDPOINT}/login?provider=github&next=http://localhost:5173/auth`; // Redirect user to GitHub OAuth
    } catch (err) {
      setError("An error occurred while attempting GitHub login." + err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError("Invalid email or password.");
        return;
      }

      if (!data.user) {
        navigate("/signup");
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to log in. Please try again.");
    }
  };

  return (
    <div className="card p-8 rounded-lg shadow-lg w-96">
      <h2 className="text-2xl font-bold text-center mb-6">Log In to CLOVER</h2>
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      {/* Email + Password Login */}
      <form onSubmit={handleLogin} className="flex flex-col">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          required
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field w-full pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-6 transform -translate-y-1/2 focus:outline-none"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-500" />
            ) : (
              <Eye className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>
        <button
          type="submit"
          className="button-primary w-full bg-[#50B498] text-black py-2 rounded hover:bg-[#468585] transition"
        >
          Log In
        </button>
      </form>

      {/* GitHub OAuth Login */}
      <button
        onClick={handleGitHubLogin}
        className="button-primary mt-4 w-full bg-gray-700 text-white dark:text-white py-2 rounded hover:bg-gray-600 transition flex items-center justify-center space-x-2"
      >
        <img
          src="https://img.icons8.com/?size=100&id=62856&format=png&color=FFFFFF"
          alt="GitHub Logo"
          className="h-5 w-5"
        />
        <span>Sign in with GitHub</span>
      </button>

      <p className="mt-4 text-center text-text">
        Don't have an account?{" "}
        <button
          onClick={() => navigate("/signup")}
          className="text-[#50B498] hover:underline"
        >
          Sign Up
        </button>
      </p>
      <p className="mt-4 text-center text-text">
        <button
          onClick={() => navigate("/passwordreset")}  
          className="text-[#50B498] hover:underline"
        >
          Forgot your password?
        </button>
      </p>
      
    </div>
  );
};

export default LoginForm;
