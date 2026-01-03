
import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService.ts';
import { PatternData, Size, PatternPiece } from '../types.ts';
import { saveArtifactToSupabase } from '../utils/persistenceHelper';

interface PatternModuleProps {
   onComplete: (data: any) => void;
   onSendToCutting?: (data: any) => void;
   sourceResult?: any;
   activeProjectId?: string;
   userId?: string;
}

type Unit = 'cm' | 'in';
type GradingProfile = 'Standard' | 'Athletic' | 'Relaxed' | 'Custom';
type Construction = 'Woven' | 'Knit';

export const PatternModule: React.FC<PatternModuleProps> = ({ onComplete, onSendToCutting, sourceResult, activeProjectId, userId }) => {
   const [loading, setLoading] = useState(false);
   const [patternData, setPatternData] = useState<PatternData | null>(null);
   const [error, setError] = useState<string | null>(null);
   const [workflowStep, setWorkflowStep] = useState<'sizing' | 'analyzing' | 'editor'>('sizing');
   const [progress, setProgress] = useState(0);

   const [sizingInstructions, setSizingInstructions] = useState("Standard range with 1cm tolerance.");
   const [targetSizing, setTargetSizing] = useState("S-XL (Base Size M)");
   const [toleranceLevel, setToleranceLevel] = useState("Industrial (+/- 1.0cm)");

   const [activeSize, setActiveSize] = useState<Size>('M');
   const [units, setUnits] = useState<Unit>('cm');
   const [gradingProfile, setGradingProfile] = useState<GradingProfile>('Standard');
   const [customMultiplier, setCustomMultiplier] = useState<number>(1.0);
   const [construction, setConstruction] = useState<Construction>('Woven');
   const [shrinkage, setShrinkage] = useState<number>(4);
   const [showSeamAllowance, setShowSeamAllowance] = useState(false);

   useEffect(() => {
      if (sourceResult?.patternPreFilled) {
         setPatternData(sourceResult.patternPreFilled);
         setWorkflowStep('editor');
      }
   }, [sourceResult]);

   useEffect(() => {
      let interval: number;
      if (workflowStep === 'analyzing') {
         setProgress(0);
         interval = window.setInterval(() => {
            setProgress(prev => {
               const next = prev + Math.random() * 5;
               return next >= 99 ? 99 : next;
            });
         }, 500);
      }
      return () => clearInterval(interval);
   }, [workflowStep]);

   const handleAnalyze = async () => {
      if (!sourceResult || loading) return;
      setLoading(true);
      setWorkflowStep('analyzing');
      try {
         const combinedInstructions = `Target: ${targetSizing}. Tolerance: ${toleranceLevel}. Custom: ${sizingInstructions}. Identify all individual pattern pieces for manufacturing.`;
         const data = await geminiService.analyzePattern(sourceResult.technicalImageUrl, sourceResult.analysis, combinedInstructions);

         if (targetSizing.includes('One Size')) {
            setActiveSize('OS');
         } else {
            setActiveSize('M');
         }

         const enrichedData = { ...data, construction, shrinkage };
         setPatternData(enrichedData);
         onComplete(enrichedData);
         setWorkflowStep('editor');
      } catch (err: any) {
         setError("Analysis failed. Switch to manual drafting.");
         setWorkflowStep('editor');
      } finally {
         setLoading(false);
      }
   };

   const calculateMeasurement = (baseValueStr: string, gradingStr: string, size: Size, isManual: boolean = false) => {
      const base = parseFloat(baseValueStr) || 0;
      const jumpRaw = parseFloat(gradingStr.replace(/[+-]/g, (m) => m === '+' ? '' : '-')) || 0;

      let multiplier = 0;
      if (size === 'XS') multiplier = -2;
      else if (size === 'S') multiplier = -1;
      else if (size === 'L') multiplier = 1;
      else if (size === 'XL') multiplier = 2;
      else if (size === 'XXL') multiplier = 3;
      else if (size === 'OS') multiplier = 0;

      const profileMult = isManual ? 1 : (gradingProfile === 'Athletic' ? 0.8 : gradingProfile === 'Relaxed' ? 1.4 : gradingProfile === 'Custom' ? customMultiplier : 1.0);
      let value = base + (jumpRaw * profileMult * multiplier);

      // Apply shrinkage and allowance from UI
      value = value * (1 + (shrinkage / 100));
      if (showSeamAllowance) value += 1.2;

      const final = units === 'in' ? value / 2.54 : value;
      return final.toFixed(units === 'in' ? 2 : 1) + units;
   };

   const getActiveSizeList = (): Size[] => {
      if (targetSizing.includes('One Size')) return ['OS'];
      if (targetSizing.includes('XS-XXL')) return ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      if (targetSizing.includes('S-XL')) return ['S', 'M', 'L', 'XL'];
      return ['M'];
   };

   if (!sourceResult) return (
      <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
         <i className="fas fa-bezier-curve text-4xl text-slate-700 mb-4"></i>
         <h3 className="text-xl font-bold">No Reference Selected</h3>
      </div>
   );

   if (workflowStep === 'sizing') return (
      <div className="max-w-3xl mx-auto py-12 space-y-12 animate-fadeIn">
         <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-white uppercase tracking-tight">Sizing Protocol</h2>
            <p className="text-slate-500 font-medium">Define industrial range and grading parameters.</p>
         </div>
         <div className="bg-slate-900 border border-slate-800 p-10 rounded-[48px] shadow-2xl space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Range</label>
                  <select value={targetSizing} onChange={(e) => setTargetSizing(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-indigo-500 transition-all">
                     <option>S-XL (Base Size M)</option>
                     <option>XS-XXL (Base Size L)</option>
                     <option>One Size (OS)</option>
                     <option>Custom Range</option>
                  </select>
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tolerance</label>
                  <select value={toleranceLevel} onChange={(e) => setToleranceLevel(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:border-indigo-500 transition-all">
                     <option>Industrial (+/- 1.0cm)</option>
                     <option>High Precision (+/- 0.5cm)</option>
                     <option>Loose Specs (+/- 2.0cm)</option>
                  </select>
               </div>
            </div>

            <button onClick={handleAnalyze} className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-500 transition-all active:scale-95">
               Synthesize Pattern Logic
            </button>
         </div>
      </div>
   );

   if (workflowStep === 'analyzing') return (
      <div className="py-48 flex flex-col items-center justify-center space-y-12 no-print animate-fadeIn">
         <div className="w-32 h-32 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin relative flex items-center justify-center">
            <span className="text-xs font-black text-indigo-400">{progress.toFixed(0)}%</span>
         </div>
         <div className="text-center space-y-4">
            <p className="text-indigo-400 font-mono text-xl tracking-widest uppercase font-black animate-pulse">Building POM Table...</p>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{progress.toFixed(0)}% COORDINATE MAPPING</p>
         </div>
      </div>
   );

   return (
      <div className="space-y-8 animate-fadeIn pb-20 px-4">
         <style>{`
          .toggle-switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
          }
          .toggle-switch input { opacity: 0; width: 0; height: 0; }
          .slider {
            position: absolute; cursor: pointer; inset: 0;
            background-color: #1e293b; border: 1px solid #334155;
            transition: .4s; border-radius: 34px;
          }
          .slider:before {
            position: absolute; content: ""; height: 16px; width: 16px;
            left: 3px; bottom: 3px; background-color: white;
            transition: .4s; border-radius: 50%;
          }
          input:checked + .slider { background-color: #4f46e5; border-color: #6366f1; }
          input:checked + .slider:before { transform: translateX(20px); }
       `}</style>

         <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
               <h2 className="text-2xl font-bold flex items-center gap-3"><i className="fas fa-ruler-combined text-indigo-400"></i> Pattern Studio</h2>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Industrial grading engine for {construction} garments.</p>
            </div>
            <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner">
               {getActiveSizeList().map(s => (
                  <button
                     key={s}
                     onClick={() => setActiveSize(s)}
                     className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSize === s ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                     {s}
                  </button>
               ))}
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Table Area */}
            <div className="lg:col-span-8 space-y-8">
               <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                        <thead className="text-[10px] text-slate-500 uppercase bg-slate-800/20 tracking-widest">
                           <tr>
                              <th className="px-8 py-5">Point of Measurement</th>
                              <th className="px-8 py-5 text-center">Base (Ref)</th>
                              <th className="px-8 py-5 text-right bg-indigo-600/5 text-indigo-400 border-l border-indigo-500/10">Graded ({activeSize})</th>
                           </tr>
                        </thead>
                        <tbody className="text-slate-300">
                           {patternData?.measurements.map((m, i) => (
                              <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                 <td className="px-8 py-5">
                                    <p className="font-bold text-white">{m.point}</p>
                                    <p className="text-[9px] text-slate-500 font-medium">{m.description}</p>
                                 </td>
                                 <td className="px-8 py-5 text-center font-mono font-bold text-slate-400">{m.m}</td>
                                 <td className="px-8 py-5 font-black font-mono text-right text-indigo-400 bg-indigo-600/5 border-l border-indigo-500/10">
                                    {calculateMeasurement(m.m, m.grading, activeSize)}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>

               <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 flex justify-between items-center no-print">
                  <div className="flex gap-4">
                     <button onClick={() => setUnits('cm')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${units === 'cm' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>CM</button>
                     <button onClick={() => setUnits('in')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${units === 'in' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>INCH</button>
                  </div>
                  <button onClick={() => window.print()} className="px-8 py-3 bg-white text-black rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all shadow-xl">
                     <i className="fas fa-file-pdf mr-2"></i> Download Spec Sheet
                  </button>
               </div>
            </div>

            {/* Right Config Column */}
            <div className="lg:col-span-4 space-y-6 no-print">
               {/* CAD CONFIG Block */}
               <div className="bg-slate-900 border border-slate-800 p-8 rounded-[32px] space-y-8 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                     <i className="fas fa-cog text-6xl"></i>
                  </div>
                  <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-3">
                     <i className="fas fa-ruler text-indigo-400"></i> CAD CONFIG
                  </h3>

                  <div className="space-y-6">
                     <div className="space-y-3">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Grading Profile</label>
                        <select
                           value={gradingProfile}
                           onChange={(e) => setGradingProfile(e.target.value as GradingProfile)}
                           className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-[11px] font-bold text-white outline-none focus:border-indigo-500 shadow-inner"
                        >
                           <option value="Standard">Standard (1.0x)</option>
                           <option value="Athletic">Athletic (0.8x)</option>
                           <option value="Relaxed">Relaxed (1.4x)</option>
                           <option value="Custom">Custom Multiplier</option>
                        </select>
                     </div>

                     <div className="space-y-3">
                        <div className="flex justify-between items-center">
                           <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Shrinkage (%)</label>
                           <span className="text-[11px] font-black text-indigo-400">{shrinkage}%</span>
                        </div>
                        <input
                           type="range" min="0" max="15" step="1"
                           value={shrinkage}
                           onChange={(e) => setShrinkage(parseInt(e.target.value))}
                           className="w-full h-1.5 bg-slate-800 rounded-full appearance-none accent-indigo-500"
                        />
                     </div>

                     <div className="flex justify-between items-center pt-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Seam Allowance</label>
                        <label className="toggle-switch">
                           <input type="checkbox" checked={showSeamAllowance} onChange={() => setShowSeamAllowance(!showSeamAllowance)} />
                           <span className="slider"></span>
                        </label>
                     </div>
                  </div>
               </div>

               {/* PIECE INVENTORY Block */}
               <div className="bg-slate-900 border border-slate-800 p-8 rounded-[32px] space-y-6 shadow-xl relative">
                  <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-3">
                     <i className="fas fa-layer-group text-indigo-400"></i> PIECE INVENTORY
                  </h3>

                  <div className="space-y-3">
                     {patternData?.pieceInventory && patternData.pieceInventory.length > 0 ? (
                        patternData.pieceInventory.map((piece, idx) => (
                           <div key={idx} className="bg-slate-950 border border-slate-800/60 p-4 rounded-2xl flex justify-between items-center group hover:border-slate-700 transition-colors">
                              <span className="text-[11px] font-bold text-slate-100">{piece.name}</span>
                              <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                                 x{piece.quantity}
                              </span>
                           </div>
                        ))
                     ) : (
                        <div className="text-center py-6 opacity-40">
                           <i className="fas fa-box-open text-2xl mb-2"></i>
                           <p className="text-[9px] font-black uppercase tracking-widest">Extraction Pending</p>
                        </div>
                     )}
                  </div>

                  {onSendToCutting && (
                     <button
                        onClick={() => onSendToCutting(patternData)}
                        className="w-full mt-4 py-4 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                     >
                        Push to Cutting Suite
                     </button>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
};
