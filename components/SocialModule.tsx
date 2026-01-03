
import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { SocialMediaData } from '../types';
import { saveArtifactToSupabase } from '../utils/persistenceHelper';

interface SocialModuleProps {
  onComplete: (data: any) => void;
  sourceResult?: any;
  activeProjectId?: string;
  userId?: string;
}

export const SocialModule: React.FC<SocialModuleProps> = ({ onComplete, sourceResult, activeProjectId, userId }) => {
  const [loading, setLoading] = useState(false);
  const [socialData, setSocialData] = useState<SocialMediaData | null>(null);
  const [platform, setPlatform] = useState('Instagram Story');
  const [vibe, setVibe] = useState('Cinematic');

  useEffect(() => {
    if (sourceResult) {
      if (sourceResult.socialPreFilled) {
        setSocialData(sourceResult.socialPreFilled);
      } else {
        setSocialData(null);
      }
    }
  }, [sourceResult]);

  const handleGenerateAd = async () => {
    if (!sourceResult) return;
    setLoading(true);
    try {
      const data = await geminiService.generateSocialAd(sourceResult.modelImageUrl, platform, vibe);
      setSocialData(data);
      setSocialData(data);

      if (activeProjectId && userId) {
        saveArtifactToSupabase(userId, activeProjectId, 'social', `Ad: ${platform}`, data, data.adImageUrl);
      }

      onComplete(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCopy = (field: keyof SocialMediaData['copy'], value: string) => {
    if (!socialData) return;
    const updated = {
      ...socialData,
      copy: {
        ...socialData.copy,
        [field]: value
      }
    };
    setSocialData(updated);
    onComplete(updated);
  };

  if (!sourceResult) {
    return (
      <div className="text-center py-24 bg-slate-900/30 rounded-[40px] border border-slate-800 border-dashed animate-fadeIn">
        <i className="fas fa-bullhorn text-4xl text-slate-700 mb-6"></i>
        <h3 className="text-xl font-bold text-slate-300">No Lifestyle Context</h3>
        <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm font-medium">Marketing assets require a Lifestyle Model render as source material.</p>
      </div>
    );
  }

  const buildId = sourceResult.garmentName?.split('-')[1] || "4886";

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-3xl font-black flex items-center gap-3 tracking-tight">
              <i className="fas fa-bullhorn text-indigo-400"></i> Social Studio
            </h2>
            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-sm">
              <i className="fas fa-tag text-[8px]"></i> MARKETING BUILD-{buildId}
            </span>
          </div>
          <p className="text-slate-500 font-medium text-sm">Transforming garments into high-conversion marketing assets.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          {/* Campaign Settings Card */}
          <div className="bg-[#0f172a] p-10 rounded-[40px] border border-slate-800 shadow-2xl space-y-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 border-b border-slate-800/50 pb-4">Campaign Settings</h3>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest ml-1">Target Platform</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full bg-[#020617] border border-slate-800 rounded-2xl p-4 text-xs font-bold text-white focus:border-indigo-500 outline-none transition-all shadow-inner">
                  <option>Instagram Story</option>
                  <option>TikTok Feed</option>
                  <option>Pinterest Ad</option>
                  <option>Meta Carousel</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest ml-1">Brand Vibe</label>
                <select value={vibe} onChange={(e) => setVibe(e.target.value)} className="w-full bg-[#020617] border border-slate-800 rounded-2xl p-4 text-xs font-bold text-white focus:border-indigo-500 outline-none transition-all shadow-inner">
                  <option>Cinematic</option>
                  <option>Urban Tech</option>
                  <option>Minimalist Lux</option>
                  <option>Raw Industrial</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateAd}
              disabled={loading}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[24px] font-black uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              {loading ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>}
              {loading ? 'Synthesizing...' : 'Refresh Linked Creative'}
            </button>
          </div>

          {/* Dynamic Sync Status Card */}
          <div className="bg-[#0f172a] p-8 rounded-[32px] border border-slate-800 flex flex-col items-center justify-center text-center shadow-xl group">
            <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <i className="fas fa-sync text-indigo-400 animate-spin-slow"></i>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] leading-relaxed">
              Dynamic Sync: Assets are tied to build <span className="text-indigo-400">TXV-{sourceResult.garmentName?.substring(0, 3).toUpperCase() || 'BUI'}</span>
            </p>
            <style>{`
                @keyframes spin-slow {
                   from { transform: rotate(0deg); }
                   to { transform: rotate(360deg); }
                }
                .animate-spin-slow { animation: spin-slow 8s linear infinite; }
             `}</style>
          </div>
        </div>

        <div className="lg:col-span-8">
          {loading ? (
            <div className="h-[600px] bg-[#020617]/40 rounded-[48px] border-2 border-dashed border-slate-800 flex flex-col items-center justify-center space-y-6">
              <div className="w-16 h-16 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
              <div className="text-center">
                <p className="text-indigo-400 font-black text-sm uppercase tracking-[0.3em]">SYNTHESIZING MARKETING ASSETS</p>
                <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mt-2">Iterating creative variations via Gemini-3-Flash</p>
              </div>
            </div>
          ) : socialData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
              {/* Ad Preview Section */}
              <div className="rounded-[48px] overflow-hidden border border-slate-800 bg-black shadow-2xl relative aspect-[9/16] group">
                <img src={socialData.adImageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Social Ad Preview" />
                <div className="absolute inset-x-0 bottom-0 p-10 pt-48 bg-gradient-to-t from-black via-black/95 to-transparent">
                  <div className="space-y-6">
                    <p className="text-white font-black text-4xl leading-[0.95] uppercase tracking-tighter drop-shadow-2xl">
                      {socialData.copy.headline}
                    </p>
                    <div className="border-l-2 border-indigo-500/50 pl-5">
                      <p className="text-slate-300 text-[13px] font-medium leading-relaxed italic line-clamp-4">
                        "{socialData.copy.caption}"
                      </p>
                    </div>
                    <div className="pt-2">
                      <button className="w-full py-5 bg-white text-black text-[11px] font-black rounded-full uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-100 transition-all active:scale-95">
                        {socialData.copy.cta}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="absolute top-6 left-6 flex gap-2">
                  <span className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[8px] font-black text-white uppercase tracking-widest border border-white/10">Active Variation</span>
                </div>
              </div>

              {/* Copy Editor Section */}
              <div className="space-y-6">
                <div className="bg-[#0f172a] p-8 rounded-[40px] border border-slate-800 shadow-xl space-y-8">
                  <div className="flex justify-between items-center border-b border-slate-800/50 pb-5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">AI Campaign Copy</h3>
                    <i className="fas fa-pen-nib text-indigo-400 text-xs"></i>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">High-Impact Headline</label>
                      <input
                        type="text"
                        value={socialData.copy.headline}
                        onChange={(e) => handleEditCopy('headline', e.target.value)}
                        className="w-full bg-[#020617] border border-slate-800 rounded-2xl p-4 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Narrative Caption</label>
                      <textarea
                        value={socialData.copy.caption}
                        onChange={(e) => handleEditCopy('caption', e.target.value)}
                        rows={5}
                        className="w-full bg-[#020617] border border-slate-800 rounded-2xl p-5 text-sm font-medium text-slate-400 leading-relaxed focus:border-indigo-500 outline-none transition-all resize-none shadow-inner"
                      />
                    </div>
                    <div className="pt-2 space-y-3">
                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Industrial Hashtags</label>
                      <div className="flex flex-wrap gap-2">
                        {socialData.copy.hashtags.map(h => (
                          <span key={h} className="text-[9px] bg-slate-800/50 text-indigo-300 px-3 py-2 rounded-xl border border-slate-800 font-mono font-bold hover:text-indigo-400 transition-colors cursor-default">{h}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 rounded-[32px] border border-slate-800 p-8 flex flex-col items-center justify-center text-center group hover:bg-slate-900 transition-all cursor-pointer">
                  <div className="w-16 h-16 rounded-[20px] bg-[#020617] border border-slate-800 flex items-center justify-center mb-5 group-hover:scale-110 transition-all shadow-lg">
                    <i className="fas fa-copy text-slate-600 text-3xl"></i>
                  </div>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Variation Engine</p>
                  <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Enable A/B Testing Suite</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[650px] bg-[#020617]/60 rounded-[48px] border-2 border-dashed border-slate-800/60 flex flex-col items-center justify-center text-center p-12 relative group hover:bg-[#020617]/80 transition-all">
              <div className="space-y-6 opacity-30 group-hover:opacity-50 transition-opacity">
                <div className="relative">
                  <i className="fas fa-layer-group text-slate-700 text-6xl"></i>
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-indigo-500/20 rounded-full animate-ping"></div>
                </div>
                <div>
                  <h4 className="text-slate-500 font-black uppercase text-xl tracking-[0.2em]">Awaiting Marketing Synthesis</h4>
                  <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Ready for Creative Injection</p>
                </div>
              </div>
              {/* Decorative Tech Accents */}
              <div className="absolute top-10 left-10 w-4 h-4 border-l border-t border-slate-800"></div>
              <div className="absolute top-10 right-10 w-4 h-4 border-r border-t border-slate-800"></div>
              <div className="absolute bottom-10 left-10 w-4 h-4 border-l border-bottom border-slate-800"></div>
              <div className="absolute bottom-10 right-10 w-4 h-4 border-r border-bottom border-slate-800"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
