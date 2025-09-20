import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { User } from "@supabase/supabase-js";

/**
 * Custom hook to manage authentication state using Supabase.
 * @returns { user: User | null, isAuthenticated: boolean, loading: boolean }
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setUser(data.session?.user || null);
      } catch (err) {
        console.error("Failed to get session:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    return () => listener?.subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return { user, isAuthenticated: !!user, loading };
};
