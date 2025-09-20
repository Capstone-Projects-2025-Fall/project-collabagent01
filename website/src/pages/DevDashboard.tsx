import { useState } from "react";
import { useAllUsers } from "../hooks/useAllUsers";
import { useUserClasses, useUserClassStatus } from "../hooks/useUserClasses";
import { useAIStats } from "../hooks/useAIStats";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";
import { ClassData, UserClass, UserData, UserRole } from "../api/types/user";
import "react-datepicker/dist/react-datepicker.css";
import { useUserActivity } from "../hooks/useUserActivity";
import UserSideBar from "../components/UsersSideBar";
import UserDetailsPanel from "../components/UserDetailsPanel";
import DataDownload from "../components/DataDownload";
import { useInstructorClasses } from "../hooks/useInstructorClasses";
import { toast } from "sonner";
import StudentDashboardCard from "../components/StudentDashboardCard";
import ClassSideBar from "../components/ClassSideBar";
import { AIStatGraph } from "../components/AIStatGraph";
import { useAllClasses } from "../hooks/useAllClasses";
import ClassDetailsPanel from "../components/ClassDetailsPanel";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
);

/**
 * DevDashboard component
 * This component is responsible for rendering the developer dashboard.
 * It includes a sidebar for user selection, a details panel for user information,
 * and a graph for AI statistics.
 * @returns {JSX.Element} The DevDashboard component.
 */
export const DevDashboard = () => {
  const [selectedUsers, setSelectedUsers] = useState<UserData[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<ClassData[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<UserClass | null>(null);
  const selectedClassId = selectedClass?.id ?? "all";
  const selectedClassType =
    selectedClass?.id === "all"
      ? "all"
      : selectedClass?.id === "non-class"
        ? "non-class"
        : "class";

  const { users, isLoading, error } = useAllUsers();
  const primaryUser = selectedUsers[0];
  const { classes, loading: userClassesLoading } = useUserClasses(
    primaryUser?.id
  );
  const { userActivity, loading: userActivityLoading } = useUserActivity(
    primaryUser?.id
  );
  const { classes: instructorClasses, loading: instructorLoading } =
    useInstructorClasses(primaryUser?.id);

  const { classes: allClasses, isLoading: isLoadingClasses } = useAllClasses();

  const { userActivity: selectedActivity, progressData } = useUserActivity(
    selectedUserId,
    selectedClassId,
    selectedClassType
  );
  const { aiStats } = useAIStats();

  const { studentStatus } = useUserClassStatus(
    selectedUsers[0]?.id || null,
    selectedClass?.id || null
  );

  if (error) {
    toast.error("Error fetching users. Please try again later.");
    return null;
  }

  return (
    <div>
      <div className="w-full mb-6 text-text">
        <AIStatGraph aiStats={aiStats} />
      </div>
      {/* User Section */}
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        {/* Sidebar */}
        <UserSideBar
          users={users}
          selectedUsers={selectedUsers}
          loading={isLoading}
          onSelectUser={(user) => {
            setSelectedUsers([user]);
          }}
          onSetSelectedUsers={setSelectedUsers}
          setSelectedUserId={setSelectedUserId}
        />

        {/* Details Panel */}
        <UserDetailsPanel
          user={selectedUsers}
          userClasses={classes}
          userRole={UserRole.DEV}
          userActivity={userActivity}
          instructorClasses={instructorClasses}
          isLoading={
            isLoading ||
            userClassesLoading ||
            userActivityLoading ||
            instructorLoading
          }
          setSelectedClass={setSelectedClass}
          isSettingsPanel={false}
        />
      </div>
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <ClassSideBar
          classes={allClasses}
          selectedClasses={selectedClasses}
          onSelectClass={(classData) => {
            setSelectedClasses([classData]);
          }}
          onSetSelectedClasses={setSelectedClasses}
          loading={isLoadingClasses}
          setSelectedClassId={(id) => {
            const selected = allClasses.find((cls) => cls.id === id);
            if (selected) {
              setSelectedClasses([selected]);
            }
          }}
        />
        <ClassDetailsPanel
          users={users}
          classDetails={selectedClasses}
          isLoading={isLoadingClasses}
        />
      </div>

      {/* Data Download Section */}
      <div className="w-full mb-3 text-text">
        <DataDownload />
      </div>

      {selectedClass && selectedUserId && (
        <StudentDashboardCard
          student={{
            fullName: `${selectedUsers[0].firstName} ${selectedUsers[0].lastName}`,
            classTitle: selectedClass.classTitle,
            studentStatus:
              selectedClassId !== "all" && selectedClassId !== "non-class"
                ? studentStatus
                : null,
            totalAccepted: progressData.totalAccepted,
            correctSuggestions: progressData.correctSuggestions,
            percentageCorrect: progressData.percentageCorrect,
            logs: selectedActivity,
          }}
          onClose={() => setSelectedClass(null)}
        />
      )}
    </div>
  );
};

export default DevDashboard;
