import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

/**
 * PasswordReset component.
 * It allows the user to reset their password.
 * @returns PasswordReset component.
 */
export const PasswordResetForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [submit, setSubmit] = useState("");
  const [error, setError] = useState("");

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmit("Please check your email to confirm");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        //{redirectTo: "https://clover.nickrucinski.com/resetform"}
        { redirectTo: "http://localhost:5173/resetform" }
      );

      if (error) {
        setError("Invalid email or password.");
        return;
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to log in. Please try again.");
    }
  };

  return (
    <div className="card p-8 rounded-lg shadow-lg w-96">
      <h2 className="text-2xl font-bold text-center mb-6">
        Reset your password for CLOVER
      </h2>
      {submit && <p className="text-[#50B498] text-sm text-center">{submit}</p>}
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      {/* Password Reset Form */}
      <form onSubmit={handlePasswordReset} className="flex flex-col">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          required
        />
        <button
          type="submit"
          className="button-primary w-full bg-[#50B498] text-black py-2 rounded hover:bg-[#468585] transition"
        >
          Reset
        </button>
      </form>
    </div>
  );
};

export default PasswordResetForm;

export const PasswordResetCallback: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [canReset, setCanReset] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setCanReset(true);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError("Failed to reset password");
      } else {
        alert("Password reset successful!");
        window.location.href = "/login";
      }
    } catch (err) {
      setError("Unexpected error occurred");
    }
  };

  if (!canReset) {
    return <p className="text-center mt-4">Checking token...</p>;
  }

  return (
    <div className="card p-8 rounded-lg shadow-lg w-96">
      <h2 className="text-2xl font-bold text-center mb-6">
        Reset your password for CLOVER
      </h2>
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col">
        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          required
        />
        <input
          type="password"
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="input-field"
          required
        />
        <button
          type="submit"
          className="button-primary w-full bg-[#50B498] text-black py-2 rounded hover:bg-[#468585] transition"
        >
          Reset Password
        </button>
      </form>
    </div>
  );
};
