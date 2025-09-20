import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

/**
 * ThemeToggle component that allows users to switch between light and dark themes.
 * It uses the `useTheme` hook to manage the current theme and toggle it.
 * The component displays a sun icon for light mode and a moon icon for dark mode.
 * @returns ThemeToggle component that allows users to switch between light and dark themes.
 */
export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      onClick={toggleTheme}
      className="relative w-8 h-12 flex items-center justify-center cursor-pointer rounded-full bg-gray-300 dark:bg-gray-700 p-1 transition all"
    >
      <Sun
        className={`w-4 h-4 absolute inset-2 text-yellow-500 transition-opacity z-50 ${
          theme === "light" ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Moon icon for dark mode */}
      <Moon
        className={`size-4 absolute bottom-2 text-gray-300 transition-opacity z-50 ${
          theme === "dark" ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`absolute w-7 h-7 bg-white dark:bg-gray-900 rounded-full shadow-md transform transition-transform ${
          theme === "dark" ? "translate-y-2" : "-translate-y-2"
        }`}
      />
    </div>
  );
};

export default ThemeToggle;
