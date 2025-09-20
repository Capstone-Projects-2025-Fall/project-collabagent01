import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { UserData } from "../api/types/user";
import { getUserData } from "../api/user";

/**
 * Custom hook to fetch user data based on user ID or authenticated user.
 * @param {string} userId - Optional user ID to fetch specific user data.
 * @returns {Object} - Contains userData, loading state, and error message.
 */
export const useUserData = (userId?: string) => {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const idToFetch = userId ?? user?.id;

    if (!idToFetch) {
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        setError(null);
        const response = await getUserData(idToFetch);
        if (response.error) throw new Error(response.error);

        if (!response.data) {
          setUserData(null);
          setLoading(false);
          return;
        }

        setUserData(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchUserData, 300);
    return () => clearTimeout(debounceTimer);
  }, [userId, user]);

  return { userData, loading, error };
};
