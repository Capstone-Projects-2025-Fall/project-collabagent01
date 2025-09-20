import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./useAuth";
import { UserClass, UserData } from "../api/types/user";
import { getClassesByInstructor } from "../api/classes";
import { supabase } from "../supabaseClient";

/**
 * Custom hook to fetch instructor classes based on user ID or authenticated user.
 * @param {string} userID - Optional user ID to fetch specific instructor classes.
 * @returns {Object} - Contains classes, loading state, error message, and selected class information.
 */
export const useInstructorClasses = (userID?: string | null) => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<UserClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClassType, setSelectedClassType] = useState<
    "all" | "class" | "non-class"
  >("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modifiedClasses = useMemo(
    () => [
      {
        id: "all",
        classTitle: "All",
        classCode: "",
        classHexColor: "#e5e5e5",
      },
      ...classes,
    ],
    [classes]
  );

  const selectedClass = useMemo(
    () => modifiedClasses.find((c) => c.id === selectedClassId),
    [modifiedClasses, selectedClassId]
  );

  useEffect(() => {
    const currentUserId = userID ?? user?.id;
    if (!currentUserId) return;

    const fetchClasses = async () => {
      if (!user?.id) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await getClassesByInstructor(currentUserId);

        if (error) {
          setError(error);
          return;
        }
        console.log("Fetched Classes:", data);

        setClasses(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [userID, user?.id]);

  const handleClassSelect = useCallback(
    (selection: { id: string | null; type: "all" | "class" | "non-class" }) => {
      setSelectedClassId(
        selection.type === "class" ? selection.id : selection.type
      );
      setSelectedClassType(selection.type);
    },
    []
  );

  return useMemo(
    () => ({
      classes: modifiedClasses,
      originalClasses: classes,
      selectedClassId:
        selectedClassType === "class" ? selectedClassId : selectedClassType,
      selectedClassType,
      loading,
      error,
      handleClassSelect,
      getSelectedClass: () => selectedClass,
    }),
    [
      modifiedClasses,
      classes,
      selectedClassId,
      selectedClassType,
      loading,
      error,
      handleClassSelect,
      selectedClass,
    ]
  );
};

/**
 * Custom hook to fetch students enrolled and waitlisted in a class.
 * @param classId - The ID of the class to fetch students for.
 * @returns {Object} - Contains enrolled and waitlisted students, loading state, error message, and refetch function.
 */
export const useClassStudentsInfo = (classId: string | null) => {
  const [enrolledStudents, setEnrolledStudents] = useState<UserData[]>([]);
  const [waitlistedStudents, setWaitlistedStudents] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(false);

  const fetchClassStudentsInfo = useCallback(async () => {
    if (!classId) return;

    setLoading(true);
    setError(null);

    try {
      const { data: enrolledData, error: enrolledError } = await supabase
        .from("class_users")
        .select("student_id")
        .eq("class_id", classId)
        .eq("enrollment_status", "ENROLLED");

      if (enrolledError) throw enrolledError;

      const enrolledUserIds =
        enrolledData?.map((item) => item.student_id) || [];

      const { data: enrolledUsers, error: enrolledUsersError } = await supabase
        .from("users")
        .select("*")
        .in("id", enrolledUserIds);

      if (enrolledUsersError) throw enrolledUsersError;

      const normalizedEnrolled = (enrolledUsers || []).map((user) => ({
        ...user,
        firstName: user.first_name,
        lastName: user.last_name,
      }));

      setEnrolledStudents(normalizedEnrolled);

      const { data: waitlistedData, error: waitlistedError } = await supabase
        .from("class_users")
        .select("student_id")
        .eq("class_id", classId)
        .eq("enrollment_status", "WAITLISTED");

      if (waitlistedError) throw waitlistedError;

      const waitlistedUserIds =
        waitlistedData?.map((item) => item.student_id) || [];

      const { data: waitlistedUsers, error: waitlistedUsersError } =
        await supabase.from("users").select("*").in("id", waitlistedUserIds);

      if (waitlistedUsersError) throw waitlistedUsersError;

      const normalizedWaitlisted = (waitlistedUsers || []).map((user) => ({
        ...user,
        firstName: user.first_name,
        lastName: user.last_name,
      }));

      setWaitlistedStudents(normalizedWaitlisted);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        console.error(err.message);
      } else {
        setError("Unknown error occurred");
        console.error("Unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchClassStudentsInfo();
  }, [classId, fetchClassStudentsInfo, refreshFlag]);

  const refetch = useCallback(() => {
    setRefreshFlag((prev) => !prev);
  }, []);

  return {
    enrolledStudents,
    waitlistedStudents,
    totalStudents: enrolledStudents.length,
    loading,
    error,
    refetch,
  };
};
