import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

/**
 * AuthCallback component handles the authentication callback from Supabase.
 * @returns {JSX.Element} - A React component that handles the authentication callback from Supabase.
 */
export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const access_token = urlParams.get("access_token");
      const refresh_token = urlParams.get("refresh_token");

      if (!access_token || !refresh_token) {
        console.error("Missing authentication tokens.");
        navigate("/login");
        return;
      }

      try {
        // Store session in Supabase
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          throw new Error(error.message);
        }

        navigate("/dashboard"); // Redirect after login
      } catch (err) {
        console.error("Auth error:", err);
        navigate("/login"); // Redirect to login on failure
      }
    };

    handleAuthRedirect();
  }, [navigate]);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
      <p>Processing login...</p>
    </div>
  );
};

export default AuthCallback;
