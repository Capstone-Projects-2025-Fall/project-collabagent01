import { Chart, registerables } from "chart.js";
import LineChart from "../components/LineChart";
import StatCard from "../components/StatCard";
import StackedBarChart from "../components/StackedBarChart";
import PieChart from "../components/PieChart";
import ClassesDropdownMenu from "../components/ClassesDropdownMenu";
import { useUserActivity } from "../hooks/useUserActivity";
import PaginatedTable from "../components/PaginatedTable";
import SuggestionTable from "../components/SuggestionTable";
import StudentStatusBadge from "../components/StudentStatusBadge";
import { Loader2 } from "lucide-react";
import { useUserClasses } from "../hooks/useUserClasses";
import RegisterClassDialog from "../components/RegisterClassDialog";
import { UserData } from "../api/types/user";
import { LogEvent } from "../api/types/event";
import InfoTooltip from "../components/InfoTooltip";

Chart.register(...registerables);

/**
 * StudentDashboard component that displays user activity and progress.
 * @param userData - The user data to display in the dashboard.
 * @returns StudentDashboard component that displays user activity and progress.
 */
export const StudentDashboard = ({ userData }: { userData: UserData }) => {
  const {
    classes,
    selectedClassId,
    selectedClassType,
    handleClassSelect,
    selectedClass,
    loading: userClassLoading,
  } = useUserClasses();

  const {
    userActivity,
    progressData,
    loading: userActivityLoading,
  } = useUserActivity(userData.id, selectedClassId, selectedClassType);

  const loading = userClassLoading || userActivityLoading;
  const filteredLogItems = userActivity.filter(
    (logItem) =>
      logItem.event === LogEvent.USER_ACCEPT ||
      logItem.event === LogEvent.USER_REJECT
  );

  const sortedLogItems = filteredLogItems.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-10 w-10 dark:text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1">
          <RegisterClassDialog />
        </div>
        <div className="col-span-1 flex items-center justify-end">
          <span
            className={
              selectedClassType === "all" || selectedClassType === "non-class"
                ? "hidden"
                : ""
            }
          >
            <StudentStatusBadge status={selectedClass?.studentStatus || null} />
          </span>
        </div>
        <div className="col-span-2 flex justify-end">
          <ClassesDropdownMenu
            classes={classes}
            onClassSelect={handleClassSelect}
            selectedId={selectedClassId}
          />
        </div>
      </div>
      <div className="">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Accepted"
            value={progressData.totalAccepted}
            tooltipContent="Total suggestions accepted by the user, including both correct and incorrect suggestions."
          />
          <StatCard
            title="Correct"
            value={progressData.correctSuggestions}
            tooltipContent="Number of accepted suggestions that were actually correct (without bugs)."
          />
          <StatCard
            title="Accuracy"
            value={`${progressData.percentageCorrect.toFixed(2)}%`}
            tooltipContent={`${progressData.percentageCorrect.toFixed(2)}% of accepted suggestions were correct (${progressData.correctSuggestions}/${progressData.totalAccepted})`}
          />
        </div>

        {/* Charts Row */}
        <div className=" grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <PieChart
            correct={progressData.correctSuggestions}
            incorrect={
              progressData.totalAccepted - progressData.correctSuggestions
            }
          />
          <LineChart activities={userActivity} />
        </div>

        {/*Stacked Bar Graph*/}
        <StackedBarChart activities={userActivity} />

        {/* Insights Table */}
        <div className="card rounded-2xl shadow-sm p-6">
          <div className="flex items-center mb-3 gap-3">
            <h2 className="text-lg font-semibold text-[#50B498]">
              User Insights Table
            </h2>
            <InfoTooltip>
              <div className="text-sm space-y-2">
                <p>
                  The table displays each student's individual decisions on code
                  suggestions — including whether they accepted them and if the
                  suggestions contained bugs.
                </p>
                <p className="text-xs text-muted-foreground">
                  Click on any row to view detailed information about that
                  specific suggestion.
                </p>
              </div>
            </InfoTooltip>
          </div>
          <PaginatedTable
            data={sortedLogItems}
            renderTable={(items, startIndex) => (
              <SuggestionTable logItems={items} startIndex={startIndex} />
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
