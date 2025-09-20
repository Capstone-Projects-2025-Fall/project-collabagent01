import { useState, useEffect } from "react";
import { ClassData } from "../api/types/user";
import { getAllClasses } from "../api/classes";

export const useAllClasses = () => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      setIsLoading(true);
      setError(null);
      const { classes: fetchedClasses, error: fetchError } =
        await getAllClasses();
      if (fetchError) {
        setError(fetchError);
        setClasses([]);
      } else if (fetchedClasses) {
        setClasses(fetchedClasses);
      }
      setIsLoading(false);
    };

    fetchClasses();
  }, []);

  return { classes, isLoading, error };
};
