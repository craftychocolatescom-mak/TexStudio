
import React, { useState, useEffect } from 'react';
import { supabase, Project } from '../services/supabaseClient';

interface ProjectDashboardProps {
    session: any;
    onSelectProject: (project: Project) => void;
    onLogout: () => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ session, onSelectProject, onLogout }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDesc, setNewProjectDesc] = useState('');

    useEffect(() => {
        fetchProjects();
    }, [session]);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProjects(data || []);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('projects')
                .insert([
                    {
                        name: newProjectName,
                        description: newProjectDesc,
                        user_id: session.user.id
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            setProjects([data, ...projects]);
            setIsCreating(false);
            setNewProjectName('');
            setNewProjectDesc('');
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Failed to create project');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 font-sans p-6 md:p-12">
            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-500/20">TV</div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-white">TexVision Studio</h1>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Enterprise Workspace</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-bold text-white">{session.user.email}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pro License</p>
                        </div>
                        <button onClick={onLogout} className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all hover:border-slate-700">Logout</button>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Your Collections</h2>
                    <button onClick={() => setIsCreating(true)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2">
                        <i className="fas fa-plus"></i> New Project
                    </button>
                </div>

                {/* Create Modal overlay */}
                {isCreating && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[32px] p-8 space-y-6 shadow-2xl animate-fadeIn">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest">Initialize New Build</h3>
                            <form onSubmit={handleCreateProject} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Project Name</label>
                                    <input
                                        type="text"
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                        placeholder="e.g. Summer 2026 Capsue"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-indigo-500 transition-all"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Description (Optional)</label>
                                    <textarea
                                        value={newProjectDesc}
                                        onChange={(e) => setNewProjectDesc(e.target.value)}
                                        placeholder="Brief for this collection..."
                                        rows={3}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-medium text-slate-400 outline-none focus:border-indigo-500 transition-all resize-none"
                                    />
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-700">Cancel</button>
                                    <button type="submit" disabled={!newProjectName} className="flex-1 py-4 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">Create Project</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Grid */}
                {loading ? (
                    <div className="py-20 text-center space-y-4">
                        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Syncing Database...</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-[40px] bg-slate-900/20">
                        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-700 text-2xl"><i className="fas fa-folder-open"></i></div>
                        <h3 className="text-lg font-bold text-white mb-2">No Projects Found</h3>
                        <p className="text-slate-500 max-w-xs mx-auto text-sm">Create your first collection to start generating technical designs.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map(project => (
                            <div key={project.id} onClick={() => onSelectProject(project)} className="group bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-[32px] cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col h-64 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <i className="fas fa-arrow-right text-indigo-500 -rotate-45"></i>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-black text-white mb-2 line-clamp-2">{project.name}</h3>
                                    <p className="text-sm text-slate-400 font-medium line-clamp-3">{project.description || "No description provided."}</p>
                                </div>
                                <div className="pt-6 border-t border-slate-800 flex justify-between items-center mt-auto">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{new Date(project.created_at).toLocaleDateString()}</span>
                                    <span className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-bold text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">Open Studio</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
