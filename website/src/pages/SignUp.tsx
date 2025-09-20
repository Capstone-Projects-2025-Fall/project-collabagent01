import SignUpForm from "../forms/SignUpForm";

/**
 * SignUp component that renders the sign-up form.
 * @returns SignUp component that displays the sign-up form.
 */
export const SignUp = () => {
  return (
    <div className="flex flex-col justify-center items-center w-full text-text h-[calc(100vh-12rem)]">
      <SignUpForm />
    </div>
  );
};
export default SignUp;
