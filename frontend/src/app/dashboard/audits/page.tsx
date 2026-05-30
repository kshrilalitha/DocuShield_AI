"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  History, 
  ArrowLeft, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";
import { useStore } from "@/store";

interface AuditLog {
  id: number;
  timestamp: string;
  username: string;
  event: string;
  status: string;
}

export default function AuditLogs() {
  const { user } = useStore();
  
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchLogs() {
      try {
        const token = localStorage.getItem("token") || "";
        const response = await fetch("http://localhost:8000/api/audits/", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setLogs(data);
        }
      } catch (err) {
        console.warn("FastAPI offline or permission denied. Seeding mock audits.");
        // Auditor mockup logs seeder
        setLogs([
          { id: 4, timestamp: "2026-05-29T14:15:30", username: "sharan_underwriter", event: "Triggered Multi-document cross check matching IDs", status: "Warn" },
          { id: 3, timestamp: "2026-05-29T14:10:12", username: "sharan_underwriter", event: "Uploaded and analyzed document: Sunita_Kumar_SalarySlip_Tampered.png", status: "Warn" },
          { id: 2, timestamp: "2026-05-28T09:12:00", username: "sharan_underwriter", event: "Uploaded and analyzed document: Ramesh_Kumar_SalarySlip.png", status: "Success" },
          { id: 1, timestamp: "2026-05-28T08:15:00", username: "admin_canara", event: "Assigned role Auditor to auditor_compliance", status: "Success" }
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  // Filter logs by search term
  const filteredLogs = logs.filter(log => 
    log.username.toLowerCase().includes(search.toLowerCase()) ||
    log.event.toLowerCase().includes(search.toLowerCase())
  );

  // RBAC Access Restriction
  if (user?.role !== "Admin" && user?.role !== "Auditor") {
    return (
      <div className="border border-red-500/20 rounded-2xl bg-red-950/5 p-8 text-center max-w-xl mx-auto mt-12">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h4 className="text-base font-bold text-white">Security Access Clearence Required</h4>
        <p className="text-xs text-slate-500 mt-2">
          Your keycard ({user?.role}) does not have permission to view immutable audit logs. Only Auditors and Admins can view this register.
        </p>
        <Link href="/dashboard" className="text-xs text-accent hover:underline mt-6 inline-block">Return to dashboard</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-10 h-10 border-t-2 border-accent border-solid rounded-full animate-spin" />
        <p className="text-xs font-mono text-slate-500">Decrypting audited ledger blocks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link 
            href="/dashboard"
            className="p-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">Tamper-Proof Audit Logs</h2>
            <p className="text-xs text-slate-500">Immutable ledger log tracking user, events, and document checks</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username, event..."
            className="bg-transparent border-none text-xs outline-none text-white w-full placeholder-slate-500"
          />
        </div>
      </div>

      {/* LEDGER TABLE */}
      <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-6 glass-panel relative overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-accent to-slate-900 absolute top-0 left-0 w-full" />
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
              <tr>
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Security Officer</th>
                <th className="pb-3">Event description</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/10 transition-colors">
                  <td className="py-4 font-mono text-slate-500" suppressHydrationWarning={true}>
                    {new Date(log.timestamp).toLocaleString("en-IN")}
                  </td>
                  <td className="py-4 font-bold text-slate-200">
                    {log.username}
                  </td>
                  <td className="py-4 text-slate-400">
                    {log.event}
                  </td>
                  <td className="py-4 text-right">
                    <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                      log.status === "Success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                      "bg-red-500/10 border-red-500/30 text-red-400"
                    }`}>
                      {log.status === "Success" ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                      )}
                      <span>{log.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
