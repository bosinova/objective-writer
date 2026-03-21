import React, { useEffect, useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { useUser, SignInButton, UserButton } from "@clerk/clerk-react";

type Theme = "dark" | "light";

export default function Layout() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("objective-writer-theme");
    return stored === "light" || stored === "dark" ? stored : "dark";
  });

  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    window.localStorage.setItem("objective-writer-theme", theme);
  }, [theme]);

  function renderAuth() {
    if (!isLoaded) return null;
    if (isSignedIn) {
      return <UserButton afterSignOutUrl="/" />;
    }
    return (
      <SignInButton mode="modal">
        <button type="button" className="authSignInButton">Sign In</button>
      </SignInButton>
    );
  }

  return (
    <div className="appShell">
      <div className="topBar">
        <Link to="/" className="brand brandLink">
          <div className="logoMark" aria-hidden="true" />
          <div>
            <div className="brandName">Objective Writer</div>
            <div className="brandTag">Draft Bloom-aligned learning objectives in seconds</div>
          </div>
        </Link>
        <div className="topBarRight">
          <Link to="/pricing" className="pricingLink">Pricing</Link>
          <a href="https://outline-generator-rho.vercel.app" className="pricingLink" target="_blank" rel="noopener noreferrer">Outline Generator</a>
          {isLoaded && isSignedIn && (
            <Link to="/dashboard" className="pricingLink">My Projects</Link>
          )}
          <button
            type="button"
            className="themeToggle"
            data-theme={theme}
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            <span className="themeToggleTrack" aria-hidden="true">
              <span className="themeToggleDot" />
            </span>
            <span className="themeToggleLabel">{theme === "dark" ? "Dark" : "Light"}</span>
          </button>
          {renderAuth()}
          <span className="chip">Powered by Claude</span>
        </div>
      </div>
      <main className="layoutMain">
        <Outlet />
      </main>
      <footer className="appFooter">
        <span>Objective Writer</span>
        <span className="dot">·</span>
        <span>Prism Learning Design</span>
      </footer>
    </div>
  );
}
