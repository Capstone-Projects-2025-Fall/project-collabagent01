import { useState } from "react";
import { useAllUsers } from "../hooks/useAllUsers";
import { useUserClasses, useUserClassStatus } from "../hooks/useUserClasses";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";
import { UserClass, UserData, UserRole } from "../api/types/user";
import "react-datepicker/dist/react-datepicker.css";
import { useUserActivity } from "../hooks/useUserActivity";
import UserSideBar from "../components/UsersSideBar";
import UserDetailsPanel from "../components/UserDetailsPanel";
import DataDownload from "../components/DataDownload";
import { useInstructorClasses } from "../hooks/useInstructorClasses";
import { toast } from "sonner";
import StudentDashboardCard from "../components/StudentDashboardCard";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
);

/**
 * AdminDashboard component
 * This component is responsible for rendering the admin dashboard.
 * It includes a sidebar for selecting users and a details panel for displaying user information.
 * It also includes a data download section for downloading user data.
 * @returns {JSX.Element} The AdminDashboard component.
 */
export const AdminDashboard = () => {
  const [selectedUsers, setSelectedUsers] = useState<UserData[]>([]);

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

  const { userActivity: selectedActivity, progressData } = useUserActivity(
    selectedUserId,
    selectedClassId,
    selectedClassType
  );

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
      <div className="w-full mb-6 text-text">
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

export default AdminDashboard;
