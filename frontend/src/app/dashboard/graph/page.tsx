"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Network, 
  ArrowLeft, 
  HelpCircle, 
  ShieldAlert, 
  Info,
  ChevronRight,
  Sparkles
} from "lucide-react";

interface Node {
  id: string;
  label: string;
  type: "Applicant" | "Property" | "Loan" | "Branch" | "Co-applicant";
  status: "Clean" | "Suspicious" | "Critical";
  details: string;
}

interface Edge {
  source: string;
  target: string;
  relation: string;
}

export default function GraphIntelligence() {
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    async function fetchNetworkData() {
      try {
        const response = await fetch("http://localhost:8000/api/graph/network");
        if (response.ok) {
          const data = await response.json();
          setNodes(data.nodes);
          setEdges(data.links);
          setAlerts(data.fraud_alerts);
          // Auto-select first Critical node for focus
          const crit = data.nodes.find((n: any) => n.status === "Critical");
          if (crit) setSelectedNode(crit);
        }
      } catch (err) {
        console.warn("FastAPI offline. Hydrating mock Neo4j nodes.");
        const mockNodes: Node[] = [
          { id: "A1", label: "Ramesh Kumar", type: "Applicant", status: "Clean", details: "Credit Score: 780 | Low Risk" },
          { id: "A2", label: "Sunita Kumar", type: "Applicant", status: "Critical", details: "Linked to Tampered Salary Slip | Critical Risk" },
          { id: "A3", label: "Vijay Mallya", type: "Applicant", status: "Critical", details: "Blacklisted Applicant | High Risk" },
          { id: "P1", label: "45 Residency Rd, Bng", type: "Property", status: "Suspicious", details: "Shared by 3 independent loan requests" },
          { id: "P2", label: "12 M.G. Road, Bng", type: "Property", status: "Clean", details: "Verified title deed" },
          { id: "L1", label: "Loan #5892 (INR 50L)", type: "Loan", status: "Clean", details: "Status: Under Review" },
          { id: "L2", label: "Loan #9102 (INR 85L)", type: "Loan", status: "Critical", details: "Status: Suspended (Tampering detected)" },
          { id: "L3", label: "Loan #2214 (INR 1.2Cr)", type: "Loan", status: "Critical", details: "Status: Flagged" },
          { id: "B1", label: "Canara Bank - MG Road", type: "Branch", status: "Clean", details: "Bangalore Urban" },
          { id: "B2", label: "Canara Bank - Indiranagar", type: "Branch", status: "Clean", details: "Bangalore East" },
          { id: "C1", label: "Karan Malhotra", type: "Co-applicant", status: "Suspicious", details: "Linked to 4 defaulted loans" }
        ];

        const mockEdges: Edge[] = [
          { source: "A1", target: "L1", relation: "APPLIED_FOR" },
          { source: "A1", target: "P1", relation: "COLLATERAL_OWNER" },
          { source: "L1", target: "B1", relation: "ORIGINATED_AT" },
          { source: "A2", target: "L2", relation: "APPLIED_FOR" },
          { source: "A2", target: "P1", relation: "COLLATERAL_OWNER" },
          { source: "A2", target: "C1", relation: "CO_APPLICANT" },
          { source: "L2", target: "B2", relation: "ORIGINATED_AT" },
          { source: "A3", target: "L3", relation: "APPLIED_FOR" },
          { source: "A3", target: "P1", relation: "COLLATERAL_OWNER" },
          { source: "A3", target: "C1", relation: "CO_APPLICANT" },
          { source: "L3", target: "B1", relation: "ORIGINATED_AT" }
        ];

        const mockAlerts = [
          "Multiple independent applicants (Ramesh Kumar, Sunita Kumar, Vijay Mallya) sharing the exact same property collateral (45 Residency Rd, Bng).",
          "Co-applicant Karan Malhotra is linked to multiple critical risk loan applications across different branches (MG Road, Indiranagar)."
        ];

        setNodes(mockNodes);
        setEdges(mockEdges);
        setAlerts(mockAlerts);
        setSelectedNode(mockNodes[1]); // Sunita Kumar
      } finally {
        setLoading(false);
      }
    }
    fetchNetworkData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-10 h-10 border-t-2 border-accent border-solid rounded-full animate-spin" />
        <p className="text-xs font-mono text-slate-500">Querying Neo4j Graph Data Science nodes...</p>
      </div>
    );
  }

  // Pre-calculate positions for rendering nodes nicely in SVG box (circle layout centered at 250,220)
  const nodePositions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((node, i) => {
    const angle = (i * 2 * Math.PI) / nodes.length;
    const radius = node.type === "Property" || node.type === "Co-applicant" ? 110 : 180;
    nodePositions[node.id] = {
      x: 250 + radius * Math.cos(angle),
      y: 220 + radius * Math.sin(angle)
    };
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex items-center space-x-3">
        <Link 
          href="/dashboard"
          className="p-2 border border-slate-800 rounded-lg text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">Graph Fraud Ring Intelligence</h2>
          <p className="text-xs text-slate-500">Neo4j visualization tracking shared collateral, co-applicants, and loan cycles</p>
        </div>
      </div>

      {/* GRAPH CANVAS & INFO SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG Graph Visual Panel (Colspan 2) */}
        <div className="lg:col-span-2 border border-slate-800 rounded-2xl bg-slate-950 p-6 flex flex-col justify-between min-h-[500px] relative overflow-hidden glass-panel">
          <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
          
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">NEO4J GDS LINK ANALYSIS PANEL</span>
            <div className="flex items-center space-x-3 text-[10px] text-slate-400">
              <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> <span>Critical Risk</span></span>
              <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> <span>Suspicious</span></span>
              <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> <span>Clean</span></span>
            </div>
          </div>

          {/* Interactive SVG Render */}
          <div className="flex-1 flex items-center justify-center">
            <svg viewBox="0 0 500 440" className="w-full max-w-xl h-auto select-none overflow-visible">
              
              {/* Render edges */}
              {edges.map((edge, idx) => {
                const posS = nodePositions[edge.source];
                const posT = nodePositions[edge.target];
                if (!posS || !posT) return null;
                
                // Check if edge is linked to selected node for highlight
                const isHighlighted = selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);

                return (
                  <g key={idx}>
                    <line
                      x1={posS.x}
                      y1={posS.y}
                      x2={posT.x}
                      y2={posT.y}
                      stroke={isHighlighted ? "#00E5FF" : "#1e293b"}
                      strokeWidth={isHighlighted ? 2.5 : 1}
                      strokeDasharray={edge.relation === "CO_APPLICANT" ? "4,4" : "0"}
                      className="transition-all"
                    />
                    
                    {/* Render relation label at midpoint */}
                    {isHighlighted && (
                      <rect
                        x={(posS.x + posT.x) / 2 - 35}
                        y={(posS.y + posT.y) / 2 - 7}
                        width="70"
                        height="14"
                        rx="3"
                        fill="#0f172a"
                        stroke="#00E5FF"
                        strokeWidth="0.5"
                      />
                    )}
                    {isHighlighted && (
                      <text
                        x={(posS.x + posT.x) / 2}
                        y={(posS.y + posT.y) / 2 + 3}
                        textAnchor="middle"
                        fill="#00E5FF"
                        fontSize="7"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {edge.relation}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Render nodes */}
              {nodes.map((node) => {
                const pos = nodePositions[node.id];
                if (!pos) return null;
                
                const isSelected = selectedNode?.id === node.id;
                
                // Color mapping
                const color = node.status === "Critical" ? "#EF4444" : node.status === "Suspicious" ? "#EAB308" : "#22C55E";

                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer group"
                  >
                    {/* Pulsing ring for critical/selected nodes */}
                    {(node.status === "Critical" || isSelected) && (
                      <circle
                        r="24"
                        fill="none"
                        stroke={isSelected ? "#00E5FF" : color}
                        strokeWidth="1.5"
                        className="animate-ping"
                        style={{ animationDuration: '3s' }}
                      />
                    )}
                    
                    {/* Outer border circle */}
                    <circle
                      r="16"
                      fill="#0f172a"
                      stroke={isSelected ? "#00E5FF" : color}
                      strokeWidth={isSelected ? 3.0 : 1.5}
                      className="transition-all"
                    />

                    {/* Node Initials Label */}
                    <text
                      textAnchor="middle"
                      y="4"
                      fill="#fff"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {node.type.substring(0, 2).toUpperCase()}
                    </text>

                    {/* Tooltip on Node Text */}
                    <text
                      textAnchor="middle"
                      y="-22"
                      fill={isSelected ? "#00E5FF" : "#cbd5e1"}
                      fontSize="8"
                      fontWeight={isSelected ? "bold" : "normal"}
                      className="opacity-80 group-hover:opacity-100 transition-opacity"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}

            </svg>
          </div>

          <div className="absolute bottom-4 left-4 bg-slate-900/80 border border-slate-800 text-[10px] text-slate-500 px-3 py-1.5 rounded-lg flex items-center space-x-2">
            <Info className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span>Click nodes inside the network to view complete banking connections</span>
          </div>
        </div>

        {/* Selected Entity focus & Syndicate Alerts (Colspan 1) */}
        <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-6 glass-panel flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-200 mb-6 flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-accent" />
              <span>Syndicate Alerts</span>
            </h4>
            
            <div className="space-y-4 mb-6">
              {alerts.map((alert, idx) => (
                <div key={idx} className="p-3 bg-red-950/15 border border-red-500/20 text-xs text-red-400 rounded-xl leading-relaxed">
                  {alert}
                </div>
              ))}
            </div>
            
            {/* Selected Node Details Box */}
            {selectedNode && (
              <div className="border-t border-slate-850 pt-4">
                <h5 className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Entity Profile Focus</h5>
                
                <div className="p-4 border border-slate-800 bg-slate-950/60 rounded-xl space-y-3 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                    <span className="font-bold text-slate-200">{selectedNode.label}</span>
                    <span className={`text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded border ${
                      selectedNode.status === "Critical" ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse" :
                      selectedNode.status === "Suspicious" ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" :
                      "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    }`}>{selectedNode.status}</span>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block">Node Classification</span>
                    <span className="font-semibold text-slate-300 block">{selectedNode.type} Node</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase block">Connections Details</span>
                    <p className="text-slate-400 leading-relaxed text-[11px]">{selectedNode.details}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-850">
            <Link 
              href="/dashboard/upload"
              className="w-full py-3 border border-slate-800 hover:border-accent text-accent hover:bg-cyan-950/20 rounded-lg text-xs font-semibold flex justify-center items-center space-x-1.5 transition-all"
            >
              <span>Add Applicant Node</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
