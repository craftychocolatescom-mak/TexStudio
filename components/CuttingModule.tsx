
import React, { useState, useEffect, useRef } from 'react';
import { geminiService } from '../services/geminiService.ts';
import { CuttingData, SizeMix, NestingStrategy, Size, OutputProfile, FileExtension } from '../types.ts';
import { saveArtifactToSupabase } from '../utils/persistenceHelper';

interface CuttingModuleProps {
   onComplete: (data: any) => void;
   sourceResult?: any;
   activeProjectId?: string;
   userId?: string;
}

const STRATEGIES: { id: NestingStrategy; label: string; desc: string }[] = [
   { id: 'efficiency', label: 'Efficiency', desc: 'Max yield / minimum waste' },
   { id: 'grainline', label: 'Grain-Fix', desc: 'Absolute grain alignment' },
   { id: 'speed', label: 'High-Speed', desc: 'Optimized for CNC cutters' }
];

const FILE_TYPES: FileExtension[] = ['PLT', 'HPGL', 'DXF', 'PDF'];

const ALL_SIZES: Size[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'OS'];

export const CuttingModule: React.FC<CuttingModuleProps> = ({ onComplete, sourceResult, activeProjectId, userId }) => {
   const [loading, setLoading] = useState(false);
   const [cuttingData, setCuttingData] = useState<CuttingData | null>(null);
   const [fabricWidth, setFabricWidth] = useState(150);
   const [strategy, setStrategy] = useState<NestingStrategy>('efficiency');
   const [progress, setProgress] = useState(0);
   const [zoom, setZoom] = useState(1);
   const [pan, setPan] = useState({ x: 0, y: 0 });

   const [outputProfile, setOutputProfile] = useState<OutputProfile>('Plotter');
   const [fileExtension, setFileExtension] = useState<FileExtension>('PLT');
   const [verificationMode, setVerificationMode] = useState(false);

   const [advanced, setAdvanced] = useState({
      grainline: 'One-Way' as 'One-Way' | 'Two-Way',
      patternMatch: 'Solid' as 'Solid' | 'Stripe' | 'Plaid'
   });

   const [sizeMix, setSizeMix] = useState<SizeMix>(
      ALL_SIZES.reduce((acc, s) => ({ ...acc, [s]: s === 'M' ? 1 : 0 }), {} as SizeMix)
   );

   useEffect(() => {
      if (sourceResult?.cuttingPreFilled) setCuttingData(sourceResult.cuttingPreFilled);
   }, [sourceResult]);

   useEffect(() => {
      let interval: number;
      if (loading) {
         setProgress(0);
         interval = window.setInterval(() => {
            setProgress(prev => {
               const inc = prev < 60 ? 1.5 : prev < 90 ? 0.5 : 0.1;
               const next = prev + inc;
               return next >= 99.8 ? 99.8 : next;
            });
         }, 150);
      }
      return () => clearInterval(interval);
   }, [loading]);

   const handleComputeMarker = async () => {
      if (!sourceResult) return;
      setLoading(true);
      try {
         const data = await geminiService.generateCuttingMarker(
            sourceResult.technicalImageUrl,
            fabricWidth,
            sourceResult.analysis,
            sizeMix,
            strategy,
            { ...advanced, outputProfile, fileExtension }
         );
         setCuttingData(data);
         setCuttingData(data);

         if (activeProjectId && userId) {
            saveArtifactToSupabase(userId, activeProjectId, 'cutting', 'Cutting Marker', data, data.markerImageUrl);
         }

         onComplete(data);
      } catch (err) {
         console.error(err);
         alert("Marker optimization failed. Verify project access.");
      } finally {
         setLoading(false);
      }
   };

   const updateSize = (s: Size, val: number) => {
      setSizeMix(prev => ({ ...prev, [s]: Math.max(0, val) }));
   };

   const resetSizes = () => {
      setSizeMix(ALL_SIZES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as SizeMix));
   };

   if (!sourceResult) return (
      <div className="text-center py-24 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed animate-fadeIn">
         <i className="fas fa-cut text-4xl text-slate-700 mb-4"></i>
         <h3 className="text-xl font-bold">Cutting Loop Idle</h3>
         <p className="text-slate-500 max-w-sm mx-auto mt-2">Nesting requires a technical build to extract pattern silhouettes.</p>
      </div>
   );

   // Layout Helper to render grid cells with numbers
   const renderLayoutOverlay = () => {
      if (!cuttingData || !verificationMode) return null;

      if (outputProfile === 'A4_Tiled') {
         const cols = 8; // Simulated columns based on fabric width
         const rows = Math.ceil((cuttingData.totalPages || 1) / cols);
         const cells = [];
         for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
               const idx = r * cols + c + 1;
               if (idx <= (cuttingData.totalPages || 1)) {
                  cells.push(
                     <div key={idx} className="border border-indigo-500/30 flex items-start p-2 relative">
                        <span className="text-[8px] font-black text-indigo-500 bg-white/80 px-1 rounded">SHEET {idx}</span>
                        <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none"></div>
                     </div>
                  );
               }
            }
         }
         return (
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
               {cells}
            </div>
         );
      } else {
         // Plotter Meter Markers
         return (
            <div className="absolute inset-0 pointer-events-none flex">
               {[1, 2, 3, 4, 5].map(m => (
                  <div key={m} className="h-full border-l border-indigo-400/40 border-dashed flex-1 relative">
                     <span className="absolute top-2 left-2 text-[10px] font-black text-indigo-600 bg-white/90 px-2 rounded-full shadow-sm">{m}m MARK</span>
                  </div>
               ))}
            </div>
         );
      }
   };

   return (
      <div className="space-y-8 animate-fadeIn px-4 pb-24 lg:pb-12">
         <style>{`
          .marker-canvas { cursor: grab; transition: transform 0.1s ease-out; transform-origin: center; }
          .marker-canvas:active { cursor: grabbing; }
          .radar-sweep { position: absolute; inset: 0; background: linear-gradient(0deg, transparent 50%, rgba(99, 102, 241, 0.1) 50.1%); background-size: 100% 200%; animation: radar 3s linear infinite; pointer-events: none; }
          @keyframes radar { 0% { background-position: 0 0; } 100% { background-position: 0 200%; } }
          .verification-grid { pointer-events: none; }
       `}</style>

         <div className="flex justify-between items-end flex-wrap gap-6 no-print">
            <div>
               <h2 className="text-2xl font-bold flex items-center gap-3"><i className="fas fa-cut text-indigo-400"></i> Nesting Studio</h2>
               <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-black">Industrial Optimization Suite v4.0</p>
            </div>
            <div className="flex gap-3">
               <button onClick={resetSizes} className="px-6 py-3 bg-slate-800 text-slate-400 rounded-xl font-black uppercase text-[10px] hover:text-white transition-all">Clear All</button>
               <button onClick={handleComputeMarker} disabled={loading} className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center gap-3 active:scale-95">
                  {loading ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-microchip"></i>}
                  {loading ? `SYNTHESIZING: ${progress.toFixed(0)}%` : 'Compute Global Yield'}
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-1 space-y-8 no-print">
               <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] space-y-8 shadow-2xl">
                  <div className="space-y-6">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex justify-between items-center">Output Profile</label>
                        <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1">
                           {(['Plotter', 'A4_Tiled'] as OutputProfile[]).map(v => (
                              <button key={v} onClick={() => setOutputProfile(v)} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${outputProfile === v ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}>
                                 <i className={`fas ${v === 'Plotter' ? 'fa-scroll' : 'fa-file-lines'} mr-2`}></i>
                                 {v.replace('_', ' ')}
                              </button>
                           ))}
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">File Target</label>
                        <select value={fileExtension} onChange={(e) => setFileExtension(e.target.value as FileExtension)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-[10px] font-bold text-white outline-none focus:border-indigo-500">
                           {FILE_TYPES.map(v => <option key={v} value={v}>.{v} Format</option>)}
                        </select>
                     </div>

                     <div className="space-y-3 pt-4 border-t border-slate-800">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex justify-between items-center">Layout Verification</label>
                        <button
                           onClick={() => setVerificationMode(!verificationMode)}
                           disabled={!cuttingData}
                           className={`w-full py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-3 ${verificationMode ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                        >
                           <i className={`fas ${verificationMode ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                           {verificationMode ? 'Verification Active' : 'Toggle Sheet Overlay'}
                        </button>
                     </div>

                     <div className="space-y-3 pt-4 border-t border-slate-800">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex justify-between items-center">Fabric Width (CM) <span className="text-indigo-400">{fabricWidth}cm</span></label>
                        <input type="range" min="90" max="220" step="5" value={fabricWidth} onChange={(e) => setFabricWidth(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none accent-indigo-500" />
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nesting Strategy</label>
                        <div className="grid grid-cols-1 gap-2">
                           {STRATEGIES.map(s => (
                              <button key={s.id} onClick={() => setStrategy(s.id)} className={`text-left p-3 rounded-2xl border transition-all ${strategy === s.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                                 <p className="text-[10px] font-black uppercase tracking-widest mb-0.5">{s.label}</p>
                                 <p className="text-[8px] opacity-60 font-bold">{s.desc}</p>
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-800">
                     <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex justify-between">Size Distribution <span>{Object.values(sizeMix).reduce((a: number, b: number) => a + b, 0)} Units</span></p>
                     <div className="grid grid-cols-2 gap-3">
                        {ALL_SIZES.map(s => (
                           <div key={s} className="bg-slate-950 border border-slate-800 p-2.5 rounded-2xl flex items-center justify-between group hover:border-slate-700 transition-colors">
                              <span className="text-[10px] font-black text-slate-600 uppercase">{s}</span>
                              <div className="flex items-center gap-2">
                                 <button onClick={() => updateSize(s, sizeMix[s] - 1)} className="text-slate-700 hover:text-red-500"><i className="fas fa-minus text-[8px]"></i></button>
                                 <span className="text-xs font-black text-white w-4 text-center">{sizeMix[s]}</span>
                                 <button onClick={() => updateSize(s, sizeMix[s] + 1)} className="text-slate-700 hover:text-emerald-500"><i className="fas fa-plus text-[8px]"></i></button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-3 space-y-8">
               <div className="bg-slate-900 border border-slate-800 rounded-[48px] overflow-hidden flex flex-col min-h-[600px] shadow-2xl relative">
                  {loading && <div className="radar-sweep"></div>}
                  <div className="bg-slate-950 px-10 py-6 border-b border-slate-800 flex justify-between items-center">
                     <div className="flex gap-8">
                        <div>
                           <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Efficiency</p>
                           <p className={`text-xl font-black ${!cuttingData ? 'text-slate-800' : 'text-emerald-400'}`}>{cuttingData ? cuttingData.efficiency + '%' : '--%'}</p>
                        </div>
                        <div>
                           <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Consumption</p>
                           <p className={`text-xl font-black ${!cuttingData ? 'text-slate-800' : 'text-white'}`}>{cuttingData ? cuttingData.totalLengthUsed : '--m'}</p>
                        </div>
                        <div>
                           <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">{outputProfile === 'A4_Tiled' ? 'Total Pages' : 'Roll Scale'}</p>
                           <p className={`text-xl font-black ${!cuttingData ? 'text-slate-800' : 'text-white'}`}>{cuttingData ? (outputProfile === 'A4_Tiled' ? `${cuttingData.totalPages} Sheets` : '1:1 Vector') : '--'}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 no-print">
                        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
                           <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white"><i className="fas fa-search-minus"></i></button>
                           <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} className="px-3 text-[10px] font-black uppercase text-slate-500 hover:text-white">Reset</button>
                           <button onClick={() => setZoom(prev => Math.min(3, prev + 0.2))} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white"><i className="fas fa-search-plus"></i></button>
                        </div>
                        <button disabled={!cuttingData} onClick={() => window.print()} className="px-6 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white disabled:opacity-20 gap-2">
                           <i className="fas fa-download"></i> Export .{fileExtension}
                        </button>
                     </div>
                  </div>

                  <div className="flex-1 bg-white relative overflow-hidden flex items-center justify-center p-8">
                     {loading ? (
                        <div className="text-center space-y-6 z-10">
                           <div className="w-24 h-24 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin mx-auto flex items-center justify-center shadow-lg">
                              <span className="text-lg font-black text-indigo-600">{progress.toFixed(0)}%</span>
                           </div>
                           <div>
                              <p className="text-indigo-600 font-black uppercase text-lg tracking-widest animate-pulse">Encoding industrial {fileExtension} stream...</p>
                              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Iterating pattern orientations for {outputProfile === 'A4_Tiled' ? 'A4 sheet tiling' : 'continuous roll nesting'}</p>
                           </div>
                        </div>
                     ) : cuttingData ? (
                        <div className="relative marker-canvas shadow-inner" style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}>
                           <img src={cuttingData.markerImageUrl} className="max-w-none w-[1200px] h-auto object-contain shadow-2xl" alt="Marker Layout" />
                           {/* Verification Overlay Layer */}
                           {renderLayoutOverlay()}
                           {outputProfile === 'A4_Tiled' && !verificationMode && (
                              <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)', backgroundSize: '100px 140px' }}></div>
                           )}
                        </div>
                     ) : (
                        <div className="text-center opacity-20 pointer-events-none">
                           <i className={`fas ${outputProfile === 'Plotter' ? 'fa-vector-square' : 'fa-paste'} text-[120px] text-slate-300 mb-8`}></i>
                           <p className="text-slate-400 font-black uppercase text-2xl tracking-[0.2em]">Build Null</p>
                        </div>
                     )}
                  </div>

                  <div className="bg-slate-950 p-10 grid grid-cols-1 md:grid-cols-2 gap-12 no-print border-t border-slate-800">
                     <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><i className="fas fa-terminal text-indigo-500"></i> Nesting Metadata</h4>
                        <ul className="grid grid-cols-1 gap-3">
                           {(cuttingData?.cuttingInstructions || ["Verify fabric width against roll specs", "Check tension before laying", "Align first edge to zero-point"]).map((inst, i) => (
                              <li key={i} className="flex gap-3 text-[11px] font-medium text-slate-400 bg-slate-900/50 p-3 rounded-xl border border-slate-900">
                                 <span className="w-5 h-5 bg-indigo-500/10 text-indigo-400 rounded flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</span>
                                 {inst}
                              </li>
                           ))}
                        </ul>
                     </div>
                     <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-3xl p-6 flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-6">
                           <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Yield Distribution</p>
                           <span className="text-xs font-black text-indigo-300">{cuttingData?.efficiency || 0}% Efficient</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mb-8">
                           <div className="bg-indigo-50 h-full transition-all duration-1000" style={{ width: `${cuttingData?.efficiency || 0}%` }}></div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                           <div>
                              <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Target Device</p>
                              <p className="text-lg font-black text-white">{outputProfile === 'Plotter' ? 'Industrial CAD' : 'Standard Inkjet'}</p>
                           </div>
                           <div>
                              <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Data Path</p>
                              <p className="text-lg font-black text-emerald-400">Vector {fileExtension}</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};
