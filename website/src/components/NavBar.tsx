import { Link, useNavigate } from "react-router-dom";
import cloverLogo from "../assets/CLOVER.svg";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../supabaseClient";
import ThemeToggle from "./ThemeToggle";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { DoorOpen, Menu, Settings2, User2 } from "lucide-react";
import { useUserData } from "../hooks/useUserData";
import { UserRole } from "../api/types/user";

/**
 * NavBar component that appears at the top of the page.
 * It contains links to different pages and a user avatar dropdown.
 * The component is responsive and adapts to different screen sizes.
 * @returns NavBar component
 */
export const NavBar = () => {
  const { isAuthenticated } = useAuth();
  const { userData } = useUserData();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    supabase.auth.signOut();
    setMobileMenuOpen(false);
    navigate("/");
  };

  const navLinks = [
    { to: "/", label: "Home" },
    ...(isAuthenticated
      ? [
          { to: "/dashboard", label: "Dashboard" },
          ...(userData?.role === UserRole.STUDENT
            ? [{ to: "/quiz", label: "Review" }]
            : []),
        ]
      : []),
    { to: "/download", label: "Download" },
    { to: "/about", label: "About" },
  ];

  return (
    <nav className="flex justify-between items-center py-3 pl-8 pr-4 md:pl-12 md:pr-6 bg-white dark:bg-black text-black dark:text-white fixed w-full top-0 z-50 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center space-x-4">
        <Link to="/" className="flex items-center space-x-2 md:space-x-3">
          <img src={cloverLogo} alt="Clover Logo" className="h-10" />
          <span className="text-2xl font-bold tracking-wide text-[#50B498]">
            CLOVER
          </span>
        </Link>
      </div>

      <div className="hidden lg:flex items-center justify-center absolute left-1/2 transform -translate-x-1/2">
        <ul className="flex space-x-12 text-lg items-center ml-8">
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className="hover:text-[#50B498] transition">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="hidden lg:flex items-center space-x-4">
        {isAuthenticated ? (
          <>
            <DropdownAvatar handleSignOut={handleSignOut} />
            <ThemeToggle />
          </>
        ) : (
          <>
            <Link to="/login">
              <Button className="bg-[#50B498] hover:bg-[#468585] text-white font-medium text-md">
                Log In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="text-[#5AC8A8] hover:bg-gray-200 bg-gray-50 font-medium text-md">
                Sign Up
              </Button>
            </Link>
            <ThemeToggle />
          </>
        )}
      </div>

      <div className="lg:hidden flex items-center space-x-3">
        {isAuthenticated && <DropdownAvatar handleSignOut={handleSignOut} />}
        <ThemeToggle />
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Menu className="!h-6 !w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <div className="flex flex-col h-full pt-4">
              <div className="flex-1 flex flex-col items-start gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="w-full py-3 px-4 text-lg hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <div className="pb-6 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                {isAuthenticated ? (
                  <Button
                    onClick={handleSignOut}
                    className="w-full py-4 text-lg bg-orange-700 hover:bg-orange-500 text-white"
                  >
                    Sign Out
                  </Button>
                ) : (
                  <>
                    <Link to="/login">
                      <Button
                        className="w-full py-4 text-lg bg-[#50B498] hover:bg-[#468585] text-white"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Log In
                      </Button>
                    </Link>
                    <Link to="/signup">
                      <Button
                        className="mt-4 w-full py-4 text-lg text-[#5AC8A8] hover:bg-gray-200 bg-gray-50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign Up
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default NavBar;

/**
 * DropdownAvatar component that displays the user's avatar and provides a dropdown menu for profile, settings, and sign out options.
 * It is used in the NavBar component for authenticated users.
 * @param props - Props for the DropdownAvatar component
 * @param props.handleSignOut - Function to handle sign out action
 * @returns
 */
export const DropdownAvatar = ({
  handleSignOut,
}: {
  handleSignOut: () => void;
}) => {
  const { userData, loading } = useUserData();

  if (loading) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-12 w-12 rounded-full">
          <Avatar className="w-10 h-10">
            {userData?.avatar_url ? (
              <img
                src={userData.avatar_url ?? ""}
                alt={`${userData.firstName} ${userData.lastName}`}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <AvatarFallback className="bg-[#50B498] text-white text-lg font-semibold">
                {userData?.firstName.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40" align="end" forceMount>
        <DropdownMenuItem asChild>
          <Link to="/profile" className="w-full cursor-pointer py-2">
            <User2 className="h-4 w-4" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="w-full cursor-pointer py-2">
            <Settings2 /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400 py-2"
        >
          <DoorOpen /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
