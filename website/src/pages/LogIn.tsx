import LoginForm from "../forms/LogInForm";

/**
 * LogIn component that renders the login form.
 * @returns {JSX.Element} The LogIn component.
 */
export const LogIn = () => {
  return (
    <div className="flex flex-col justify-center items-center w-full text-text h-[calc(100vh-12rem)]">
      <LoginForm />
    </div>
  );
};
export default LogIn;
