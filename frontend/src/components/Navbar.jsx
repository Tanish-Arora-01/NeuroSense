import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Brain, Menu, X, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isLoggedIn, signOut, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isDoctor = user?.role === "doctor";

  const navLinks = [
    { name: "Home", href: "#home", active: true },
    { name: "About us", href: "#about", active: false },
    { name: "Features", href: "#features", active: false },
    { name: "Find Doctors", href: "#specialists", active: false },
  ];

  return (
    <nav className="w-full bg-cream px-8 py-8 lg:px-14 lg:py-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Brain className="h-9 w-9 text-green-primary lg:h-10 lg:w-10" />
          <span className="text-2xl font-bold tracking-tight text-gray-900 lg:text-3xl">
            Neuro<span className="text-green-primary">Sense</span>
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-12 md:flex">
          {navLinks.map((link) => (
            <div
              key={link.name}
              className="relative flex flex-col items-center"
            >
              <a
                href={link.href}
                className={`text-base font-medium transition-colors hover:text-green-primary ${
                  link.active ? "text-green-primary" : "text-gray-500"
                }`}
              >
                {link.name}
              </a>
              {link.active && (
                <span className="absolute -bottom-2 h-0.5 w-5 rounded-full bg-green-primary"></span>
              )}
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {isLoggedIn ? (
            <>
              {!isDoctor && (
                <button
                  onClick={() =>
                    document
                      .getElementById("assessment")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="rounded-full border-2 border-green-primary bg-transparent px-7 py-3 text-base font-semibold text-green-primary transition-all hover:bg-green-primary hover:text-white"
                >
                  Take Assessment
                </button>
              )}
              <Link
                to={isAdmin ? "/admin" : "/dashboard"}
                className="rounded-full bg-green-primary px-7 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-green-dark"
              >
                {isAdmin
                  ? "Admin Console"
                  : isDoctor
                    ? "Patient Records"
                    : "View Assessments"}
              </Link>
              <button
                onClick={signOut}
                className="ml-2 flex items-center gap-1.5 text-base font-medium text-gray-500 transition-colors hover:text-rose-500"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="text-base font-medium text-gray-600 transition-colors hover:text-green-primary"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="rounded-full border-2 border-green-primary bg-transparent px-9 py-3.5 text-base font-semibold text-green-primary transition-all hover:bg-green-primary hover:text-white"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="block text-gray-600 hover:text-green-primary md:hidden focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
        </button>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isOpen && (
        <div className="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-6 md:hidden">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className={`text-base font-medium hover:text-green-primary ${
                link.active ? "text-green-primary" : "text-gray-600"
              }`}
              onClick={() => setIsOpen(false)}
            >
              {link.name}
            </a>
          ))}
          {isLoggedIn ? (
            <>
              {!isDoctor && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    document
                      .getElementById("assessment")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="mt-2 w-full rounded-full border-2 border-green-primary bg-transparent px-6 py-3 text-center font-semibold text-green-primary hover:bg-green-primary hover:text-white transition-all"
                >
                  Take Assessment
                </button>
              )}
              <Link
                to={isAdmin ? "/admin" : "/dashboard"}
                onClick={() => setIsOpen(false)}
                className="mt-2 block w-full rounded-full bg-green-primary px-6 py-3 text-center font-semibold text-white hover:bg-green-dark transition-all shadow-sm"
              >
                {isAdmin
                  ? "Admin Console"
                  : isDoctor
                    ? "Patient Records"
                    : "View Assessments"}
              </Link>
              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 text-base font-medium text-gray-500 hover:text-rose-500"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="text-base font-medium text-gray-600 hover:text-green-primary"
                onClick={() => setIsOpen(false)}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="mt-2 block w-full rounded-full border-2 border-green-primary bg-transparent px-6 py-3 text-center font-semibold text-green-primary hover:bg-green-primary hover:text-white transition-all"
                onClick={() => setIsOpen(false)}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
