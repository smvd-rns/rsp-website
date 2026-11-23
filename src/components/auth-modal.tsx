"use client";

import { Eye, EyeOff, Lock, Mail, Shield, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred.";
};

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (isSignUp) {
        if (!identifier.includes("@")) {
          throw new Error("Please provide a valid email address to create an account.");
        }
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName.trim() || identifier.split("@")[0],
            email: identifier.trim(),
            password,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to create account.");
        }
        setSuccessMsg("Account created successfully! Welcome.");
        window.dispatchEvent(new Event("auth-changed"));
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: identifier.trim(),
            password,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to sign in.");
        }
        window.dispatchEvent(new Event("auth-changed"));
        onClose();
      }
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const clientId =
        process.env.NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID ||
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      let origin = window.location.origin.replace(/\/+$/, "");
      if (origin.includes("127.0.0.1")) {
        origin = origin.replace("127.0.0.1", "localhost");
      }
      const redirectUri = `${origin}/api/auth/google`;
      const state = encodeURIComponent(window.location.pathname || "/");

      const googleOAuthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent("openid email profile")}&` +
        `state=${state}&` +
        `prompt=select_account`;

      window.location.href = googleOAuthUrl;
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md p-6 sm:p-7 flex flex-col gap-5 rounded-2xl shadow-2xl border border-border/80 bg-card"
        showCloseButton
      >
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-heading tracking-tight">
                {isSignUp ? "Create Your Account" : "Sign In to Radheshyam Das Media"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Access study materials, download audio discourses, and track favorites.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Self-Hosted Google One-Click OAuth Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full h-11 flex items-center justify-center gap-3 border border-border/90 bg-muted/30 hover:bg-muted/70 font-semibold text-sm rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <svg
            className="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            role="img"
            aria-label="Google"
          >
            <title>Google</title>
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.48 3.77v3.13h4v-3.13a11.53 11.53 0 0 0 3.53-8.62z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.88-3a7.48 7.48 0 0 1-11.23-3.95H.83v3.1A12 12 0 0 0 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M4.85 14.14a7.17 7.17 0 0 1 0-4.28V6.76H.83a12 12 0 0 0 0 10.48l4.02-3.1z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.92 11.92 0 0 0 12 0 12 12 0 0 0 .83 6.76l4.02 3.1a7.48 7.48 0 0 1 7.15-5.11z"
            />
          </svg>
          <span>Continue with Google</span>
        </Button>

        {/* Divider */}
        <div className="relative flex items-center my-0.5">
          <div className="grow border-t border-border/80" />
          <span className="shrink-0 text-xs text-muted-foreground font-semibold px-3 uppercase tracking-wider text-[10px]">
            or sign in with password
          </span>
          <div className="grow border-t border-border/80" />
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3.5">
          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="auth-name"
                className="text-xs font-semibold text-muted-foreground"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="auth-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Name (e.g. Radhamani Devi)"
                  className="pl-9 h-10 rounded-xl text-sm"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="auth-identifier"
              className="text-xs font-semibold text-muted-foreground"
            >
              {isSignUp ? "Email Address" : "Username or Email Address"}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="auth-identifier"
                type={isSignUp ? "email" : "text"}
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={isSignUp ? "you@example.com" : "Username or email@example.com"}
                className="pl-9 h-10 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="auth-password"
                className="text-xs font-semibold text-muted-foreground"
              >
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 pr-10 h-10 rounded-xl text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1 h-8 w-8 text-muted-foreground cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-xl font-medium animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-xs bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 rounded-xl font-medium animate-in fade-in">
              {successMsg}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl font-bold text-sm mt-1 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>
        </form>

        {/* Toggle between Sign In / Sign Up */}
        <div className="text-center text-xs text-muted-foreground font-medium pt-2 border-t border-border/60">
          {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className="font-bold text-primary hover:underline ml-1 cursor-pointer"
          >
            {isSignUp ? "Sign In" : "Register here"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
