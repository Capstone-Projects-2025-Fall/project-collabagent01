import ClassesDropdownMenu from "../components/ClassesDropdownMenu";
import { useClassActivity } from "../hooks/useClassActivity";
import StatCard from "../components/StatCard";
import PieChart from "../components/PieChart";
import LineChart from "../components/LineChart";
import { useInstructorClasses } from "../hooks/useInstructorClasses";
import StackedBarChart from "../components/StackedBarChart";
import CreateNewClassDialog from "../components/CreateNewClassDialog";
import StudentDataTable from "../components/StudentDataTable";
import { UserData } from "../api/types/user";
import InfoTooltip from "../components/InfoTooltip";

/**
 * InstructorDashboard component displays the instructor dashboard with class statistics and activity logs.
 * It includes a dropdown menu for selecting classes, a pie chart for class decision overview,
 * @param { userData } - The user data of the instructor.
 * @returns
 */
export const InstructorDashboard = ({ userData }: { userData: UserData }) => {
  const { classes, selectedClassId, handleClassSelect } = useInstructorClasses(
    userData.id
  );

  const { allActivity, classActivity, progressData } = useClassActivity(
    classes,
    selectedClassId
  );

  const selectedClassTitle = classes.find(
    (classItem) => classItem.id === selectedClassId
  )?.classTitle;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1">
          <CreateNewClassDialog />
        </div>
        <div className="col-span-1" />
        <div className="col-span-2 flex items-center">
          <ClassesDropdownMenu
            classes={classes}
            selectedId={selectedClassId}
            onClassSelect={handleClassSelect}
          />
        </div>
      </div>

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
        <LineChart
          activities={selectedClassId === "all" ? allActivity : classActivity}
        />
      </div>

      <StackedBarChart
        activities={selectedClassId === "all" ? allActivity : classActivity}
      />
      <div className="card rounded shadow-sm p-6">
        <div className="flex items-center mb-2 gap-3">
          <h2 className="text-md font-semibold text-[#50B498]">
            Insights About Students
          </h2>
          <InfoTooltip>
            <div className="text-sm space-y-2">
              <p>
                The table shows insights from{" "}
                <span className="text-[#50B498] font-semibold">
                  {selectedClassId === "all"
                    ? "all classes"
                    : selectedClassTitle}
                </span>
                , summarizing student decisions on code suggestions and their
                accuracy.
              </p>

              <p className="text-xs text-muted-foreground">
                Click on any row to view student-specific suggestions and
                performance details.
              </p>
            </div>
          </InfoTooltip>
        </div>
        <StudentDataTable
          logs={selectedClassId === "all" ? allActivity : classActivity}
          classFilter={selectedClassId === "all" ? "all" : "class"}
        />
      </div>
    </div>
  );
};

export default InstructorDashboard;
