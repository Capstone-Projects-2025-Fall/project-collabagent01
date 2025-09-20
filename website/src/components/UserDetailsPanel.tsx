import { useState } from "react";
import {
  UserActivityLogItem,
  UserClass,
  UserData,
  UserRole,
} from "../api/types/user";
import { deleteUser, updateUser, updateUserPassword } from "../api/user";
import PaginatedTable from "./PaginatedTable";
import SuggestionTable from "./SuggestionTable";
import UserSettings from "./UserSettings";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { supabase } from "../supabaseClient";

/**
 * UserDetailsPanel component displays user details, activity, and settings.
 * It allows editing user information and deleting the user.
 * @param {UserData | UserData[] | null} user - The user data to display.
 * @param {UserRole} userRole - The role of the user (e.g., admin, instructor).
 * @param {UserActivityLogItem[]} userActivity - The activity log of the user.
 * @param {UserClass[]} userClasses - The classes associated with the user.
 * @param {UserClass[]} instructorClasses - The classes the user is teaching.
 * @param {boolean} isLoading - Indicates if the data is loading.
 * @returns {JSX.Element} - The rendered component.
 */
export const UserDetailsPanel: React.FC<{
  user: UserData | UserData[] | null;
  userRole: UserRole;
  userActivity: UserActivityLogItem[];
  userClasses?: UserClass[];
  instructorClasses?: UserClass[];
  isLoading?: boolean;
  setSelectedClass?: (cls: UserClass) => void;
  isSettingsPanel: boolean;
}> = ({
  user,
  userRole,
  userActivity,
  userClasses,
  instructorClasses,
  isLoading,
  setSelectedClass,
  isSettingsPanel,
}) => {
  const isArray = Array.isArray(user);
  const singleUser = isArray && user.length === 1 ? user[0] : null;

  if (isLoading) {
    return (
      <div className="w-full md:flex-1 max-h-[80vh] bg-white dark:bg-black border border-gray-600 dark:border-gray-400 rounded-lg shadow p-6 overflow-y-auto no-scrollbar">
        <UserDetailsSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full md:flex-1 max-h-[80vh] bg-white dark:bg-black border border-gray-600 dark:border-gray-400 rounded-lg shadow p-6 overflow-y-auto no-scrollbar">
      {singleUser ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold mb-4 px-2">
              {singleUser.firstName} {singleUser.lastName}
              <span className="text-sm text-gray-500 px-4">
                {singleUser.email}
              </span>
            </h2>
            <EditUserButton user={singleUser} userRole={userRole} />
          </div>
          <p className="mb-4 px-2">{singleUser.role}</p>
          <UserStats userRole={userRole} user={singleUser} />
          <div className="w-full mt-6">
            <UserClassesSection
              userClasses={userClasses}
              onClassClick={(cls) => setSelectedClass && setSelectedClass(cls)}
            />
            <UserActivitySection userActivity={userActivity} />
            <InstructorClassesSection
              user={singleUser}
              instructorClasses={instructorClasses}
            />
            <UserSettingsSection user={singleUser} userRole={userRole} />
          </div>
          <div className="flex justify-end mt-4 space-x-4">
            {isSettingsPanel ? (
              <ResetPasswordButton />
            ) : (
              <ResetPasswordButton userId={singleUser.id} />
            )}
            <DeleteUserButton userId={singleUser.id} />
          </div>
        </div>
      ) : isArray && user.length > 0 ? (
        <div>
          <h2 className="text-2xl font-bold mb-4 px-2">User Settings</h2>
          <UserSettingsSection user={user} userRole={userRole} />
        </div>
      ) : (
        <p className="text-gray-500">No user selected.</p>
      )}
    </div>
  );
};

export default UserDetailsPanel;

const DeleteUserButton: React.FC<{
  userId: string;
}> = ({ userId }) => {
  return (
    <button
      className="button-gray bg-red-600 dark:bg-red-800 hover:bg-red-700 hover:dark:bg-red-700"
      onClick={async () => {
        const confirmed = window.confirm(
          "Are you sure you want to delete this user?"
        );
        if (confirmed) {
          const { success, error } = await deleteUser(userId);
          if (success) {
            console.log("User deleted successfully");
          }
          if (error) {
            console.error("Error deleting user:", error);
          }
        }
      }}
    >
      Delete User
    </button>
  );
};

