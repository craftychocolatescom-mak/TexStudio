
import React, { useState, useEffect, useCallback } from 'react';
import { supabase, Project } from './services/supabaseClient';
import { LandingPage } from './components/LandingPage';
import { VisualizerModule } from './components/VisualizerModule';
import { PatternModule } from './components/PatternModule';
import { CuttingModule } from './components/CuttingModule';
import { SocialModule } from './components/SocialModule';
import { CostingModule } from './components/CostingModule';
import { Sidebar } from './components/Sidebar';
import { ProjectDashboard } from './components/ProjectDashboard';
import { HistoryItem, TabType } from './types';

// Supabase has replaced local storage persistence for history
const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>('visualizer');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setActiveProject(null);
  };

  const handleProjectSelect = (project: Project) => {
    setActiveProject(project);
    setActiveTab('visualizer');
    // TODO: Load project history from Supabase artifacts table
  };

  const addToHistory = useCallback((item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    // Legacy local state history for immediate UI feedback.
    // In next phase, this will save to `artifacts` table.
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: Date.now(),
    };
    setHistory(prev => [newItem, ...prev]);
  }, []);

  const handleSidebarTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[#020617] items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <LandingPage onLogin={() => { }} onLoadDemo={() => { }} />;
  }

  if (!activeProject) {
    return (
      <ProjectDashboard
        session={session}
        onSelectProject={handleProjectSelect}
        onLogout={handleLogout}
      />
    );
  }

  // Workspace View (Project Active)
  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#020617] text-slate-100 font-sans overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      <div className={`fixed lg:relative inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 no-print`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleSidebarTabChange}
          onLogout={handleLogout}
          activeProject={activeProject}
          onBackToDashboard={() => setActiveProject(null)}
        />
      </div>

      <main className="flex-1 overflow-y-auto relative scroll-smooth px-4 md:px-8 py-6 pb-24 lg:pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-8 no-print lg:hidden">
            <div className="flex items-center gap-2 text-indigo-400 font-black tracking-tighter text-lg">
              <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center text-white text-xs"><i className="fas fa-bolt"></i></div>
              TEXVISION
            </div>
            <button onClick={() => setIsSidebarOpen(true)} className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center"><i className="fas fa-bars"></i></button>
          </div>

          {activeTab === 'visualizer' && (
            <VisualizerModule
              onComplete={(data) => addToHistory({ type: 'visualizer', title: data.garmentName || 'Bespoke Build', previewUrl: data.technicalImageUrl, data })}
              onConfirmBuild={() => setActiveTab('pattern')}
              initialData={selectedHistoryItem?.data}
              activeProjectId={activeProject?.id}
              userId={session?.user?.id}
            />
          )}
          {activeTab === 'pattern' && (
            <PatternModule
              onComplete={(data) => addToHistory({ type: 'pattern', title: 'Pattern Build', data })}
              onSendToCutting={() => setActiveTab('cutting')}
              sourceResult={selectedHistoryItem?.data}
            />
          )}
          {activeTab === 'cutting' && <CuttingModule onComplete={(data) => addToHistory({ type: 'cutting', title: 'Cutting Build', data })} sourceResult={selectedHistoryItem?.data} activeProjectId={activeProject.id} userId={session.user.id} />}
          {activeTab === 'costing' && <CostingModule onComplete={(data) => addToHistory({ type: 'costing', title: 'Costing Build', data })} sourceResult={selectedHistoryItem?.data} activeProjectId={activeProject.id} userId={session.user.id} />}
          {activeTab === 'social' && <SocialModule onComplete={(data) => addToHistory({ type: 'social', title: 'Social Campaign', data })} sourceResult={selectedHistoryItem?.data} activeProjectId={activeProject.id} userId={session.user.id} />}
          {activeTab === 'history' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
              {history.length === 0 ? <div className="col-span-full py-32 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">Archives Empty</div> : history.map((item) => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 p-5 rounded-[32px] group space-y-4 cursor-pointer hover:border-indigo-500/50 transition-all">
                  <div className="aspect-[3/4] bg-white rounded-2xl overflow-hidden border border-slate-800 relative shadow-inner">
                    <img src={item.previewUrl} className="w-full h-full object-contain" alt="" />
                  </div>
                  <h4 className="font-bold text-sm truncate">{item.title}</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
