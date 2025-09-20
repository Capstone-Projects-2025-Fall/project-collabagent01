import { StudentStatus } from "../api/types/user";

interface StatusBadgeProps {
  status: StudentStatus | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * A badge component that displays the status of a student.
 * The badge color and text change based on the student's status.
 * @param {object} props - The properties for the badge component.
 * @param {StudentStatus | null} props.status - The status of the student.
 * @param {string} [props.className] - Additional classes to apply to the badge.
 * @param {"sm" | "md" | "lg"} [props.size] - The size of the badge.
 * @returns {JSX.Element} The rendered badge component.
 */
export const StudentStatusBadge = ({
  status = null,
  className,
  size = "md",
}: StatusBadgeProps) => {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1",
  };

  const getStatusClasses = () => {
    switch (status) {
      case StudentStatus.ACTIVE:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case StudentStatus.SUSPENDED:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case StudentStatus.LOCKED:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const statusLetters = status ? status.charAt(0) : "";

  return (
    <span
      className={`rounded-3xl font-semibold ${sizeClasses[size]} ${getStatusClasses()} ${className}`}
    >
      <span className="hidden sm:inline">{status}</span>
      <span className="inline sm:hidden">{statusLetters}</span>
    </span>
  );
};

export default StudentStatusBadge;
