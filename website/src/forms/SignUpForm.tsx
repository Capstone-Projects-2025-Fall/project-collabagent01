import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../api/auth";
import { supabase } from "../supabaseClient";
import { Eye, EyeOff } from "lucide-react";
// import Swal from "sweetalert2";

/**
 * SignUpForm component for user registration.
 * It allows users to create an account using email and password.
 * TODO: Add GitHub OAuth signup option.
 * @returns SignUpForm component for user registration.
 */
export const SignUpForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const { error } = await registerUser(
        firstName,
        lastName,
        email,
        password
      );

      if (error) {
        setError(error);
        return;
      }

      const data = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (data) {
        // Swal.fire({
        //   title: "Sign Up Successful",
        //   text: "Welcome to Clover! Please Sign In to continue.",
        //   toast: true,
        //   color: "#50B498",
        //   position: "top-end",
        //   allowOutsideClick: true,
        //   showConfirmButton: false,
        //   timer: 5000,
        // });
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      console.error("Sign-up error:", err);
      setError("Failed to sign up. Please try again.");
    }
  };

  return (
    <div className="card p-8 rounded-lg shadow-lg w-96">
      <h2 className="text-2xl font-bold text-center mb-6">
        Create Your Clover Account
      </h2>
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      <form onSubmit={handleSignUp} className="flex flex-col">
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="input-field"
          required
        />
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="input-field"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          required
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field w-full pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-6 transform -translate-y-1/2 focus:outline-none"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-500" />
            ) : (
              <Eye className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>
        <button
          type="submit"
          className="button-primary w-full bg-[#50B498] py-2 rounded hover:bg-[#468585] transition"
        >
          Sign Up
        </button>
      </form>
    </div>
  );
};

export default SignUpForm;
