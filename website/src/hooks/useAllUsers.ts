import { useEffect, useState } from "react";
import { getAllUsers } from "../api/user";
import { UserData } from "../api/types/user";

/**
 * Custom hook to fetch all users.
 * @module Hooks
 * @returns { users: UserData[], isLoading: boolean, error: string | null }
 */
export const useAllUsers = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      const result = await getAllUsers();

      if (result?.error) {
        setError(result.error);
        setUsers([]);
      } else if (result?.data) {
        setUsers(result.data);
        setError(null);
      }

      setIsLoading(false);
    };

    fetchUsers();
  }, []);

  return { users, isLoading, error };
};
