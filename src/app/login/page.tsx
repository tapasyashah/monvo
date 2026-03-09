"use client";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"error" | "success">("error");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const signUp = async () => {
    setLoading(true); setMsg(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { setMsgType("error"); return setMsg(error.message); }
    setMsgType("success");
    setMsg("Account created! Check your email to confirm, then sign in.");
  };

  const signIn = async () => {
    setLoading(true); setMsg(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setMsgType("error"); return setMsg(error.message); }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-2">
            Monvo
          </p>
          <h1 className="text-2xl font-semibold text-neutral-50">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {mode === "signin"
              ? "Sign in to view your financial dashboard"
              : "Start understanding your finances"}
          </p>
        </div>
        {/* Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5 font-medium">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (mode === "signin" ? signIn() : signUp())}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition"
              />
            </div>
            {msg && (
              <p className={`text-xs ${msgType === "error" ? "text-red-400" : "text-green-400"}`}>
                {msg}
              </p>
            )}
            <button
              onClick={mode === "signin" ? signIn : signUp}
              disabled={loading}
              className="w-full bg-neutral-100 hover:bg-white text-neutral-900 font-medium text-sm py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </div>
        </div>
        {/* Toggle mode */}
        <p className="text-center text-xs text-neutral-600 mt-4">
          {mode === "signin" ? (
            <>Don&apos;t have an account?{" "}
              <button onClick={() => { setMode("signup"); setMsg(null); }} className="text-neutral-400 hover:text-neutral-200 transition">Sign up</button>
            </>
          ) : (
            <>Already have an account?{" "}
              <button onClick={() => { setMode("signin"); setMsg(null); }} className="text-neutral-400 hover:text-neutral-200 transition">Sign in</button>
            </>
          )}
        </p>
        <p className="text-center text-[11px] text-neutral-700 mt-6">
          Monvo is for personal use only.<br />Not financial advice.
        </p>
      </div>
    </div>
  );
}
