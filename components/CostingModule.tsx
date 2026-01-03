
import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService.ts';
import { CostingData, BOMItem, LaborOp } from '../types.ts';
import { saveArtifactToSupabase } from '../utils/persistenceHelper';
import { generatePDF } from '../utils/pdfHelper';

interface CostingModuleProps {
   onComplete: (data: any) => void;
   sourceResult?: any;
   activeProjectId?: string;
   userId?: string;
}

const REGIONS = [
   { id: 'pakistan', label: 'Pakistan (Karachi)', rate: 0.12 }, // 2025 Market Adjusted
   { id: 'vietnam', label: 'Vietnam (HCMC)', rate: 0.15 },
   { id: 'bangladesh', label: 'Bangladesh (Dhaka)', rate: 0.085 },
   { id: 'india', label: 'India (Tiruppur)', rate: 0.11 },
   { id: 'sri-lanka', label: 'Sri Lanka (Colombo)', rate: 0.10 },
   { id: 'turkey', label: 'Turkey (Istanbul)', rate: 0.25 },
   { id: 'portugal', label: 'Portugal (Porto)', rate: 0.42 },
   { id: 'usa', label: 'USA (Los Angeles)', rate: 0.85 }
];

export const CostingModule: React.FC<CostingModuleProps> = ({ onComplete, sourceResult, activeProjectId, userId }) => {
   const [loading, setLoading] = useState(false);
   const [generatingPDF, setGeneratingPDF] = useState(false);
   const [costing, setCosting] = useState<CostingData | null>(null);
   const [activeTab, setActiveTab] = useState<'summary' | 'bom' | 'labor'>('summary');

   const [inputs, setInputs] = useState({
      region: 'pakistan',
      fabricGsm: 180,
      markerWidth: 150,
      markupPercentage: 45
   });

   useEffect(() => {
      if (sourceResult?.costingPreFilled) {
         setCosting(sourceResult.costingPreFilled);
         if (sourceResult.costingPreFilled.region) {
            setInputs(prev => ({ ...prev, region: sourceResult.costingPreFilled.region }));
         }
      }
   }, [sourceResult]);

   const handleInputChange = (field: string, value: any) => {
      setInputs(prev => ({ ...prev, [field]: value }));
   };

   const handleSimulate = async () => {
      if (!sourceResult) return;
      setLoading(true);
      try {
         const data = await geminiService.analyzeCosting(sourceResult, inputs);
         setCosting(data);
         setCosting(data);

         if (activeProjectId && userId) {
            saveArtifactToSupabase(userId, activeProjectId, 'costing', 'Cost Sheet', data);
         }

         onComplete(data);
      } catch (err) {
         console.error(err);
         alert("Cost simulation failed. Please check your API configuration.");
      } finally {
         setLoading(false);
      }
   };

   const handleExportCSV = () => {
      // ... existing code ...
   };

   const handleDownloadPDF = async () => {
      setGeneratingPDF(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      await generatePDF('cost-sheet-content', `CostSheet-${sourceResult?.garmentName || 'Draft'}`);
      setGeneratingPDF(false);
   };

   const calculateFinalPrice = () => {
      if (!costing) return { wholesale: 0, retail: 0 };
      const base = costing.estimatedCostPerUnit;
      const wholesale = base / (1 - (inputs.markupPercentage / 100));
      const retail = wholesale * 2.5;
      return { wholesale, retail };
   };

   if (!sourceResult) {
      return (
         <div className="text-center py-24 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
            <i className="fas fa-calculator text-4xl text-slate-700 mb-4"></i>
            <h3 className="text-xl font-bold">Awaiting Engineering Data</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-2">Costing requires a technical build to estimate BOM consumption and labor SMV.</p>
         </div>
      );
   }

   const prices = calculateFinalPrice();

   return (
      <div className="space-y-8 animate-fadeIn pb-12">
         <div className="flex justify-between items-end flex-wrap gap-4">
            <div>
               <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold flex items-center gap-3"><i className="fas fa-file-invoice-dollar text-indigo-400"></i> Financial Engineering</h2>
                  <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-black uppercase tracking-widest">
                     <i className="fas fa-microchip mr-1"></i> 2025 Market Indices
                  </span>
               </div>
               <p className="text-slate-500">Deconstructing technical complexity into current industrial margins.</p>
            </div>
            {costing && (
               <div className="flex gap-3">
                  <button onClick={handleExportCSV} className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-sm font-bold border border-slate-700 hover:bg-slate-700 transition-all flex items-center gap-2">
                     <i className="fas fa-download"></i> Export CSV
                  </button>
                  <button onClick={handleSimulate} disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center gap-2">
                     {loading ? <i className="fas fa-sync animate-spin"></i> : <i className="fas fa-calculator"></i>}
                     {loading ? 'Recalculating...' : 'Refresh Simulation'}
                  </button>
               </div>
            )}
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="space-y-6 lg:col-span-1">
               <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] shadow-xl space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-4">Production Parameters</h3>

                  <div className="space-y-4">
                     <div>
                        <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2 block">Assembly Region</label>
                        <select
                           value={inputs.region}
                           onChange={(e) => handleInputChange('region', e.target.value)}
                           className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-indigo-500"
                        >
                           {REGIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                        </select>
                     </div>

                     <div>
                        <div className="flex justify-between mb-2">
                           <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Target Margin</label>
                           <span className="text-[9px] text-indigo-400 font-black">{inputs.markupPercentage}%</span>
                        </div>
                        <input
                           type="range" min="10" max="80"
                           value={inputs.markupPercentage}
                           onChange={(e) => handleInputChange('markupPercentage', parseInt(e.target.value))}
                           className="w-full h-1 bg-slate-800 rounded-full appearance-none accent-indigo-500"
                        />
                     </div>
                  </div>
               </div>

               {costing && (
                  <div className="bg-indigo-600 p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden group animate-fadeIn">
                     <i className="fas fa-dollar-sign absolute -right-4 -bottom-4 text-8xl opacity-10 group-hover:scale-110 transition-transform"></i>
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">Target Wholesale</p>
                     <p className="text-4xl font-black">${prices.wholesale.toFixed(2)}</p>
                     <div className="mt-4 pt-4 border-t border-white/20">
                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">Suggested Retail (MSRP)</p>
                        <p className="text-xl font-bold">${prices.retail.toFixed(2)}</p>
                     </div>
                  </div>
               )}
            </div>

            <div className="lg:col-span-3 space-y-8">
               <div className="bg-slate-900 border border-slate-800 rounded-[40px] shadow-2xl overflow-hidden flex flex-col min-h-[600px]">
                  <div className="bg-slate-950 px-8 py-4 border-b border-slate-800 flex justify-between items-center flex-wrap gap-4">
                     <div className="flex gap-6">
                        {(['summary', 'bom', 'labor'] as const).map(tab => (
                           <button
                              key={tab}
                              onClick={() => setActiveTab(tab)}
                              disabled={!costing}
                              className={`text-[10px] font-black uppercase tracking-widest pb-4 border-b-2 transition-all ${activeTab === tab ? 'text-indigo-400 border-indigo-400' : 'text-slate-500 border-transparent hover:text-slate-300'} disabled:opacity-30 disabled:cursor-not-allowed`}
                           >
                              {tab === 'summary' ? 'Cost Summary' : tab === 'bom' ? 'Bill of Materials' : 'Labor Ops (SMV)'}
                           </button>
                        ))}
                     </div>
                     <button disabled={!costing} onClick={() => window.print()} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white disabled:opacity-30"><i className="fas fa-file-download mr-2"></i> Export PDF</button>
                  </div>

                  <div className="p-8 flex-1">
                     {loading ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                           <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                           <p className="text-indigo-400 font-mono text-xs tracking-widest uppercase">CRUNCHING FINANCIAL LOGIC...</p>
                        </div>
                     ) : costing ? (
                        <div className="animate-fadeIn">
                           {activeTab === 'summary' && (
                              <div className="space-y-12">
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-2">
                                       <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Base Unit Cost</p>
                                       <p className="text-3xl font-bold text-white">${costing.estimatedCostPerUnit.toFixed(2)}</p>
                                       <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold uppercase"><i className="fas fa-arrow-down"></i> Factory Price</div>
                                    </div>
                                    <div className="space-y-2">
                                       <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Est. Production Time</p>
                                       <p className="text-3xl font-bold text-white">{costing.totalLaborHours} Hours</p>
                                       <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold uppercase"><i className="fas fa-clock"></i> Assembly Loop</div>
                                    </div>
                                    <div className="space-y-2">
                                       <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Build Complexity</p>
                                       <p className="text-3xl font-bold text-white uppercase tracking-tight">{sourceResult.json?.productionDifficulty || 'HIGH'}</p>
                                       <div className="flex items-center gap-2 text-[10px] text-purple-400 font-bold uppercase"><i className="fas fa-project-diagram"></i> Multi-Operation</div>
                                    </div>
                                 </div>

                                 <div className="bg-slate-800/20 border border-slate-800 rounded-3xl p-8 space-y-8">
                                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-800 pb-4">Industrial Cost Breakdown</h4>
                                    <div className="space-y-6">
                                       {[
                                          { label: 'Direct Materials (BOM)', key: 'material', color: 'bg-emerald-500' },
                                          { label: 'Direct Labor (SMV)', key: 'labor', color: 'bg-indigo-500' },
                                          { label: 'Factory Overhead / G&A', key: 'overhead', color: 'bg-purple-500' }
                                       ].map(item => (
                                          <div key={item.key}>
                                             <div className="flex justify-between text-xs font-bold mb-2">
                                                <span className="text-slate-400 uppercase tracking-widest">{item.label}</span>
                                                <span className="text-white">${(costing.breakdown as any)[item.key].toFixed(2)}</span>
                                             </div>
                                             <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                                <div className={`${item.color} h-full transition-all duration-1000`} style={{ width: `${((costing.breakdown as any)[item.key] / costing.estimatedCostPerUnit) * 100}%` }}></div>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              </div>
                           )}

                           {activeTab === 'bom' && (
                              <div className="overflow-x-auto">
                                 <table className="w-full text-left">
                                    <thead className="text-[10px] text-slate-500 uppercase tracking-widest bg-slate-800/20">
                                       <tr>
                                          <th className="px-6 py-4">Item Component</th>
                                          <th className="px-6 py-4">Specification</th>
                                          <th className="px-6 py-4 text-center">Qty / Unit</th>
                                          <th className="px-6 py-4 text-right">Unit Price</th>
                                          <th className="px-6 py-4 text-right">Total</th>
                                       </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                       {costing.bom.map((item, i) => (
                                          <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                             <td className="px-6 py-4 font-bold text-white">{item.item}</td>
                                             <td className="px-6 py-4 text-slate-400">{item.specification}</td>
                                             <td className="px-6 py-4 text-center text-slate-300">{item.quantity} {item.unit}</td>
                                             <td className="px-6 py-4 text-right text-slate-500 font-mono">${item.unitPrice.toFixed(2)}</td>
                                             <td className="px-6 py-4 text-right text-indigo-400 font-bold font-mono">${item.total.toFixed(2)}</td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>
                           )}

                           {activeTab === 'labor' && (
                              <div className="overflow-x-auto">
                                 <table className="w-full text-left">
                                    <thead className="text-[10px] text-slate-500 uppercase tracking-widest bg-slate-800/20">
                                       <tr>
                                          <th className="px-6 py-4">Assembly Operation</th>
                                          <th className="px-6 py-4">Department</th>
                                          <th className="px-6 py-4 text-center">SMV (Min)</th>
                                          <th className="px-6 py-4 text-right">Rate/Min</th>
                                          <th className="px-6 py-4 text-right">Operation Cost</th>
                                       </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                       {costing.laborOps.map((op, i) => (
                                          <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                             <td className="px-6 py-4 font-bold text-white">{op.operation}</td>
                                             <td className="px-6 py-4"><span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase font-black">{op.department}</span></td>
                                             <td className="px-6 py-4 text-center text-emerald-400 font-bold">{op.smv}</td>
                                             <td className="px-6 py-4 text-right text-slate-500 font-mono">${op.ratePerMinute.toFixed(3)}</td>
                                             <td className="px-6 py-4 text-right text-indigo-400 font-bold font-mono">${op.total.toFixed(2)}</td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>
                           )}
                        </div>
                     ) : (
                        <div className="h-full flex flex-col items-center justify-center space-y-8 animate-fadeIn py-20">
                           <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center border-2 border-indigo-500/20 shadow-xl">
                              <i className="fas fa-clipboard-list text-slate-600 text-3xl"></i>
                           </div>
                           <div className="text-center space-y-3">
                              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-indigo-500/20">Analysis Queued</span>
                              <h4 className="text-xl font-bold text-slate-300 uppercase tracking-tight">Financial Engine Ready</h4>
                              <p className="text-slate-500 text-[10px] max-w-xs mx-auto uppercase tracking-widest leading-relaxed font-bold">Industrial BOM extraction and labor indexing requires technical verification.</p>
                           </div>
                           <button
                              onClick={handleSimulate}
                              className="px-12 py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-500 transition-all active:scale-95 flex items-center gap-4"
                           >
                              <i className="fas fa-play-circle text-lg"></i>
                              Initialize Costing Analysis
                           </button>
                        </div>
                     )}
                  </div>

                  <div className="bg-slate-950 p-6 flex gap-4 items-center">
                     <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
                        <i className="fas fa-shield-alt"></i>
                     </div>
                     <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                        Financial Logic Engine: Utilizing Gemini-3-Pro Visual Analysis to detect silhouette complexity and construction dependencies. Labor rates are calculated dynamically based on regional indices for {inputs.region.toUpperCase()}.
                     </p>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};
