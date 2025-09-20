import PasswordReset from "../forms/PasswordResetForm";

/**
 * PasswordReset component that renders the password reset form.
 * @returns {JSX.Element} The Password Reset component.
 */
export const Reset = () => {
  return (
    <div className="flex flex-col justify-center items-center w-full text-text h-[calc(100vh-12rem)]">
      <PasswordReset />
    </div>
  );
};
export default Reset;