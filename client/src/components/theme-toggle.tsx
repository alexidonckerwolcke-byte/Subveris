import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

function getThemeKey(userId?: string) {
  return userId ? `theme-${userId}` : 'theme-guest';
}

function getInitialTheme(userId?: string): "light" | "dark" {
  if (typeof window === "undefined") return "light";

  const stored = localStorage.getItem(getThemeKey(userId));
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

export function ThemeToggle() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<"light" | "dark">(() => getInitialTheme(user?.id));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initialTheme = getInitialTheme(user?.id);
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, [user]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem(getThemeKey(user?.id), newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" data-testid="button-theme-toggle">
        <div className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
}
