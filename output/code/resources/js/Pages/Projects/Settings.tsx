import React, { useState, FormEvent } from 'react';
import { useForm, router, Link } from '@inertiajs/react';

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
}

interface PageProps {
    project: Project;
    members: User[];
    available_users: User[];
}

export default function ProjectSettings({ project, members, available_users }: PageProps) {
    const [activeTab, setActiveTab] = useState<'general' | 'members'>('general');
    
    // General Settings Form
    const { data: projectData, setData: setProjectData, patch: patchProject, processing: updatingProject, errors: projectErrors } = useForm({
        name: project.name,
        status: project.status,
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

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
            <header className="px-8 py-6 border-b border-border bg-card">
                <div className="flex items-center gap-4 mb-4">
                    <Link href={`/projects/${project.key}/boards`} className="text-muted-foreground hover:text-foreground">
                        <span className="material-icons text-sm">arrow_back</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-mono text-sm">[{project.key}]</span>
                        <h1 className="text-xl font-bold text-[#040E4B]">{project.name}</h1>
                    </div>
                </div>
                
                <div className="flex gap-8">
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`pb-4 text-sm font-medium transition-all border-b-2 ${activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        General Settings
                    </button>
                    <button 
                        onClick={() => setActiveTab('members')}
                        className={`pb-4 text-sm font-medium transition-all border-b-2 ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        Team & Permissions
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto bg-[#F9FAFB]/50">
                <div className="max-w-5xl mx-auto py-10 px-8">
                    {activeTab === 'general' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div className="col-span-1">
                                <h2 className="text-sm font-bold text-[#040E4B] uppercase tracking-wider mb-2">Identity & Status</h2>
                                <p className="text-xs text-muted-foreground">Manage the core identity of your project and its current lifecycle state.</p>
                            </div>
                            
                            <div className="col-span-2 space-y-8">
                                <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                                    <form onSubmit={handleProjectUpdate} className="space-y-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Project Name</label>
                                            <input 
                                                type="text" 
                                                value={projectData.name}
                                                onChange={e => setProjectData('name', e.target.value)}
                                                className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none transition-colors"
                                            />
                                            {projectErrors.name && <div className="text-xs text-destructive">{projectErrors.name}</div>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lifecycle Status</label>
                                            <select 
                                                value={projectData.status}
                                                onChange={e => setProjectData('status', e.target.value)}
                                                className="w-full bg-background border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none transition-colors"
                                            >
                                                <option value="active">Active</option>
                                                <option value="archived">Archived</option>
                                            </select>
                                        </div>
                                        <div className="pt-2 border-t border-border flex justify-end">
                                            <button 
                                                type="submit" 
                                                disabled={updatingProject}
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-6 py-2.5 rounded-sm transition-colors shadow-sm"
                                            >
                                                {updatingProject ? 'Processing...' : 'Update Details'}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6">
                                    <h2 className="text-sm font-bold text-destructive uppercase tracking-wider mb-2">Danger Zone</h2>
                                    <p className="text-xs text-muted-foreground mb-6">Once you delete a project, there is no going back. All tasks and boards will be permanently erased.</p>
                                    <button 
                                        onClick={handleDeleteProject}
                                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold px-6 py-2.5 rounded-sm transition-colors shadow-sm"
                                    >
                                        Delete Project
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'members' && (
                        <div className="space-y-10">
                            <section className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-border bg-[#040E4B]/[0.02] flex justify-between items-center">
                                    <h2 className="text-sm font-bold text-[#040E4B] uppercase tracking-wider">Project Roster</h2>
                                    <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">{members.length} Members</span>
                                </div>
                                
                                <div className="w-full overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted/30 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold">Member</th>
                                                <th className="px-6 py-3 font-semibold">Access Level</th>
                                                <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {members.map(member => (
                                                <tr key={member.id} className="hover:bg-accent/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-primary">
                                                                {member.name.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-foreground">{member.name}</div>
                                                                <div className="text-[10px] text-muted-foreground font-mono">{member.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <select 
                                                            value={member.project_role}
                                                            onChange={e => handleRoleChange(member.id, e.target.value)}
                                                            className="bg-muted/50 border-0 text-foreground text-xs font-medium focus:ring-1 focus:ring-primary rounded-md px-2 py-1 cursor-pointer hover:bg-muted transition-colors"
                                                        >
                                                            <option value="Manager">Manager</option>
                                                            <option value="Contributor">Contributor</option>
                                                            <option value="Viewer">Viewer</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button 
                                                            onClick={() => handleRemoveMember(member.id)}
                                                            className="text-xs text-muted-foreground hover:text-destructive transition-colors font-medium"
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="bg-[#0391F2]/5 border border-[#0391F2]/20 rounded-lg p-8">
                                <div className="max-w-2xl">
                                    <h2 className="text-sm font-bold text-[#0391F2] uppercase tracking-wider mb-2">Expand Team</h2>
                                    <p className="text-xs text-muted-foreground mb-6">Invite other workspace members to collaborate on this initiative.</p>
                                    
                                    <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                                        <div className="w-full md:flex-1 space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select Workspace User</label>
                                            <select 
                                                value={memberData.user_id}
                                                onChange={e => setMemberData('user_id', e.target.value)}
                                                className="w-full bg-card border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none transition-colors"
                                            >
                                                <option value="">Choose a user...</option>
                                                {available_users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                                ))}
                                            </select>
                                            {memberErrors.user_id && <div className="text-xs text-destructive">{memberErrors.user_id}</div>}
                                        </div>
                                        <div className="w-full md:w-48 space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Project Role</label>
                                            <select 
                                                value={memberData.role}
                                                onChange={e => setMemberData('role', e.target.value)}
                                                className="w-full bg-card border border-border rounded-md px-4 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none transition-colors"
                                            >
                                                <option value="Manager">Manager</option>
                                                <option value="Contributor">Contributor</option>
                                                <option value="Viewer">Viewer</option>
                                            </select>
                                        </div>
                                        <button 
                                            type="submit" 
                                            disabled={addingMember || !memberData.user_id}
                                            className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-bold px-8 h-[42px] rounded-sm transition-colors shadow-sm"
                                        >
                                            Add to Team
                                        </button>
                                    </form>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}