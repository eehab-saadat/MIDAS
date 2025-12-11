// Authentication utilities for demo purposes
// This is hardcoded for demonstration - in production, use a proper auth service

export type UserRole = "doctor" | "receptionist";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthContext {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
}

// Demo users - hardcoded for testing
const DEMO_USERS = [
  {
    id: "1",
    email: "doctor@midas.com",
    password: "doctor123",
    name: "Dr. Sarah Smith",
    role: "doctor" as UserRole,
  },
  {
    id: "2",
    email: "nurse@midas.com",
    password: "nurse123",
    name: "Jane Nurse",
    role: "receptionist" as UserRole,
  },
];

// Get current user from localStorage
export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  
  const userStr = localStorage.getItem("midas_user");
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// Set current user in localStorage
export function setCurrentUser(user: User | null): void {
  if (typeof window === "undefined") return;
  
  if (user) {
    localStorage.setItem("midas_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("midas_user");
  }
}

// Login function
export async function loginUser(email: string, password: string): Promise<User> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  const user = DEMO_USERS.find(
    (u) => u.email === email && u.password === password
  );
  
  if (!user) {
    throw new Error("Invalid email or password");
  }
  
  const loggedInUser: User = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  
  setCurrentUser(loggedInUser);
  return loggedInUser;
}

// Signup function (demo - just adds to local users)
export async function signupUser(
  name: string,
  email: string,
  password: string,
  role: UserRole
): Promise<User> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  // Check if user already exists
  if (DEMO_USERS.some((u) => u.email === email)) {
    throw new Error("Email already registered");
  }
  
  const newUser: User = {
    id: String(DEMO_USERS.length + 1),
    email,
    name,
    role,
  };
  
  setCurrentUser(newUser);
  return newUser;
}

// Logout function
export function logoutUser(): void {
  setCurrentUser(null);
}
