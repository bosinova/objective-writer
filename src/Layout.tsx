import React, { useEffect, useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { useUser, SignInButton, SignOutButton } from "@clerk/clerk-react";

type Theme = "dark" | "light";

export default function Layout() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem("objective-writer-theme");
    return stored === "light" || stored === "dark" ? stored : "dark";
  });

  const { isSignedIn, user, isLoaded } = useUser();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    window.localStorage.setItem("objective-writer-theme", theme);
  }, [theme]);

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
          <Link to="/pricing" className="pricingLink">
            Pricing
          </Link>
          <a href="https://outline-generator-rho.vercel.app"
  className="pricingLink"
  target="_blank"
  rel="noopener noreferrer"
>
  Outline Generator
</a>
          <button
            type="button"
            className="modeToggle"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="Toggle light and dark mode"
          >
            <span className="modeDot" aria-hidden="true" />
            <span className="modeLabel">{theme === "dark" ? "Dark mode" : "Light mode"}</span>
          </button>
          {isLoaded &&
            (isSignedIn ? (
              <div className="authUserRow">
                <span className="authUserName">
                  {user?.firstName ?? user?.primaryEmailAddress?.emailAddress ?? "Signed in"}
                </span>
                <SignOutButton>
                  <button type="button" className="authSignOutButton">
                    Sign Out
                  </button>
                </SignOutButton>
              </div>
            ) : (
              <SignInButton mode="modal">
                <button type="button" className="authSignInButton">
                  Sign In
                </button>
              </SignInButton>
            ))}
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
