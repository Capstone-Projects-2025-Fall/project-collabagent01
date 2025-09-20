import { Outlet } from "react-router-dom";
import NavBar from "./components/NavBar";
import { Toaster } from "./components/ui/sonner";

/**
 * RootLayout component serves as the main layout for the application.
 * It includes a navigation bar at the top, a footer at the bottom, and a main content area in between.
 * @returns {JSX.Element} The root layout component.
 */
const RootLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-green-100 dark:bg-gradient-to-b dark:from-black dark:to-gray-800 text-black dark:text-white">
      {/* Navbar - Always at the top */}
      <NavBar />

      <Toaster richColors position="top-right" />

      {/* Main Content - Takes up remaining space */}
      <div className="flex-grow mt-24">
        <Outlet />
      </div>

      {/* Footer - Always at the bottom */}
      <footer className="py-6 bg-gradient-to-t from-white to-green-100 dark:bg-gradient-to-t dark:from-black dark:to-gray-800 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>© 2025 CLOVER</p>
        <p className="text-[#50B498]">TEAM 22</p>
      </footer>
    </div>
  );
};

export default RootLayout;
