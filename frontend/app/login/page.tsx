"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in on mount
    setIsVisible(true);
  }, []);

  return (
    <div
      className={`flex min-h-screen w-full flex-col md:flex-row bg-base-100 transition-opacity duration-1000 ease-in-out ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Left side / Top side: Splased Branding/Hero */}
      <div className="flex flex-col justify-center items-center w-full md:flex-[0.55] p-24 md:p-32 bg-base-300 relative text-center">
        <div className="relative w-full h-full drop-shadow-2xl">
          <Image
            src="/logo-full.png"
            alt="MIDAS Logo"
            fill
            className="object-contain"
            priority
            unoptimized
          />
        </div>
        {/* <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4 max-w-[80%] leading-snug">
          Multi-Input Diagnostic Aid System
        </h1> */}
      </div>

      {/* Right side / Bottom side: Login Form */}
      <div className="flex justify-center items-center w-full md:flex-[0.45] p-8 md:p-12">
        <div className="card bg-base-100 w-full max-w-sm shadow-xl border border-base-200">
          <div className="card-body p-6">
            <h2 className="card-title text-2xl font-bold mb-1">Welcome Back</h2>
            <p className="text-base-content/70 text-sm mb-2">
              Please sign in to your account
            </p>

            <form className="fieldset gap-3">
              {/* Email Input */}
              <div>
                <legend className="fieldset-legend font-semibold">Email</legend>
                <input
                  type="email"
                  className="input validator w-full"
                  placeholder="doctor@hospital.com"
                  required
                />
              </div>

              {/* Password Input */}
              <div className="mt-1">
                <legend className="fieldset-legend font-semibold">
                  Password
                </legend>
                <input
                  type="password"
                  className="input validator w-full"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <p className="validator-hint">
                  Password must be at least 6 characters.
                </p>
              </div>

              {/* Options Row */}
              <div className="flex items-center justify-between mt-1 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-sm"
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="#"
                  className="link link-hover text-primary font-medium"
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit Action */}
              <div className="card-actions justify-end mt-4">
                <button
                  type="submit"
                  className="btn btn-primary w-full shadow-lg shadow-primary/30"
                >
                  Sign In
                </button>
              </div>

              <div className="divider text-xs text-base-content/50 my-4">
                OR
              </div>

              {/* Alternate / Provider Login (Placeholder) */}
              <button
                type="button"
                className="btn btn-outline btn-block border-base-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  width="24px"
                  height="24px"
                >
                  <path
                    fill="#FFC107"
                    d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                </svg>
                Continue with Google
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
