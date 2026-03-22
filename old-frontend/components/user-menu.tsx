"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logoutUser, type User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { LogOut, User as UserIcon, Shield, Users, Stethoscope } from "lucide-react";

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleLogout = () => {
    logoutUser();
    router.push("/login");
  };

  if (!user) {
    return null;
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const getRoleIcon = () => {
    switch (user.role) {
      case "doctor":
        return Shield;
      case "receptionist":
        return Users;
      case "patient":
        return UserIcon;
      default:
        return UserIcon;
    }
  };

  const RoleIcon = getRoleIcon();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:flex flex-col items-start text-xs">
          <span className="font-medium text-foreground">{user.name}</span>
          <span className="text-muted-foreground capitalize">{user.role}</span>
        </div>
      </button>

      {isOpen && (
        <Card className="absolute right-0 mt-2 w-56 p-0 shadow-lg z-50">
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="p-3 border-b border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <RoleIcon className="size-4 text-primary" />
              <span className="capitalize font-medium">
                {user.role === "doctor" ? "Doctor" : user.role === "receptionist" ? "Receptionist/Nurse" : "Patient"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {user.role === "doctor"
                ? "Full access to diagnosis tools and patient records"
                : user.role === "receptionist"
                ? "Patient management and list access"
                : "View your diagnosis results and medical history"}
            </p>
          </div>

          <div className="p-2">
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Sign Out
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
