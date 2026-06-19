"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError || !data.user) {
      setError(signInError?.message ?? "Couldn't sign you in.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded, is_suspended")
      .eq("id", data.user.id)
      .single();

    if (profile?.is_suspended) {
      setError("This account has been suspended pending review.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

   router.push(profile?.onboarded ? "/lobby" : "/onboarding");
   
  }

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="card w-full max-w-md">
        <h1 className="font-display text-2xl text-ink-900 mb-6">
          Welcome back
        </h1>

        <button onClick={handleGoogleSignIn} className="btn-secondary w-full mb-5">
          Continue with Google
        </button>
        <div className="flex items-center gap-3 mb-5 text-xs text-ink-500">
          <div className="h-px bg-ink-500/15 flex-1" />
          or use email
          <div className="h-px bg-ink-500/15 flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Email
            </label>

            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              Password
            </label>

            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-12"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-800 transition-colors"
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                <FontAwesomeIcon
                  icon={showPassword ? faEye : faEyeSlash}
                  className="h-4 w-4"
                />
              </button>
            </div>
          </div>

          {error && (
            <p className="text-clay-600 text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-ink-600">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="text-ink-900 font-medium hover:underline"
          >
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}