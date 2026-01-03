
import React from 'react';
import { TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onLogout?: () => void;
  activeProject?: { name: string } | null;
  onBackToDashboard?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, activeProject, onBackToDashboard }) => {
  const navItems = [
    { id: 'visualizer', label: 'Visualizer', icon: 'fa-wand-magic-sparkles' },
    { id: 'pattern', label: 'Pattern Studio', icon: 'fa-bezier-curve' },
    { id: 'cutting', label: 'Cutting Studio', icon: 'fa-scissors' },
    { id: 'costing', label: 'Costing Studio', icon: 'fa-calculator' },
    { id: 'social', label: 'Social Studio', icon: 'fa-bullhorn' },
    { id: 'history', label: 'Archives', icon: 'fa-history' },
  ];

  return (
    <aside className="h-full w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-10 no-print shadow-2xl">
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 text-indigo-400 font-black text-xl mb-12">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <i className="fas fa-bolt"></i>
          </div>
          TEXVISION
          TEXVISION
        </div>

        {activeProject && onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="w-full mb-6 bg-slate-800 hover:bg-slate-700 text-slate-300 p-3 rounded-xl flex items-center gap-3 text-xs font-bold transition-all border border-slate-700 hover:border-indigo-500/50"
          >
            <i className="fas fa-arrow-left"></i>
            <div className="text-left overflow-hidden">
              <p className="text-[9px] uppercase tracking-widest text-slate-500">Project</p>
              <p className="truncate w-32">{activeProject.name}</p>
            </div>
          </button>
        )}

        <nav className="space-y-2.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all text-sm font-bold ${activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30'
                  : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-100'
                }`}
            >
              <i className={`fas ${item.icon} w-5 text-lg`}></i>
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-8 space-y-6 flex-shrink-0">
        <div className="p-5 bg-slate-800/40 rounded-3xl border border-slate-700/50">
          <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-3 text-center">Industrial License</p>
          <div className="w-full bg-slate-700/50 h-1 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full w-4/5"></div>
          </div>
        </div>

        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black shadow-lg">
              JD
            </div>
            <div>
              <p className="text-sm font-black text-white">Studio Admin</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Enterprise</p>
            </div>
          </div>
          {onLogout && (
            <button onClick={onLogout} className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <i className="fas fa-power-off"></i>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
