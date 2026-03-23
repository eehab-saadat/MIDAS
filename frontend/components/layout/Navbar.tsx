"use client";

import Link from "next/link";

export function Navbar() {
  return (
    <nav className="navbar min-h-0 bg-base-200 shadow-sm px-4 py-2 md:px-8 ">
      <div className="navbar-start flex-1">
        <Link href="/dashboard" className="text-base-content font-bold text-lg">
          <img src="/logo.png" alt="MIDAS Logo" className="w-10 inline" />
        </Link>
      </div>

      <div className="navbar-center hidden lg:flex">
        <p className="text-sm text-base-content/70"></p>
      </div>

      <div className="navbar-end flex-1">
        {/* Profile Menu */}
        <div className="dropdown dropdown-end" tabIndex={0} role="button">
          <div className="avatar placeholder cursor-pointer hover:opacity-75 transition-opacity">
            <div className="bg-primary text-primary-content rounded-full w-9 h-9 flex items-center justify-center">
              <span className="text-sm font-semibold">DR</span>
            </div>
          </div>

          {/* Dropdown Menu */}
          <ul
            tabIndex={0}
            className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
          >
            <li>
              <a href="#" className="flex items-center justify-between">
                Profile
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center justify-between">
                Settings
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center justify-between">
                Help
              </a>
            </li>
            <li>
              <a href="/login" className="text-error">
                Logout
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
