
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface LandingPageProps {
  onLogin: () => void;
  onLoadDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onLoadDemo }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        alert(error.message);
      } else {
        onLogin();
      }
    } catch (err) {
      console.error(err);
      alert("Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col relative overflow-hidden font-sans">
      {/* Background Tech Grids */}
      <div className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(#312e81 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
          backgroundSize: '40px 40px, 80px 80px, 80px 80px',
          backgroundPosition: 'center center'
        }}>
      </div>

      {/* Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full"></div>

      {/* Header */}
      <header className="relative z-10 p-8 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3 text-white font-black text-2xl tracking-tighter">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/40">
            <i className="fas fa-bolt text-lg"></i>
          </div>
          TEXVISION
        </div>
        {/* Navigation links removed as requested */}
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

          {/* Hero Side */}
          <div className="space-y-10">
            <div className="space-y-4">
              <span className="inline-block px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                v2.4.0 • Industrial Synthesis Engine
              </span>
              <h1 className="text-5xl md:text-7xl font-black text-white leading-[0.9] tracking-tighter">
                THE FUTURE OF <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">PRE-PRODUCTION.</span>
              </h1>
              <p className="text-slate-400 text-lg md:text-xl max-w-lg leading-relaxed font-medium">
                TexVision Studio bridges the gap between creative sketch and factory floor with AI-driven technical synthesis, costing, and pattern logic.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                  <i className="fas fa-wand-magic-sparkles"></i>
                </div>
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Vision Synthesis</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                  <i className="fas fa-microchip"></i>
                </div>
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Pattern Logic</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-purple-400">
                  <i className="fas fa-calculator"></i>
                </div>
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cost Engineering</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                  <i className="fas fa-layer-group"></i>
                </div>
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Marker Nesting</div>
              </div>
            </div>
          </div>

          {/* Login Side */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-[40px] blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>

            <div className="relative bg-slate-900/80 backdrop-blur-3xl border border-white/5 p-10 md:p-14 rounded-[40px] shadow-2xl">
              <div className="text-center space-y-3 mb-12">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Studio Access</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Authorized Personnel Only</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Studio Identifier</label>
                  <div className="relative">
                    <i className="fas fa-at absolute left-5 top-1/2 -translate-y-1/2 text-slate-600"></i>
                    <input
                      type="email"
                      required
                      placeholder="admin@studio.vision"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Production Key</label>
                  <div className="relative">
                    <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-600"></i>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 pt-4">
                  <button
                    type="submit"
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all hover:-translate-y-1 active:translate-y-0"
                  >
                    Authenticate Access
                  </button>
                  <button
                    type="button"
                    onClick={onLoadDemo}
                    className="w-full py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-700 hover:border-indigo-500/50 transition-all"
                  >
                    Bypass to Testing Studio
                  </button>
                </div>
              </form>

              <div className="mt-12 pt-8 border-t border-slate-800/50 flex justify-between items-center text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">
                <span>System Secure</span>
                <span>Port 8080 Active</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="relative z-10 p-8 border-t border-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-black text-slate-500 uppercase tracking-widest max-w-7xl mx-auto w-full">
        <div className="flex gap-8">
          <span>&copy; 2025 TEXVISION STUDIO</span>
          <span>GLOBAL FABRIC NETWORK</span>
        </div>
        <div className="flex gap-8">
          <a href="#" className="hover:text-white transition-colors">Privacy Protocol</a>
          <a href="#" className="hover:text-white transition-colors">Industrial TOS</a>
        </div>
      </footer>
    </div>
  );
};
