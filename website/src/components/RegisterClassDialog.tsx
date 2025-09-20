import { useEffect, useState } from "react";
import { useUserData } from "../hooks/useUserData";
import { supabase } from "../supabaseClient";
import { getUserData } from "../api/user";
import { registerUserToClass } from "../api/classes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";
import { ChevronDown, ChevronUp, Loader2, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { toast } from "sonner";
import { UserClass, UserData } from "../api/types/user";

/**
 * RegisterClassDialog component allows users to search and register for classes.
 * It fetches classes based on the search term, displays them in a collapsible format,
 * and allows users to register for a selected class.
 * It also shows the instructor's details and class description
 * @returns {JSX.Element} The rendered component.
 */
export const RegisterClassDialog = () => {
  const { userData } = useUserData();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [classId, setClassId] = useState<string | null>(null);
  const [instructor, setInstructor] = useState<UserData | null>(null);

  const [enrollmentStatus, setEnrollmentStatus] = useState<
    Record<string, string>
  >({});
  const [enrollmentStatusLoading, setEnrollmentStatusLoading] = useState(true);
  const [registerLoading, setRegisterLoading] = useState(false);

  useEffect(() => {
    const checkEnrollmentStatus = async () => {
      if (!userData?.id || results.length === 0) return;

      setEnrollmentStatusLoading(true);
      try {
        const { data } = await supabase
          .from("class_users")
          .select("class_id, enrollment_status")
          .eq("student_id", userData.id)
          .in(
            "class_id",
            results.map((cls) => cls.id)
          );

        if (data) {
          const statusMap = data.reduce(
            (acc, curr) => ({
              ...acc,
              [curr.class_id]: curr.enrollment_status.toLowerCase(),
            }),
            {}
          );
          setEnrollmentStatus(statusMap);
        }
      } finally {
        setEnrollmentStatusLoading(false);
      }
    };

    checkEnrollmentStatus();
  }, [userData?.id, results]);

  useEffect(() => {
    if (classId) {
      const fetchInstructor = async () => {
        const foundClass = results.find(
          (classItem) => classItem.id === classId
        );
        const { data, error } = await getUserData(
          foundClass?.instructorId || ""
        );

        if (data) {
          setInstructor(data);
        } else if (error) {
          setInstructor(null);
          console.error("Error fetching instructor data:", error);
        }
      };

      fetchInstructor();
    }
  }, [classId, results]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (search.trim()) fetchClasses(search);
      else setResults([]);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  const fetchClasses = async (searchTerm: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .ilike("class_title", `%${searchTerm}%`);

    if (error) {
      setResults([]);
    } else {
      const camelCaseResults = (data ?? []).map((cls) => ({
        id: cls.id,
        classTitle: cls.class_title,
        classCode: cls.class_code,
        instructorId: cls.instructor_id,
        classHexColor: cls.class_hex_color,
        classImageCover: cls.class_image_cover,
        createdAt: cls.created_at,
        classDescription: cls.class_description,
      }));

      setResults(camelCaseResults);
    }

    setLoading(false);
  };

  const registerForClass = async (cls: UserClass) => {
    setRegisterLoading(true);

    try {
      const { error } = await registerUserToClass(
        userData?.id || "",
        cls.id || ""
      );

      if (error) {
        throw new Error(error);
      }

      setOpen(false);
      setSearch("");
      setResults([]);
      console.log("Registered to class:", cls.classTitle);
      toast.success(`You have successfully registered for ${cls.classTitle}!`);
    } catch (error) {
      console.error("Error registering for class:", error);
      toast.error("Error registering for class. Please try again later.");
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:block ml-1">Register Class</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl mb-4">
            Search and Register
          </DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Search by class title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />

        {loading && <div className="text-center text-sm">Searching...</div>}

        {!loading && results.length === 0 && search && (
          <div className="text-center text-sm text-muted-foreground">
            No results found
          </div>
        )}

        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              className="grid gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {results.map((cls) => {
                const isExpanded = classId === cls.id;
                const stringClassId = cls.id || "";

                return (
                  <Collapsible
                    key={cls.id}
                    open={isExpanded}
                    onOpenChange={() => {
                      setClassId(isExpanded ? null : (cls.id ?? null));
                    }}
                  >
                    <div
                      className="p-4 rounded-lg border shadow cursor-pointer flex justify-between items-center"
                      style={{ borderLeft: `6px solid ${cls.classHexColor}` }}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex justify-between w-full items-center">
                          <div>
                            <div className="font-medium dark:text-white">
                              {cls.classTitle}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {cls.classCode}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <EnrollmentStatusButton
                              isLoading={enrollmentStatusLoading}
                              status={enrollmentStatus[stringClassId]}
                              onRegister={() => registerForClass(cls)}
                              registerLoading={registerLoading}
                            />
                            {isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent asChild>
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden bg-muted p-4 rounded-b-2xl border border-t-0 text-sm text-muted-foreground space-y-4"
                      >
                        <div className="space-y-1">
                          <h3 className="font-medium text-black dark:text-white">
                            Instructor
                          </h3>{" "}
                          <p>
                            {instructor?.firstName} {instructor?.lastName}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-medium text-black dark:text-white">
                            Description
                          </h3>{" "}
                          <p>
                            {cls.classDescription || "No description available"}
                          </p>
                        </div>
                      </motion.div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default RegisterClassDialog;

type EnrollmentStatusButtonProps = {
  isLoading: boolean;
  status?: "ENROLLED" | "WAITLISTED" | "COMPLETED" | string | null;
  onRegister: () => void;
  registerLoading?: boolean;
};

/**
 * EnrollmentStatusButton component displays the enrollment status of a user
 * @param {EnrollmentStatusButtonProps} props - The props for the EnrollmentStatusButton component.
 * @param {boolean} props.isLoading - Indicates if the button is in a loading state.
 * @param {string} props.status - The enrollment status of the user.
 * @param {void} props.onRegister - The function to call when the button is clicked.
 * @param {boolean} props.registerLoading - Indicates if the registration process is loading.
 * @returns {JSX.Element} - The rendered button component.
 */
export function EnrollmentStatusButton({
  isLoading,
  status,
  onRegister,
  registerLoading = false,
}: EnrollmentStatusButtonProps) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-24 h-9 rounded-md"
      >
        <Skeleton className="h-full w-full rounded-md" />
      </motion.div>
    );
  }

  if (status) {
    const statusStyles = {
      enrolled:
        "text-green-800 dark:text-green-400 border-green-800 dark:border-green-400",
      waitlisted:
        "text-yellow-600 dark:text-yellow-400 border-yellow-600 dark:border-yellow-400",
      default:
        "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400",
    };

    const statusText = status.charAt(0).toUpperCase() + status.slice(1);

    return (
      <Button
        variant="outline"
        disabled
        className={`border-2 w-24 ${statusStyles[status as keyof typeof statusStyles] || statusStyles.default}`}
      >
        {statusText}
      </Button>
    );
  }

  return (
    <Button
      className="w-24 relative"
      onClick={(e) => {
        e.stopPropagation();
        onRegister();
      }}
      disabled={registerLoading}
    >
      {registerLoading ? (
        <>
          <span className="invisible">Register</span>
          <Loader2 className="absolute inset-0 m-auto h-4 w-4 animate-spin" />
        </>
      ) : (
        "Register"
      )}
    </Button>
  );
}
