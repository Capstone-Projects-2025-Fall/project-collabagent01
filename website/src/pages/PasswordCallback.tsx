import { PasswordResetCallback } from "../forms/PasswordResetForm";

/**
 * PasswordReset component that renders the password reset form.
 * @returns {JSX.Element} The Password Reset component.
 */
export const PasswordCallback = () => {
  return (
    <div className="flex flex-col justify-center items-center w-full text-text h-[calc(100vh-12rem)]">
      <PasswordResetCallback />
    </div>
  );
};
export default PasswordCallback;