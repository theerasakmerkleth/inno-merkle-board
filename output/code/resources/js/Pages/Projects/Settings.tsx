import React, { useState, FormEvent } from 'react';
import { useForm, router, Link, Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { AICommandCenter } from '@/components/AI/AICommandCenter';

interface User {
    id: number;
    name: string;
    email: string;
    project_role?: string;
}

interface Project {
    id: number;
    key: string;
    name: string;
    status: string;
    business_domain: string | null;
    ai_instructions: string | null;
    ai_model: string;
}

interface PageProps {
    project: Project;
    members: User[];
    available_users: User[];
    auth: any;
}

export default function ProjectSettings({ project, members, available_users, auth }: PageProps) {
    const [activeTab, setActiveTab] = useState<'general' | 'members' | 'ai'>('general');
    const isAdmin = auth?.user?.role === 'Admin' || auth?.user?.roles?.some((r: any) => r.name === 'Admin');
    
    // General & AI Settings Form
    const { data: projectData, setData: setProjectData, patch: patchProject, processing: updatingProject, errors: projectErrors } = useForm({
        name: project.name,
        status: project.status,
        business_domain: project.business_domain || '',
        ai_instructions: project.ai_instructions || '',
        ai_model: project.ai_model || 'gemini-3.1-pro-preview',
    });

    // Add Member Form
    const { data: memberData, setData: setMemberData, post: postMember, processing: addingMember, errors: memberErrors, reset: resetMember } = useForm({
        user_id: '',
        role: 'Contributor',
    });

    const handleProjectUpdate = (e: FormEvent) => {
        e.preventDefault();
        patchProject(`/projects/${project.id}`, {
            preserveScroll: true,
        });
    };

    const handleAddMember = (e: FormEvent) => {
        e.preventDefault();
        postMember(`/projects/${project.id}/members`, {
            preserveScroll: true,
            onSuccess: () => resetMember(),
        });
    };

    const handleRoleChange = (userId: number, role: string) => {
        router.patch(`/projects/${project.id}/members/${userId}`, { role }, { preserveScroll: true });
    };

    const handleRemoveMember = (userId: number) => {
        if (confirm("Remove this user from the project?")) {
            router.delete(`/projects/${project.id}/members/${userId}`, { preserveScroll: true });
        }
    };

    const handleDeleteProject = () => {
        const confirmName = prompt(`DANGER: Type "${project.name}" to confirm project deletion.`);
        if (confirmName === project.name) {
            router.delete(`/projects/${project.id}`);
        }
    };

    const breadcrumbs = (
        <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
            <span className="material-icons text-[14px]">folder_open</span>
            <span className="text-zinc-900">[{project.key}] {project.name}</span>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Settings | ${project.key}`} />
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
                
                {/* UNIFIED WORKSPACE HEADER (v57) */}
                <header className="px-4 md:px-8 pt-6 pb-0 border-b border-primary/5 flex-shrink-0 bg-background/80 backdrop-blur-xl sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Project Settings</h1>
                            <p className="text-xs text-zinc-500 font-medium">Configuration, team access, and AI instructions.</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <AICommandCenter projectId={project.id} projectKey={project.key} />
                                <div className="bg-primary/10 p-1.5 rounded-md text-primary flex items-center shadow-sm" title="Settings Mode">
                                    <span className="material-icons text-[20px]">settings</span>
                                </div>
                            </div>

                            {/* UNIFIED VIEW SWITCHER (v57) */}
                            <div className="hidden sm:flex bg-zinc-100/80 rounded-md p-1 gap-1 border border-zinc-200/50 shadow-inner">
                                <Link href={`/projects/${project?.key}/boards`} className="px-4 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Board</Link>
                                <Link href={`/projects/${project?.key}/roadmap`} className="px-4 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Roadmap</Link>
                                <Link href={`/projects/${project?.key}/reports`} className="px-4 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Reports</Link>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-8 items-center overflow-x-auto no-scrollbar pb-0.5">
                        <button onClick={() => setActiveTab('general')} className={`pb-3 text-[10px] uppercase tracking-[0.15em] font-black transition-all border-b-2 ${activeTab === 'general' ? 'border-primary text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>General</button>
                        <button onClick={() => setActiveTab('members')} className={`pb-3 text-[10px] uppercase tracking-[0.15em] font-black transition-all border-b-2 ${activeTab === 'members' ? 'border-primary text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>Team</button>
                        <button onClick={() => setActiveTab('ai')} className={`pb-3 text-[10px] uppercase tracking-[0.15em] font-black transition-all border-b-2 ${activeTab === 'ai' ? 'border-primary text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>AI Persona</button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 bg-[#F9FAFB] animate-in fade-in duration-300">
                    <div className="max-w-5xl mx-auto flex flex-col gap-12">
                        {activeTab === 'general' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div className="col-span-1">
                                    <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-2">Identity & Status</h2>
                                    <p className="text-xs text-zinc-500 leading-relaxed">Manage the core identity of your project and its current lifecycle state.</p>
                                </div>
                                
                                <div className="col-span-2 space-y-8">
                                    <div className="bg-white border border-zinc-200/60 rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                                        <form onSubmit={handleProjectUpdate} className="space-y-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Project Name</label>
                                                <input type="text" value={projectData.name} onChange={e => setProjectData('name', e.target.value)} className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/5 focus:border-primary/30 transition-all outline-none" />
                                                {projectErrors.name && <div className="text-xs text-red-500 font-bold">{projectErrors.name}</div>}
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Lifecycle Status</label>
                                                <select value={projectData.status} onChange={e => setProjectData('status', e.target.value)} className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/5 focus:border-primary/30 transition-all outline-none" >
                                                    <option value="active">Active</option>
                                                    <option value="archived">Archived</option>
                                                </select>
                                            </div>
                                            <div className="pt-6 border-t border-zinc-50 flex justify-end">
                                                <button type="submit" disabled={updatingProject} className="bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-widest px-8 py-3 rounded-md transition-all shadow-md shadow-primary/10" >{updatingProject ? 'Processing...' : 'Update Details'}</button>
                                            </div>
                                        </form>
                                    </div>

                                    <div className="bg-red-50/50 border border-red-100 rounded-2xl p-8">
                                        <h2 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-2">Danger Zone</h2>
                                        <p className="text-xs text-zinc-500 mb-6">Once you delete a project, there is no going back. All tasks and boards will be permanently erased.</p>
                                        <button onClick={handleDeleteProject} className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-md transition-all shadow-sm shadow-red-100" >Purge Project</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'ai' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div className="col-span-1">
                                    <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-2">AI Persona</h2>
                                    <p className="text-xs text-zinc-500 mb-4">Fine-tune the AI Co-Pilot to understand your specific business domain and project goals.</p>
                                    <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                                        <div className="flex items-center gap-2 text-primary mb-2">
                                            <span className="material-icons text-[16px]">lightbulb</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Configuration Tip</span>
                                        </div>
                                        <p className="text-[11px] text-primary/70 leading-relaxed italic">
                                            "Select a Pro model for complex architecture planning, or Flash for rapid task breakdown."
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="col-span-2">
                                    <div className="bg-white border border-zinc-200/60 rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                                        <form onSubmit={handleProjectUpdate} className="space-y-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">AI Intelligence Model</label>
                                                <select value={projectData.ai_model} onChange={e => setProjectData('ai_model', e.target.value)} className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/5 focus:border-primary/30 transition-all outline-none" >
                                                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Preview) - Balanced</option>
                                                    <option value="gemini-1.5-pro">Gemini 1.5 Pro - Highly Analytical</option>
                                                    <option value="gemini-1.5-flash">Gemini 1.5 Flash - Fast Response</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Business or Product Domain</label>
                                                <select value={projectData.business_domain} onChange={e => setProjectData('business_domain', e.target.value)} className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/5 focus:border-primary/30 transition-all outline-none" >
                                                    <option value="">General Purpose</option>
                                                    <option value="fintech">Fintech & Banking</option>
                                                    <option value="retail">Retail & E-commerce</option>
                                                    <option value="healthcare">Healthcare & Life Sciences</option>
                                                    <option value="saas">SaaS & B2B Technology</option>
                                                    <option value="marketing">Marketing & Agency</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Custom AI Instructions</label>
                                                <textarea value={projectData.ai_instructions} onChange={e => setProjectData('ai_instructions', e.target.value)} placeholder="e.g. This is a high-security fintech project. All task descriptions must include a 'Security Consideration' section." className="w-full h-48 bg-background border border-border rounded-md px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-primary/5 focus:border-primary/30 transition-all outline-none font-sans leading-relaxed" />
                                            </div>

                                            <div className="pt-6 border-t border-zinc-50 flex justify-end">
                                                <button type="submit" disabled={updatingProject} className="bg-primary hover:bg-primary/90 text-white text-xs font-black uppercase tracking-widest px-8 py-3 rounded-md transition-all shadow-md shadow-primary/10" >{updatingProject ? 'Syncing...' : 'Save AI Configuration'}</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'members' && (
                            <div className="space-y-10">
                                <section className="bg-white border border-zinc-200/60 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
                                    <div className="px-8 py-5 border-b border-zinc-50 bg-zinc-50/30 flex justify-between items-center">
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Project Roster</h2>
                                        <span className="text-[10px] font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-400">{members.length} Members</span>
                                    </div>
                                    <div className="w-full overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-[10px] uppercase tracking-widest text-zinc-400 border-b border-zinc-50">
                                                <tr><th className="px-8 py-4 font-bold">Member</th><th className="px-8 py-4 font-bold">Access Level</th><th className="px-8 py-4 font-bold text-right">Actions</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-50">
                                                {members.map(member => (
                                                    <tr key={member.id} className="hover:bg-primary/[0.01] transition-colors">
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-[10px] font-black text-primary uppercase shadow-inner">{member.name.substring(0, 2)}</div>
                                                                <div><div className="font-bold text-zinc-900">{member.name}</div><div className="text-[10px] text-zinc-400 font-mono tracking-tighter">{member.email}</div></div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <select value={member.project_role} onChange={e => handleRoleChange(member.id, e.target.value)} className="bg-zinc-50 border border-zinc-100 text-zinc-700 text-[11px] font-bold uppercase tracking-wider rounded-md px-3 py-1 cursor-pointer hover:bg-white transition-all outline-none" >
                                                                <option value="Manager">Manager</option><option value="Contributor">Contributor</option><option value="Viewer">Viewer</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-8 py-5 text-right"><button onClick={() => handleRemoveMember(member.id)} className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-600 transition-colors" >Remove</button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                <section className="bg-primary/5 border border-primary/10 rounded-2xl p-10">
                                    <div className="max-w-2xl">
                                        <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Expand Team</h2>
                                        <p className="text-xs text-zinc-500 mb-8">Invite other workspace members to collaborate on this initiative.</p>
                                        <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
                                            <div className="w-full md:flex-1 space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Select Workspace User</label>
                                                <select value={memberData.user_id} onChange={e => setMemberData('user_id', e.target.value)} className="w-full bg-white border border-zinc-200 rounded-md px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/5 focus:border-primary/30 transition-all outline-none" >
                                                    <option value="">Choose a user...</option>
                                                    {available_users.map(u => (<option key={u.id} value={u.id}>{u.name} ({u.email})</option>))}
                                                </select>
                                                {memberErrors.user_id && <div className="text-xs text-red-500 font-bold">{memberErrors.user_id}</div>}
                                            </div>
                                            <div className="w-full md:w-48 space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Project Role</label>
                                                <select value={memberData.role} onChange={e => setMemberData('role', e.target.value)} className="w-full bg-white border border-zinc-200 rounded-md px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary/5 focus:border-primary/30 transition-all outline-none" >
                                                    <option value="Manager">Manager</option><option value="Contributor">Contributor</option><option value="Viewer">Viewer</option>
                                                </select>
                                            </div>
                                            <button type="submit" disabled={addingMember || !memberData.user_id} className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest px-8 h-[42px] rounded-md transition-all shadow-md shadow-primary/10" >Add to Team</button>
                                        </form>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
