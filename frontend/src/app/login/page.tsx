"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Key, User, ShieldCheck } from "lucide-react";
import { useStore } from "@/store";

export default function LoginPage() {
  const router = useRouter();
  const loginStore = useStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // OTP Verification Stage
  const [otpStage, setOtpStage] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Connect to FastAPI login
      const response = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Authentication failed. Verify credentials.");
      }

      const data = await response.json();

      if (data.otp_required) {
        // Trigger OTP Verification Screen
        setOtpStage(true);
      } else {
        // Finalize login (if OTP bypassed somehow)
        loginStore.login(data.username, data.role, data.access_token);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, otp_code: otpCode }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Invalid code. Enter 123456.");
      }

      const data = await response.json();
      
      // Store in Zustand state & redirect
      loginStore.login(data.username, data.role, data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
      <div className="absolute w-96 h-96 bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* LOGO */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="p-3 bg-cyan-950/60 border border-accent/20 rounded-2xl mb-4 shadow-cyber">
            <ShieldAlert className="w-8 h-8 text-accent animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-wider text-white">
            DOCUSHIELD <span className="text-accent text-base">AI</span>
          </h2>
          <p className="text-[10px] text-slate-500 tracking-widest uppercase">Canara Underwriting Security</p>
        </div>

        {/* CARD CONTAINER */}
        <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-2xl glass-panel relative overflow-hidden scanline">
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg text-center">
              {error}
            </div>
          )}

          {!otpStage ? (
            /* STANDARD LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-slate-200">System Authentication</h3>
                <p className="text-xs text-slate-500">Sign in to unlock forensic analysis sessions</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    required
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your system username"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-accent outline-none rounded-lg pl-10 pr-4 py-3 text-sm text-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Security Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-accent outline-none rounded-lg pl-10 pr-4 py-3 text-sm text-white transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="accent-accent" />
                  <span>Remember Session</span>
                </label>
                <Link href="#" className="hover:text-accent">Reset Password?</Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-accent text-slate-950 font-bold rounded-lg text-sm shadow-cyber hover:bg-cyan-400 hover:shadow-cyberGlow transition-all duration-300 flex justify-center items-center"
              >
                {loading ? "Authenticating credentials..." : "Access Secure Environment"}
              </button>

              <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-800/60">
                Need underwriter clearance? <Link href="/register" className="text-accent hover:underline">Register Account</Link>
              </div>
            </form>
          ) : (
            /* OTP VERIFICATION SHEET */
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center mb-4 flex flex-col items-center">
                <ShieldCheck className="w-12 h-12 text-accent mb-3 animate-bounce" />
                <h3 className="text-lg font-bold text-slate-200">MFA Code Required</h3>
                <p className="text-xs text-slate-500">6-digit verification code sent to your bank auth device</p>
                <p className="text-[10px] text-accent/80 font-mono mt-2 bg-cyan-950/40 border border-accent/20 px-2 py-0.5 rounded">
                  DEMO CODE: 123456
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase text-center mb-3">
                  Verification Code
                </label>
                <input
                  required
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="0 0 0 0 0 0"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-accent text-center tracking-[12px] outline-none rounded-lg py-3 text-lg font-bold text-white transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-accent text-slate-950 font-bold rounded-lg text-sm shadow-cyber hover:bg-cyan-400 hover:shadow-cyberGlow transition-all duration-300"
              >
                {loading ? "Verifying code..." : "Complete Auth Clearance"}
              </button>

              <button
                type="button"
                onClick={() => setOtpStage(false)}
                className="w-full text-center text-xs text-slate-500 hover:underline"
              >
                Back to Credentials
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
