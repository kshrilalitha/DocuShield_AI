"use client";

import React from "react";
import Link from "next/link";
import { 
  Settings, 
  ArrowLeft, 
  Globe, 
  Moon, 
  Sun, 
  Lock,
  Check
} from "lucide-react";
import { useStore } from "@/store";
import { useAuthStore } from "@/store/authStore";

export default function SystemSettings() {
  const { user } = useAuthStore();
  const { 
    language, 
    setLanguage, 
    theme, 
    toggleTheme 
  } = useStore();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Top Banner */}
      <div className="flex items-center space-x-3">
        <Link 
          href="/dashboard"
          className="p-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">System Settings</h2>
          <p className="text-xs text-slate-500">Configure language controls, theme parameters, and security credentials</p>
        </div>
      </div>

      {/* SETTINGS CARD CONTROLS */}
      <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-2xl glass-panel relative overflow-hidden space-y-8">
        
        {/* Language Selection */}
        <div>
          <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center space-x-2.5">
            <Globe className="w-5 h-5 text-accent" />
            <span>Display Language Translation</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: "EN", name: "English (EN)" },
              { id: "HI", name: "Hindi (हिन्दी)" },
              { id: "KN", name: "Kannada (ಕನ್ನಡ)" }
            ].map(lang => (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id as any)}
                className={`p-4 border rounded-xl flex items-center justify-between transition-all ${
                  language === lang.id 
                    ? "border-accent bg-slate-950 text-white font-bold shadow-cyber" 
                    : "border-slate-800 bg-slate-950/20 text-slate-400 hover:text-white hover:bg-slate-950/40"
                }`}
              >
                <span className="text-xs">{lang.name}</span>
                {language === lang.id && <Check className="w-4 h-4 text-accent shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Theme Selection */}
        <div>
          <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center space-x-2.5">
            {theme === "light" ? <Sun className="w-5 h-5 text-accent" /> : <Moon className="w-5 h-5 text-accent" />}
            <span>Interface Styling Mode</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dark */}
            <button
              onClick={() => { if (theme === "light") toggleTheme(); }}
              className={`p-4 border rounded-xl flex items-center justify-between transition-all ${
                theme === "dark" 
                  ? "border-accent bg-slate-950 text-white font-bold shadow-cyber" 
                  : "border-slate-800 bg-slate-950/20 text-slate-400 hover:text-white"
              }`}
            >
              <span className="text-xs flex items-center space-x-2">
                <Moon className="w-4 h-4" />
                <span>Cybersecurity Dark Base</span>
              </span>
              {theme === "dark" && <Check className="w-4 h-4 text-accent shrink-0" />}
            </button>

            {/* Light */}
            <button
              onClick={() => { if (theme === "dark") toggleTheme(); }}
              className={`p-4 border rounded-xl flex items-center justify-between transition-all ${
                theme === "light" 
                  ? "border-accent bg-slate-950 text-slate-900 font-bold shadow-cyber" 
                  : "border-slate-800 bg-slate-950/20 text-slate-400 hover:text-white"
              }`}
            >
              <span className="text-xs flex items-center space-x-2">
                <Sun className="w-4 h-4" />
                <span>Premium Fintech Light Base</span>
              </span>
              {theme === "light" && <Check className="w-4 h-4 text-accent shrink-0" />}
            </button>
          </div>
        </div>

        {/* User Card info */}
        <div className="pt-6 border-t border-slate-800">
          <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center space-x-2.5">
            <Lock className="w-5 h-5 text-accent" />
            <span>Profile Credentials Details</span>
          </h4>

          <div className="p-4 border border-slate-800 bg-slate-950/60 rounded-xl space-y-3 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>System Officer Username</span>
              <span className="font-bold text-slate-200">{user?.username}</span>
            </div>
            <div className="flex justify-between">
              <span>Security Officer Role</span>
              <span className="font-mono font-bold text-accent uppercase">{user?.role}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
