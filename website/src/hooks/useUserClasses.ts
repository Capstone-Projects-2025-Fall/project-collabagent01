import { useEffect, useState } from "react";
import { StudentStatus, UserClass } from "../api/types/user";
import { useAuth } from "./useAuth";
import { getUserClasses } from "../api/user";
import { supabase } from "../supabaseClient";

/**
 * UserClassInfo interface represents the structure of user class information.
 * It contains the user class and the student's status in that class.
 */
export interface UserClassInfo {
  userClass: UserClass;
  studentStatus: StudentStatus;
}

/**
 * Custom hook to fetch user classes based on user ID or authenticated user.
 * @param {string} userID - Optional user ID to fetch specific user classes.
 * @returns {Object} - Contains classes, loading state, error message, and selected class information.
 */
export const useUserClasses = (userID?: string | null) => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<UserClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClassType, setSelectedClassType] = useState<
    "all" | "class" | "non-class"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUserId = userID ?? user?.id;
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    const fetchClasses = async () => {
      try {
        const { data, error } = await getUserClasses(currentUserId);
        if (error) {
          setError(error);
          return;
        }
        setClasses(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [userID, user?.id]);

  const specialClasses = [
    {
      id: "all",
      classTitle: "All",
      classCode: "",
      classHexColor: "#e5e5e5",
    },
    {
      id: "non-class",
      classTitle: "Non-class Activities",
      classCode: "",
      classHexColor: "#404040",
    },
  ];

  const modifiedClasses = [
    specialClasses[0],
    ...classes.map((c) => c.userClass),
    specialClasses[1],
  ];

  const handleClassSelect = (selection: {
    id: string | null;
    type: "all" | "class" | "non-class";
  }) => {
    setSelectedClassId(
      selection.type === "class" ? selection.id : selection.type
    );
    setSelectedClassType(selection.type);
  };

  const selectedClass =
    selectedClassType === "class"
      ? classes.find((c) => c.userClass.id === selectedClassId) || null
      : {
          userClass: specialClasses.find((c) => c.id === selectedClassType)!,
          studentStatus: null,
        };

  return {
    classes: modifiedClasses,
    originalClasses: classes,
    selectedClassId:
      selectedClassType === "class" ? selectedClassId : selectedClassType,
    selectedClassType,
    selectedClass,
    loading,
    error,
    handleClassSelect,
  };
};

export const useUserClassStatus = (
  studentId: string | null,
  classId: string | null
) => {
  const [studentStatus, setStudentStatus] = useState<StudentStatus | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!studentId || !classId) return;

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("class_users")
        .select("user_class_status")
        .eq("student_id", studentId)
        .eq("class_id", classId)
        .single();

      if (error && error.code !== "PGRST116") {
        setError(error.message);
      }

      setStudentStatus(data?.user_class_status || null);
      setLoading(false);
    };

    fetchStatus();
  }, [studentId, classId]);

  return { studentStatus, loading, error };
};
