import { useState } from "react";
import { EnrollmentStatus } from "../types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { ChevronDownCircle, ChevronUpCircle } from "lucide-react";
import { Button } from "./ui/button";
import { UserData } from "../api/types/user";

type StudentListSectionProps = {
  title: string;
  students: UserData[];
  variant: EnrollmentStatus;
  onRemove?: (id: string) => void;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  isInstructor?: boolean;
};

/**
 * StudentListSection component displays a collapsible section of students
 * with their details and actions based on the enrollment status.
 * @param {StudentListSectionProps} param0 - The props for the StudentListSection component
 * @param {string} param0.title - The title of the section
 * @param {UserData[]} param0.students - The list of students to display
 * @param {EnrollmentStatus} param0.variant - The variant of the section (enrolled or waitlisted)
 * @param {(string) => void} param0.onRemove - The function to call when removing a student
 * @param {(string) => void} param0.onAccept - The function to call when accepting a student
 * @param {(string) => void} param0.onReject - The function to call when rejecting a student
 * @param param0.isInstructor - Whether the user is an instructor or not (default: true)
 * @returns {JSX.Element} - The rendered component
 */
export const StudentListSection = ({
  title,
  students,
  variant,
  onRemove,
  onAccept,
  onReject,
  isInstructor = true,
}: StudentListSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  if (students.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="card mb-4">
      <div className="flex items-center justify-between space-x-4 px-1">
        <h3 className="text-lg font-semibold">
          {title} ({students.length})
        </h3>
        <CollapsibleTrigger asChild>
          <button className="rounded-md hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
            {isOpen ? (
              <ChevronUpCircle className="h-5 w-5" />
            ) : (
              <ChevronDownCircle className="h-5 w-5" />
            )}
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="mt-2 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 dark:bg-slate-800 font-semibold">
                <tr>
                  <th className="px-4 py-2 text-left font-medium w-1/12">
                    No.
                  </th>
                  <th className="px-4 py-2 text-left font-medium w-1/4">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left font-medium w-1/3">
                    Email
                  </th>
                  <th
                    className={`px-4 py-2 text-left font-medium ${!isInstructor && "hidden"}`}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                {students.map((student, index) => (
                  <tr key={student.id}>
                    <td className="px-4 py-2 w-12">{index + 1}</td>
                    <td className="px-4 py-2 w-1/4 truncate">
                      {student.firstName} {student.lastName}
                    </td>
                    <td className="px-4 py-2 w-1/3 truncate">
                      {student.email}
                    </td>
                    <td
                      className={`px-4 py-2 w-1/4 ${!isInstructor && "hidden"}`}
                    >
                      <div className="flex flex-wrap gap-2">
                        {variant === EnrollmentStatus.ENROLLED && (
                          <Button
                            className="w-16 h-8  bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => onRemove?.(student.id)}
                          >
                            Remove
                          </Button>
                        )}
                        {variant === EnrollmentStatus.WAITLISTED && (
                          <div className="flex gap-4 items-center">
                            <Button
                              className="w-16 h-8 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => onAccept?.(student.id)}
                            >
                              Accept
                            </Button>
                            <Button
                              className="w-16 h-8 bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => onReject?.(student.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default StudentListSection;
