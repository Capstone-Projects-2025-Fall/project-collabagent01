import { useEffect, useState } from "react";

/**
 * Custom hook to manage theme (light/dark) in a React application.
 * It synchronizes the theme with localStorage and applies the theme to the document.
 * @returns {Object} - Contains the current theme and a function to toggle the theme.
 */
export const useTheme = () => {
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light"
  );

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return { theme, toggleTheme };
};
