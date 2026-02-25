/**
 * theme-provider.tsx - Light/dark/system theme context
 * Persists theme choice in localStorage and applies the correct class to document.documentElement for CSS.
 */

import React, { createContext, useContext, useEffect, useState } from "react";

// Allowed theme values: "dark", "light", or "system" (follow OS preference)
type Theme = "dark" | "light" | "system";

// Props for the provider component (children plus optional defaultTheme and storageKey)
type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

// Value provided to consumers: current theme and a setter
type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

// Default context value (used before provider mounts or if useTheme is used outside provider)
const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

// React context that will hold theme state; components use useTheme() to read/update
const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

/**
 * ThemeSystemProvider - Wraps the app and manages theme state.
 * Reads initial theme from localStorage (or defaultTheme), applies class to <html>, and persists changes.
 */
function ThemeSystemProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  // Initialize theme from localStorage if available; otherwise use defaultTheme
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const stored = localStorage.getItem(storageKey);
    if (stored === "dark" || stored === "light" || stored === "system") return stored;
    return defaultTheme;
  });

  // Whenever theme changes, update the document root classes so CSS variables apply correctly
  useEffect(() => {
    const root = window.document.documentElement;

    // Remove both so we can add exactly one
    root.classList.remove("light", "dark");

    if (theme === "system") {
      // Use OS preference: matchMedia("prefers-color-scheme: dark") is true when OS is dark
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // When user selects a new theme, update state and persist to localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, newTheme);
    }
  };

  // Context value: current theme and setter
  const value: ThemeProviderState = {
    theme,
    setTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// Export as ThemeProvider so existing imports like "ThemeProvider" still work
export { ThemeSystemProvider as ThemeProvider };
export default ThemeSystemProvider;

/**
 * useTheme - Hook to read and update theme from any component inside ThemeProvider.
 * Throws if used outside the provider.
 */
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
