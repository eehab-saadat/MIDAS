"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loginUser } from "@/lib/auth";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await loginUser(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">MIDAS</h1>
          <p className="text-muted-foreground">Medical Intelligence Diagnosis & Assessment System</p>
        </div>

        {/* Login Card */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to access your patient records and diagnosis tools</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="size-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10"
              >
                {isLoading && <Loader2 className="size-4 animate-spin" />}
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {/* Demo Credentials Helper */}
            <div className="mt-6 space-y-3 pt-6 border-t border-border/50">
              <p className="text-xs text-muted-foreground font-medium">Demo Credentials (Click to fill):</p>
              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => fillDemoCredentials("doctor@midas.com", "doctor123")}
                  className="w-full p-2 rounded-md bg-primary/5 border border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-colors text-left cursor-pointer"
                >
                  <p className="font-medium text-foreground">Doctor Account</p>
                  <p className="text-muted-foreground">Email: <span className="font-mono text-primary">doctor@midas.com</span></p>
                  <p className="text-muted-foreground">Password: <span className="font-mono text-primary">doctor123</span></p>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials("nurse@midas.com", "nurse123")}
                  className="w-full p-2 rounded-md bg-secondary/50 border border-secondary/20 hover:bg-secondary/60 hover:border-secondary/30 transition-colors text-left cursor-pointer"
                >
                  <p className="font-medium text-foreground">Receptionist Account</p>
                  <p className="text-muted-foreground">Email: <span className="font-mono text-secondary-foreground">nurse@midas.com</span></p>
                  <p className="text-muted-foreground">Password: <span className="font-mono text-secondary-foreground">nurse123</span></p>
                </button>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
