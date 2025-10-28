// components/theme-toggle.tsx
"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react"; // You'll need to add lucide-react if you haven't: npm install lucide-react

import { Button } from "@/components/ui/button"; // Assuming you've added the shadcn Button component

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const root = window.document.documentElement;
    if (root.classList.contains("dark")) {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  }, []);

  const toggleTheme = () => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.remove("dark");
      setTheme("light");
      localStorage.setItem("theme", "light");
    } else {
      root.classList.add("dark");
      setTheme("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  return (
    // <Button
    //   variant="default"
    //   size="icon"
    //   onClick={toggleTheme}
    //   className="bg-card dark:bg-card rounded-br-none rounded-bl-none"
    // >
    //   {theme === "light" ? (
    //     <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
    //   ) : (
    //     <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    //   )}
    //   <span className="sr-only">Toggle theme</span>
    // </Button>
    <div
      className="bg-card rounded-full p-1 mr-4 hover:bg-muted transition-colors"
      onClick={toggleTheme}
    >
      {/* <ArrowLeft className="h-4 w-4" /> */}
      {theme === "light" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </div>
  );
}
