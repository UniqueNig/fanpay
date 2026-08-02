import React, { createContext, useContext, useState, useCallback } from "react";

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const STORAGE_KEY = "fanfi-theme";

// The initial value is whatever the anti-flash inline script in index.html
// already stamped onto <html data-theme="..."> before React mounted — read
// it back here instead of recomputing, so the two never disagree.
const getInitialTheme = () =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  const applyTheme = useCallback((next) => {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === "dark" ? "light" : "dark");
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
