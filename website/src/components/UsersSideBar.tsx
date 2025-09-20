import { useState, useMemo, useRef } from "react";
import { UserData } from "../api/types/user";
import { Avatar, AvatarFallback } from "./ui/avatar";

type UserSideBarProps = {
  users: UserData[];
  selectedUsers: UserData[];
  onSelectUser: (user: UserData) => void;
  onSetSelectedUsers?: (users: UserData[]) => void;
  loading?: boolean;
  setSelectedUserId?: (userId: string) => void;
};

/**
 * UserSideBar component displays a list of users with search and selection functionality.
 * It allows users to search for specific users and select/deselect them.
 * It also supports selecting a range of users using Shift+Click.
 * The component is styled with Tailwind CSS and includes loading states.
 * @param {UserData[]} users - The list of users to display.
 * @param {UserData[]} selectedUsers - The list of currently selected users.
 * @param {(user: UserData) => void} onSelectUser - Callback function to handle user selection.
 * @param {(users: UserData[]) => void} [onSetSelectedUsers] - Optional callback to set selected users.
 * @param {boolean} [loading=false] - Optional loading state for the component.
 * @returns {JSX.Element} The rendered UserSideBar component.
 */
export const UserSideBar: React.FC<UserSideBarProps> = ({
  users,
  selectedUsers,
  onSelectUser,
  onSetSelectedUsers,
  loading = false,
  setSelectedUserId,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const lastClickedIndexRef = useRef<number | null>(null);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;

    const tokens = searchQuery.trim().split(/\s+/);
    const filters: Partial<Record<keyof UserData, string>> = {};
    const keywords: string[] = [];

    for (const token of tokens) {
      if (token.startsWith("/")) {
        const [key, value] = token.slice(1).split(":");
        if (key && value) {
          filters[key as keyof UserData] = value.toLowerCase();
        }
      } else {
        keywords.push(token.toLowerCase());
      }
    }

    return users.filter((user) => {
      const keywordMatch =
        keywords.length === 0 ||
        keywords.some(
          (kw) =>
            `${user.firstName} ${user.lastName}`.toLowerCase().includes(kw) ||
            user.email?.toLowerCase().includes(kw)
        );

      const allFiltersMatch = (
        Object.entries(filters) as [keyof UserData, string][]
      ).every(([key, value]) => {
        const userValue = user[key];
        return (
          typeof userValue === "string" &&
          userValue.toLowerCase().includes(value)
        );
      });

      return keywordMatch && allFiltersMatch;
    });
  }, [users, searchQuery]);

  const allFilteredSelected = filteredUsers.every((user) =>
    selectedUsers.some((u) => u.id === user.id)
  );

  const toggleSelectAll = () => {
    if (!onSetSelectedUsers) return;

    if (allFilteredSelected) {
      const remaining = selectedUsers.filter(
        (u) => !filteredUsers.some((fu) => fu.id === u.id)
      );
      onSetSelectedUsers(remaining);
    } else {
      const merged = [
        ...selectedUsers,
        ...filteredUsers.filter(
          (fu) => !selectedUsers.some((su) => su.id === fu.id)
        ),
      ];
      onSetSelectedUsers(merged);
    }
  };

  const handleUserClick = (event: React.MouseEvent, index: number) => {
    const clickedUser = filteredUsers[index];

    setSelectedUserId?.(clickedUser.id);

    // Normal click: toggle single user
    if (
      !event.shiftKey ||
      lastClickedIndexRef.current === null ||
      !onSetSelectedUsers
    ) {
      onSelectUser(clickedUser);
      lastClickedIndexRef.current = index;
      return;
    }

    // Shift+Click: select range
    const start = Math.min(lastClickedIndexRef.current, index);
    const end = Math.max(lastClickedIndexRef.current, index);
    const rangeUsers = filteredUsers.slice(start, end + 1);

    const newSelected = [
      ...selectedUsers,
      ...rangeUsers.filter(
        (ru) => !selectedUsers.some((su) => su.id === ru.id)
      ),
    ];

    onSetSelectedUsers(Array.from(new Set(newSelected)));
  };

  return (
    <div className="w-full md:w-1/4 max-h-[80vh] bg-white dark:bg-black border border-gray-600 dark:border-gray-400 rounded-lg shadow p-4 overflow-y-auto no-scrollbar">
      <h2 className="text-lg font-semibold mb-2 pl-2">
        Users ({users.length})
      </h2>
      <input
        type="text"
        placeholder="Search users..."
        className="border px-3 py-2 rounded w-full mb-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {onSetSelectedUsers && (
        <button
          onClick={toggleSelectAll}
          className="w-full mb-2 py-2 text-sm bg-[#F59E0B] hover:bg-[#FFA01D] text-text rounded"
        >
          {allFilteredSelected
            ? "Deselect All Filtered"
            : "Select All Filtered"}
        </button>
      )}

      <ul className="space-y-2">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="p-2 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
                  </div>
                </div>
              </li>
            ))
          : filteredUsers.map((user, index) => {
              const isSelected = selectedUsers.some((u) => u.id === user.id);
              return (
                <li
                  key={user.id}
                  onClick={(e) => handleUserClick(e, index)}
                  className={`p-2 rounded cursor-pointer hover:bg-green-100 dark:hover:bg-green-900 transition ${
                    isSelected ? "bg-green-200 dark:bg-green-800" : ""
                  }`}
                >
                  <div className="flex items-center">
                    <Avatar className="w-10 h-10 mr-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url ?? ""}
                          alt={`${user.firstName} ${user.lastName}`}
                          className="w-full h-full rounded-full"
                        />
                      ) : (
                        <AvatarFallback className="bg-[#50B498] text-white text-lg font-semibold">
                          {user?.firstName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
      </ul>
    </div>
  );
};

export default UserSideBar;