const ResetPasswordButton: React.FC<{ userId?: string }> = ({ userId }) => {
  const [open, setOpen] = useState(false);
  const form = useForm({
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePassword = async () => {
    if (form.getValues("newPassword") !== form.getValues("confirmPassword")) {
      form.setError("confirmPassword", {
        type: "manual",
        message: "Passwords do not match",
      });
      return;
    }
    if (userId) {
      const { error } = await updateUserPassword(
        userId,
        form.getValues("newPassword")
      );

      if (error) {
        console.error("Error resetting password: ", error);
      }
    } else {
      const { data, error } = await supabase.auth.updateUser({
        password: form.getValues("newPassword"),
      });
      if (data) {
        console.log("Password updated successfully");
      }
      if (error) {
        console.error("Error updating user: ", error);
      }
    }

    setOpen(false);
    form.reset();
  };

  return (
    <div className="">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="button-gray">Change Password</button>
        </DialogTrigger>
        <DialogContent className="bg-white dark:bg-zinc-900 rounded-xl shadow shadow-gray-800 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Enter a new password</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(changePassword)}
              className="space-y-8 mt-4"
            >
              <FormField
                control={form.control}
                name="newPassword"
                rules={{ required: "Password is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                rules={{ required: "Please confirm your password" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full !mt-8 font-semibold text-lg !py-5"
              >
                Change
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const EditUserButton: React.FC<{
  userRole: UserRole;
  user: UserData;
}> = ({ user, userRole }) => {
  const [open, setOpen] = useState(false);

  const editUser = async () => {
    const editedUser: UserData = {
      ...user,
      firstName: form.getValues("firstName"),
      lastName: form.getValues("lastName"),
      email: form.getValues("email"),
      avatar_url: form.getValues("avatar_url"),
      role: form.getValues("role"),
    };

    const { success, error } = await updateUser(user.id, editedUser);
    if (success) {
      console.log("User updated successfully");
    }
    if (error) {
      console.error("Error updating user:", error);
    }
    setOpen(false);
    form.reset();
  };

  const form = useForm({
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatar_url: user.avatar_url,
      role: user.role,
    },
  });

  return (
    <div className="">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="rounded p-2 hover:bg-gray-300 dark:hover:bg-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              className="dark:fill-white fill-black"
            >
              <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z" />
            </svg>
          </button>
        </DialogTrigger>
        <DialogContent className="bg-white dark:bg-zinc-900 rounded-xl shadow shadow-gray-800 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit User</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(editUser)}
              className="space-y-8 mt-4"
            >
              <FormField
                control={form.control}
                name="firstName"
                rules={{ required: "First name is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                rules={{ required: "Last name is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                rules={{ required: "Email is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe@clover.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="avatar_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar URL</FormLabel>
                    <FormControl>
                      <Input placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {userRole === UserRole.DEV || userRole === UserRole.ADMIN ? (
                <FormField
                  control={form.control}
                  rules={{ required: "Role is required" }}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start bg-transparent"
                            >
                              {field.value}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              onClick={() => field.onChange(UserRole.STUDENT)}
                            >
                              Student
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                field.onChange(UserRole.INSTRUCTOR)
                              }
                            >
                              Instructor
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => field.onChange(UserRole.ADMIN)}
                            >
                              Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => field.onChange(UserRole.DEV)}
                            >
                              Developer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <></>
              )}
              <Button
                type="submit"
                className="w-full !mt-8 font-semibold text-lg !py-5"
              >
                Save
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const UserStats: React.FC<{ userRole: UserRole; user: UserData }> = ({
  userRole,
  user,
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {userRole === UserRole.DEV ? (
        <>
          <StatCard title="ID" value={user.id ?? "Unknown"} />
          <StatCard title="Source" value={user.source ?? "Unknown"} />
          <StatCard
            title="Created At"
            value={user.auth_created_at ?? "Unknown"}
          />
          <StatCard title="Status" value={user.status ?? "Unknown"} />
          <StatCard
            title="Last Updated"
            value={user.last_updated_at ?? "Unknown"}
          />
          <StatCard
            title="Last Sign In"
            value={user.last_sign_in ?? "Unknown"}
          />
        </>
      ) : (
        <></>
      )}
    </div>
  );
};

const UserSettingsSection: React.FC<{
  userRole: UserRole;
  user: UserData | UserData[] | null;
}> = ({ user, userRole }) => {
  return (
    <>
      {userRole === UserRole.DEV || userRole === UserRole.ADMIN ? (
        <div className="bg-gray-100 dark:bg-gray-900 rounded shadow-sm p-6 mb-4">
          <UserSettings user={user} />
        </div>
      ) : (
        <></>
      )}
    </>
  );
};

const UserClassesSection: React.FC<{
  userClasses: UserClass[] | undefined;
  onClassClick: (cls: UserClass) => void;
}> = ({ userClasses, onClassClick }) => {
  return (
    <div className="bg-gray-100 dark:bg-gray-900 rounded shadow-sm p-6 mb-4">
      <h2 className="text-md font-semibold text-[#50B498]">User Classes</h2>
      {userClasses && userClasses.length > 0 ? (
        <ul className="mt-2">
          {userClasses.map((userClass) => (
            <div
              className="flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded cursor-pointer"
              onClick={() => onClassClick(userClass)}
            >
              {userClass.classHexColor && (
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: userClass.classHexColor }}
                />
              )}
              <span>
                {userClass.classTitle}{" "}
                <span
                  className={
                    userClass.id === "all" || userClass.id === "non-class"
                      ? "hidden"
                      : ""
                  }
                >
                  - {userClass.classCode}
                </span>
              </span>
            </div>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No classes assigned</p>
      )}
    </div>
  );
};

const UserActivitySection: React.FC<{
  userActivity: UserActivityLogItem[];
}> = ({ userActivity }) => {
  return (
    <div className="bg-gray-100 dark:bg-gray-900 rounded shadow-sm p-6 mb-4">
      {userActivity.length > 0 ? (
        <div>
          <h2 className="text-md font-semibold text-[#50B498]">
            User Decision Insights
          </h2>
          <PaginatedTable
            data={userActivity}
            renderTable={(items, startIndex) => (
              <SuggestionTable logItems={items} startIndex={startIndex} />
            )}
          />
        </div>
      ) : (
        <div className="text-gray-500">No user activity available</div>
      )}
    </div>
  );
};

const InstructorClassesSection: React.FC<{
  user: UserData;
  instructorClasses: UserClass[] | undefined;
}> = ({ user, instructorClasses }) => {
  return (
    <>
      {user.role === UserRole.INSTRUCTOR &&
      instructorClasses &&
      instructorClasses.length > 0 ? (
        <div className="bg-gray-100 dark:bg-gray-900 rounded shadow-sm p-6 mb-4">
          <h2 className="text-md font-semibold text-[#50B498]">
            Instructor Classes
          </h2>
          <ul className="mt-2">
            {instructorClasses.map((userClass) => (
              <div className="flex items-center gap-2">
                {userClass.classHexColor && (
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: userClass.classHexColor }}
                  />
                )}
                <span>
                  {userClass.classTitle}{" "}
                  <span
                    className={
                      userClass.id === "all" || userClass.id === "non-class"
                        ? "hidden"
                        : ""
                    }
                  >
                    - {userClass.classCode}
                  </span>
                </span>
              </div>
            ))}
          </ul>
        </div>
      ) : (
        <></>
      )}
    </>
  );
};

const StatCard = ({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) => {
  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded shadow-inner">
      <h4 className="font-semibold">{title}</h4>
      <p>{value}</p>
    </div>
  );
};

const SkeletonBox = ({ width = "w-full", height = "h-4" }) => (
  <div
    className={`bg-gray-300 dark:bg-gray-700 animate-pulse rounded ${width} ${height}`}
  ></div>
);

const UserDetailsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-2">
          <SkeletonBox width="w-48" height="h-6" />
          <SkeletonBox width="w-32" height="h-4" />
        </div>
        <SkeletonBox width="w-8" height="h-8" />
      </div>

      <SkeletonBox width="w-24" height="h-4" />

      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <SkeletonBox key={idx} height="h-16" />
        ))}
      </div>

      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-gray-100 dark:bg-gray-900 rounded shadow-sm p-4 space-y-3"
        >
          <SkeletonBox width="w-40" />
          <SkeletonBox />
          <SkeletonBox width="w-5/6" />
          <SkeletonBox width="w-3/4" />
        </div>
      ))}

      <div className="flex justify-end">
        <SkeletonBox width="w-24" height="h-10" />
      </div>
    </div>
  );
};
