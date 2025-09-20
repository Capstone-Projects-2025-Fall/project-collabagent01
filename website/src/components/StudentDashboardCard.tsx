import StatCard from "./StatCard";
import LineChart from "./LineChart";
import StackedBarChart from "./StackedBarChart";
import { X } from "lucide-react";
import PieChart from "./PieChart";
import { StudentStatus, UserActivityLogItem } from "../api/types/user";
import StudentStatusBadge from "./StudentStatusBadge";

interface StudentClassData {
  fullName?: string;
  classTitle: string;
  studentStatus?: StudentStatus | null;
  totalAccepted: number;
  correctSuggestions: number;
  percentageCorrect: number;
  lastActivity?: string;
  logs?: UserActivityLogItem[];
}

interface StudentDashboardCardProps {
  student: StudentClassData;
  onClose?: () => void;
}

/**
 * A modal card that displays detailed information about a student.
 * It includes charts and statistics related to the student's performance.
 * @param param0 - The props for the StudentDashboardCard component.
 * @param {StudentClassData} param0.student - The student data to be displayed.
 * @param {function} [param0.onClose] - The function to call when the card is closed.
 * @returns {JSX.Element} - The rendered card component.
 */
export const StudentDashboardCard = ({
  student,
  onClose,
}: StudentDashboardCardProps) => {
  const {
    fullName,
    classTitle,
    studentStatus,
    logs,
    totalAccepted,
    correctSuggestions,
    percentageCorrect,
  } = student;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-700 rounded-2xl shadow-xl overflow-hidden w-full max-w-2xl lg:max-w-4xl space-y-6 max-h-[85vh] flex flex-col overflow-y-auto pt-8 pb-8"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <div className="px-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white pb-1">
                  {fullName}
                </h2>
                {studentStatus && <StudentStatusBadge status={studentStatus} />}
              </div>
              <p className="text-gray-600 dark:text-gray-400">{classTitle}</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                aria-label="Close dashboard"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        {/* Card Content */}
        <div className="px-6 space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Accepted" value={totalAccepted} />
            <StatCard title="Correct" value={correctSuggestions} />
            <StatCard
              title="Accuracy"
              value={`${percentageCorrect.toFixed(2)}%`}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <PieChart
              correct={correctSuggestions}
              incorrect={totalAccepted - correctSuggestions}
            />
            <LineChart activities={logs as UserActivityLogItem[]} />
          </div>

          {/* Stacked Bar Chart */}
          <StackedBarChart activities={logs as UserActivityLogItem[]} />
        </div>
      </div>
    </div>
  );
};

export default StudentDashboardCard;
