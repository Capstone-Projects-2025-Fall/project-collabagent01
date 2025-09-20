import { useState } from "react";
import { UserData, UserRole } from "../api/types/user";
import AdminProfile from "./AdminProfile";
import InstructorProfile from "./InstructorProfile";
import StudentProfile from "./StudentProfile";
import { Loader2 } from "lucide-react";

/**
 * Profile component that renders different profile views based on user role.
 * @param userData - The user data object containing user information.
 * @returns
 */
export const Profile = ({
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
      <ProfileHeader
        userData={userData}
        selectedRole={effectiveRole}
        onRoleChange={
          userData.role !== UserRole.STUDENT ? handleRoleChange : undefined
        }
      />

      {effectiveRole === UserRole.ADMIN && <AdminProfile userData={userData} />}
      {effectiveRole === UserRole.INSTRUCTOR && (
        <InstructorProfile userData={userData} />
      )}
      {effectiveRole === UserRole.STUDENT && (
        <StudentProfile userData={userData} />
      )}
      {effectiveRole === UserRole.DEV && <AdminProfile userData={userData} />}
    </div>
  );
};

export default Profile;

/**
 * EmptyProfileView component that displays a placeholder for the profile view.
 * @returns {JSX.Element} The empty profile view component.
 */
export const EmptyProfileView = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center p-8 max-w-md">
        <div className="mx-auto w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Profile View</h2>
        <p className="text-gray-500 dark:text-gray-400">
          This profile section is currently under development.
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">
          Check back later for updates!
        </p>
      </div>
    </div>
  );
};

type ProfileHeaderProps = {
  userData: UserData | null;
  selectedRole?: UserRole | null;
  onRoleChange?: (role: UserRole) => void;
};

export const ProfileHeader = ({
  userData,
  selectedRole,
  onRoleChange,
}: ProfileHeaderProps) => {
  if (!userData) return null;

  const effectiveRole = selectedRole ?? userData.role;
  const showSelect = userData.role !== UserRole.STUDENT;
  const isViewingOwnRole = effectiveRole === userData.role;

  return (
    <div className="flex justify-end w-full width-container">
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
