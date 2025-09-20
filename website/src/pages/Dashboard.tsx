import { UserRole, UserData } from "../api/types/user";
import InstructorDashboard from "./InstructorDashboard";
import StudentDashboard from "./StudentDashboard";
import DevDashboard from "./DevDashboard";
import AdminDashboard from "./AdminDashboard";
import { useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Dashboard component
 * This component is responsible for rendering the dashboard based on the user's role.
 * Depending on the selected role, it renders different components for Admin, Instructor, Student, and Developer.
 * It includes a header with user information and a role selection dropdown.
 * @param userData - The user data object containing user information.
 * @param loading - A boolean indicating whether the data is still loading.
 * @returns {JSX.Element | null} The Dashboard component or null if userData is not available.
 */
export const Dashboard = ({
  userData,
  loading,
}: {
  userData: UserData | null;
  loading: boolean;
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  if (!userData) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-10 w-10 dark:text-white" />
      </div>
    );
  }

  const effectiveRole = selectedRole ?? userData.role;

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
  };

  return (
    <div className="space-y-8 width-container">
      <DashboardHeader
        userData={userData}
        selectedRole={effectiveRole}
        onRoleChange={
          userData.role !== UserRole.STUDENT ? handleRoleChange : undefined
        }
      />

      {effectiveRole === UserRole.ADMIN && <AdminDashboard />}
      {effectiveRole === UserRole.INSTRUCTOR && (
        <InstructorDashboard userData={userData} />
      )}
      {effectiveRole === UserRole.STUDENT && (
        <StudentDashboard userData={userData} />
      )}
      {effectiveRole === UserRole.DEV && <DevDashboard />}
    </div>
  );
};

export default Dashboard;

type DashboardHeaderProps = {
  userData: UserData | null;
  selectedRole?: UserRole | null;
  onRoleChange?: (role: UserRole) => void;
};

export const DashboardHeader = ({
  userData,
  selectedRole,
  onRoleChange,
}: DashboardHeaderProps) => {
  if (!userData) return null;

  const effectiveRole = selectedRole ?? userData.role;
  const showSelect = userData.role !== UserRole.STUDENT;
  const isViewingOwnRole = effectiveRole === userData.role;

  const getRoleSubtitle = () => {
    if (isViewingOwnRole) {
      return "Here are your CLOVER session insights.";
    }

    const roleTitles = {
      [UserRole.DEV]: "Developer",
      [UserRole.ADMIN]: "Admin",
      [UserRole.INSTRUCTOR]: "Instructor",
      [UserRole.STUDENT]: "Student",
    };

    return `${roleTitles[effectiveRole]} portal`;
  };

  return (
    <div className="flex justify-between items-center w-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">
          Welcome back,{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#50B498] to-[#9CDBA6]">
            {userData.firstName}
          </span>
          👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">{getRoleSubtitle()}</p>
      </div>

      {showSelect && (
        <div className="flex flex-col items-end space-y-2">
          <span className="text-sm font-medium text-gray-500">
            {isViewingOwnRole ? "Your role" : "Viewing as"}
          </span>
          <select
            className="rounded-sm bg-white dark:bg-black border border-gray-200 dark:border-gray-800 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            value={effectiveRole}
            onChange={(e) => {
              const newRole = e.target.value as UserRole;
              onRoleChange?.(newRole);
            }}
          >
            {userData.role === UserRole.DEV && (
              <option value={UserRole.DEV}>Developer</option>
            )}
            {(userData.role === UserRole.ADMIN ||
              userData.role === UserRole.DEV) && (
              <option value={UserRole.ADMIN}>Admin</option>
            )}
            {(userData.role === UserRole.INSTRUCTOR ||
              userData.role === UserRole.ADMIN ||
              userData.role === UserRole.DEV) && (
              <option value={UserRole.INSTRUCTOR}>Instructor</option>
            )}
            {(userData.role === UserRole.DEV ||
              userData.role === UserRole.ADMIN ||
              userData.role === UserRole.INSTRUCTOR) && (
              <option value={UserRole.STUDENT}>Student</option>
            )}
          </select>
        </div>
      )}
    </div>
  );
};
