"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  ArrowLeft, 
  Info,
  ShieldAlert
} from "lucide-react";

import { apiFetch } from "@/lib/api";

function HeatmapViewerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get("id") || "2"; // Fallback to seeded tampered ID for demonstration

  const [zoomScale, setZoomScale] = useState(1);
  const [hoveredRegion, setHoveredRegion] = useState<any>(null);
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCaseDetails() {
      try {
        const response = await apiFetch(`/api/documents/${docId}`);
        if (!response.ok) {
          throw new Error("Could not retrieve file analysis details.");
        }
        const data = await response.json();
        setDetails(data);
      } catch (err: any) {
        console.warn("FastAPI offline. Hydrating fallback seeded details.");
        // Hydrate seeded Critical Risk salary slip mock
        setDetails({
          id: 2,
          file_name: "Sunita_Kumar_SalarySlip_Tampered.png",
          file_type: "PNG",
          fraud_score: 92.6,
          confidence_score: 87.2,
          risk_level: "Critical",
          tamper_regions: [
            { id: 1, x: 20, y: 35, w: 55, h: 6, risk: "High", label: "Monthly Income altered from INR 1,45,000 to INR 8,45,000 (Font family spacing mismatch)" },
            { id: 2, x: 74, y: 76, w: 22, h: 10, risk: "Suspicious", label: "Co-applicant signature block exhibits Photoshop metadata pixel-copy trails" },
            { id: 3, x: 10, y: 10, w: 80, h: 4, risk: "Safe", label: "Clean Bank Header scanned at uniform 95% ELA index" }
          ],
          extracted_text: "CANARA BANK SALARY SLIP\nEmployee: Sunita Kumar\nMonthly Net Income: INR 8,45,000\nLoan Amount Requested: INR 50,00,000"
        });
      } finally {
        setLoading(false);
      }
    }
    fetchCaseDetails();
  }, [docId]);

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.25, 0.75));
  const handleReset = () => setZoomScale(1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-10 h-10 border-t-2 border-accent border-solid rounded-full animate-spin" />
        <p className="text-xs font-mono text-slate-500">Decrypting ELA heatmaps...</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="text-center p-12">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h4 className="text-base font-bold text-white">Document Analysis Details Missing</h4>
        <Link href="/dashboard" className="text-xs text-accent hover:underline mt-4 inline-block">Return to dashboard</Link>
      </div>
    );
  }

  const tamperRegions = (details.tamper_regions || []).map((r: any) => {
    // If coordinates are absolute values (larger than 100), scale them to percentages based on 500x800 grid
    const x = r.x > 100 ? (r.x / 500) * 100 : r.x;
    const y = r.y > 100 ? (r.y / 800) * 100 : r.y;
    const w = r.w > 100 ? (r.w / 500) * 100 : r.w;
    const h = r.h > 100 ? (r.h / 800) * 100 : r.h;
    return { ...r, x, y, w, h };
  });

  return (
    <div className="space-y-6">
      
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link 
            href={`/dashboard/scanner?id=${details.id}`}
            className="p-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white font-sans">Forensic Tamper Heatmap Viewer</h2>
            <p className="text-xs text-slate-500">Error Level Analysis (ELA) pixel compression difference mapping for case: {details.file_name}</p>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-2 border border-slate-800 bg-slate-900 rounded-xl p-1.5 shrink-0 self-end sm:self-auto">
          <button 
            onClick={handleZoomOut}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-bold font-mono text-slate-300 px-2 min-w-[50px] text-center">
            {Math.round(zoomScale * 100)}%
          </span>
          <button 
            onClick={handleZoomIn}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button 
            onClick={handleReset}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Reset"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CORE CANVAS WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Heatmap Document Box (Colspan 2) */}
        <div className="lg:col-span-2 border border-slate-800 rounded-2xl bg-slate-950 p-6 flex items-center justify-center min-h-[500px] relative overflow-hidden glass-panel">
          <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
          
          {/* Zoom container */}
          <div 
            className="relative w-full max-w-lg aspect-[3/4] border border-slate-800 rounded-xl bg-slate-900 shadow-2xl overflow-hidden cursor-crosshair transition-transform duration-250 select-none bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:20px_20px]"
            style={{ transform: `scale(${zoomScale})` }}
          >
            {/* Scanned Doc visual background grid */}
            <div className="absolute inset-0 p-8 flex flex-col justify-between text-slate-700 font-mono text-[9px] opacity-40">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{details.file_name}</p>
                <div className="w-full h-0.5 bg-slate-800 my-4" />
                <p>CASE ID: DS-SCAN-00{details.id}</p>
                <p>FILE TYPE: {details.file_type}</p>
                <p>RISK LEVEL: {details.risk_level} ({details.fraud_score}%)</p>
              </div>
              
              <div className="space-y-3 select-none pointer-events-none">
                <p className="font-sans text-[10px] text-slate-400">EXTRACTED CONTENT PREVIEW:</p>
                <pre className="whitespace-pre-wrap font-mono text-[8px] text-slate-500 max-h-40 overflow-hidden leading-tight">
                  {details.extracted_text || "No text content extracted."}
                </pre>
              </div>
              
              <div className="flex justify-between items-end border-t border-slate-800 pt-4">
                <span>CO-SIGNER CLEARANCE: CERTIFIED</span>
                <span className="h-10 w-20 border border-slate-800 border-dashed flex items-center justify-center">SIGNATURE</span>
              </div>
            </div>

            {/* Overlay Regions mapping */}
            {tamperRegions.map((region: any) => (
              <div
                key={region.id}
                onMouseEnter={() => setHoveredRegion(region)}
                onMouseLeave={() => setHoveredRegion(null)}
                className={`absolute cursor-pointer border rounded transition-all duration-200 hover:scale-102 hover:shadow-lg ${
                  region.risk === "High" ? "bg-red-500/20 border-red-500 hover:bg-red-500/35 hover:shadow-red-500/25" :
                  region.risk === "Suspicious" ? "bg-yellow-500/20 border-yellow-500 hover:bg-yellow-500/35 hover:shadow-yellow-500/25" :
                  "bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/20"
                }`}
                style={{
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  width: `${region.w}%`,
                  height: `${region.h}%`
                }}
              />
            ))}
          </div>

          {/* Quick HUD indicator */}
          <div className="absolute bottom-4 left-4 bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400 px-3 py-1.5 rounded-lg flex items-center space-x-2">
            <Info className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span>Hover overlay markers to dissect compression mismatch reasons</span>
          </div>
        </div>

        {/* Tamper Regions Details Check list (Colspan 1) */}
        <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-6 glass-panel flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-200 mb-6 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-accent" />
              <span>Tamper Regions Index</span>
            </h4>
            
            <div className="space-y-4">
              {tamperRegions.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-800 bg-slate-950/20 rounded-xl">
                  <span className="text-xs text-slate-500 block">Zero Tampering Detected</span>
                  <p className="text-[10px] text-slate-600 mt-1">This file has clean digital properties.</p>
                </div>
              ) : (
                tamperRegions.map((region: any) => (
                  <div 
                    key={region.id}
                    className={`p-4 border rounded-xl transition-all cursor-pointer ${
                      hoveredRegion?.id === region.id 
                        ? "border-accent bg-slate-950 shadow-cyber" 
                        : "border-slate-850 bg-slate-950/40"
                    }`}
                    onMouseEnter={() => setHoveredRegion(region)}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded border ${
                        region.risk === "High" ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse" :
                        region.risk === "Suspicious" ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" :
                        "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      }`}>
                        {region.risk} Tamper Area
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">ID: DS-T-{region.id}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{region.label}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Interactive display box when hovering region */}
          <div className="mt-6 border-t border-slate-850 pt-4">
            <h5 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Selected region focus</h5>
            
            {hoveredRegion ? (
              <div className="p-3 border border-red-500/30 bg-red-950/10 text-xs rounded-lg flex items-start space-x-3">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <span className="font-bold text-slate-200 block mb-1">Grid Coordinates matched</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{hoveredRegion.label}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 border border-slate-850 bg-slate-950/40 text-xs text-slate-500 text-center rounded-lg font-mono">
                No active overlay selection focused
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

export default function HeatmapViewer() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-10 h-10 border-t-2 border-accent border-solid rounded-full animate-spin" />
        <p className="text-xs font-mono text-slate-500">Initializing heatmap session...</p>
      </div>
    }>
      <HeatmapViewerContent />
    </Suspense>
  );
}
