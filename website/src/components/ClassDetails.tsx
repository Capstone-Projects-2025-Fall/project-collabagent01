import { Loader2, User, Users, X } from "lucide-react";
import { UserClass, UserData, UserRole } from "../api/types/user";
import { EnrollmentStatus } from "../types";
import { useClassStudentsInfo } from "../hooks/useInstructorClasses";
import { useUserData } from "../hooks/useUserData";
import { updateStudentEnrollmentStatus } from "../api/classes";
import StudentListSection from "./StudentListSection";
import { toast } from "sonner";

/**
 * ClassDetails component displays the details of a class, including the instructor and enrolled students.
 * It allows instructors to manage student enrollment status.
 * @param userClass - The class object containing class details.
 * @param instructorData - The instructor object containing instructor details.
 * @param onClose - Function to close the modal.
 * @returns {JSX.Element} - A React component that displays class details and manages student enrollment.
 */
export const ClassDetails = ({
  userClass,
  instructorData,
  onClose,
}: {
  userClass: UserClass;
  instructorData: UserData;
  onClose: () => void;
}) => {
  const { userData } = useUserData();
  const { classTitle, classCode, classDescription, classHexColor } =
    userClass || {};

  const {
    enrolledStudents,
    waitlistedStudents,
    totalStudents,
    refetch,
    loading,
  } = useClassStudentsInfo(userClass.id || "");

  if (loading) {
    return (
      <div className="flex h-64 justify-center items-center">
        <Loader2 className="size-12 animate-spin" />
      </div>
    );
  }

  const handleStatusUpdate = async (
    studentId: string,
    newStatus: EnrollmentStatus
  ) => {
    if (!userClass.id) return;

    try {
      const { success, error } = await updateStudentEnrollmentStatus(
        userClass.id,
        studentId,
        newStatus
      );

      if (success) {
        toast.success(
          `Student ${newStatus === EnrollmentStatus.ENROLLED ? "enrolled" : "removed"} successfully!`
        );
        refetch();
      } else {
        throw new Error(error);
      }
    } catch (err) {
      console.error("Error updating enrollment status:", err);
      toast.error(
        `Failed to ${newStatus === EnrollmentStatus.ENROLLED ? "enroll" : "remove"} student.`
      );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-700 rounded-2xl shadow-xl overflow-hidden w-full max-w-2xl lg:max-w-4xl space-y-6 max-h-[85vh] flex flex-col overflow-y-auto pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-56 w-full flex-shrink-0">
          <div
            className="absolute top-0 left-0 h-48 w-full rounded-t-xl overflow-hidden"
            style={{ backgroundColor: classHexColor || "#E5E7EB" }}
          />
          <div className="absolute -bottom-4 left-12">
            {instructorData?.avatar_url ? (
              <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-700">
                <img
                  src={instructorData.avatar_url ?? ""}
                  alt={`${instructorData.firstName} ${instructorData.lastName}`}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            ) : (
              <div
                className="rounded-full flex items-center justify-center text-white text-4xl font-bold size-24 border-4 border-white dark:border-slate-700 bg-white dark:bg-slate-900"
                style={{ backgroundColor: classHexColor || "#50B498" }}
              >
                {instructorData?.firstName?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <X
            className="absolute top-6 right-6 cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-600 dark:hover:text-slate-200"
            onClick={onClose}
          />
        </div>

        <div className="mt-16 px-6">
          <div className="flex justify-between items-start px-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {classTitle}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                {classCode}
              </p>
            </div>

            <span className="text-muted-foreground text-lg flex items-center gap-2 mt-1">
              {totalStudents === 1 ? (
                <>
                  <User className="size-5" /> 1 Student
                </>
              ) : (
                <>
                  <Users className="size-5" /> {totalStudents} Students
                </>
              )}
            </span>
          </div>

          <div className="my-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1 card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Instructor
              </h2>
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="font-medium text-gray-600 dark:text-gray-300">
                    {instructorData?.firstName} {instructorData?.lastName}
                  </h3>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Description
              </h2>
              <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
                {classDescription || "No description available."}
              </p>
            </div>
          </div>

          {enrolledStudents.length > 0 && (
            <StudentListSection
              title="Enrolled Students"
              students={enrolledStudents}
              variant={EnrollmentStatus.ENROLLED}
              onRemove={(studentId) =>
                handleStatusUpdate(studentId, EnrollmentStatus.REMOVED)
              }
              isInstructor={userData?.role === UserRole.INSTRUCTOR}
            />
          )}

          {waitlistedStudents.length > 0 &&
            userData?.role === UserRole.INSTRUCTOR && (
              <StudentListSection
                title="Waitlisted Students"
                students={waitlistedStudents}
                variant={EnrollmentStatus.WAITLISTED}
                onAccept={(studentId) =>
                  handleStatusUpdate(studentId, EnrollmentStatus.ENROLLED)
                }
                onReject={(studentId) =>
                  handleStatusUpdate(studentId, EnrollmentStatus.REJECTED)
                }
              />
            )}
        </div>
      </div>
    </div>
  );
};

export default ClassDetails;
