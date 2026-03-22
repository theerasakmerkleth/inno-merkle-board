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
        <div className="min-h-screen bg-background text-foreground font-sans">
            <header className="flex flex-col md:flex-row gap-4 md:gap-0 justify-between items-start md:items-center px-4 md:px-8 py-4 border-b border-border">
                <div className="flex items-center gap-4">
                    <Link href={`/projects/${project.key}/boards`} className="text-muted-foreground hover:text-foreground">
                        <span className="material-icons text-sm">arrow_back</span>
                    </Link>
                    <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                        <span className="text-muted-foreground font-mono text-sm">[{project.key}]</span>
                        {project.name} Settings
                    </h1>
                </div>
            </header>

            <div className="max-w-4xl mx-auto py-8 px-4 flex flex-col md:flex-row gap-8 md:gap-12">
                {/* Sidebar Navigation */}
                <aside className="w-full md:w-48 flex-shrink-0 space-y-1">
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`w-full text-left px-3 py-2 text-sm rounded-sm transition-colors ${activeTab === 'general' ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                    >
                        General Settings
                    </button>
                    <button 
                        onClick={() => setActiveTab('members')}
                        className={`w-full text-left px-3 py-2 text-sm rounded-sm transition-colors ${activeTab === 'members' ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                    >
                        Team Members
                    </button>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1">
                    {activeTab === 'general' && (
                        <div className="space-y-12">
                            <section>
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6 border-b border-border pb-2">Project Details</h2>
                                <form onSubmit={handleProjectUpdate} className="space-y-5 max-w-md">
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-muted-foreground">Project Name</label>
                                        <input 
                                            type="text" 
                                            value={projectData.name}
                                            onChange={e => setProjectData('name', e.target.value)}
                                            className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none transition-colors"
                                        />
                                        {projectErrors.name && <div className="text-xs text-destructive">{projectErrors.name}</div>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-muted-foreground">Status</label>
                                        <select 
                                            value={projectData.status}
                                            onChange={e => setProjectData('status', e.target.value)}
                                            className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none transition-colors"
                                        >
                                            <option value="active">Active</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={updatingProject}
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4 py-2 rounded-sm transition-colors"
                                    >
                                        {updatingProject ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </form>
                            </section>

                            <section>
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-destructive mb-6 border-b border-destructive/30 pb-2">Danger Zone</h2>
                                <div className="border border-destructive/30 rounded-sm p-4 bg-destructive/10 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-sm font-medium text-foreground">Delete Project</h3>
                                        <p className="text-xs text-muted-foreground mt-1">Permanently remove this project, all boards, and tasks.</p>
                                    </div>
                                    <button 
                                        onClick={handleDeleteProject}
                                        className="bg-destructive/10 border border-destructive hover:bg-destructive/20 text-destructive text-xs px-4 py-2 rounded-sm transition-colors"
                                    >
                                        Delete Project
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'members' && (
                        <div className="space-y-8">
                            <section>
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6 border-b border-border pb-2">Add Member</h2>
                                <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                                    <div className="w-full md:flex-1 space-y-1.5">
                                        <label className="text-xs text-muted-foreground">Workspace User</label>
                                        <select 
                                            value={memberData.user_id}
                                            onChange={e => setMemberData('user_id', e.target.value)}
                                            className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none transition-colors"
                                        >
                                            <option value="">Select a user...</option>
                                            {available_users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                            ))}
                                        </select>
                                        {memberErrors.user_id && <div className="text-xs text-destructive">{memberErrors.user_id}</div>}
                                    </div>
                                    <div className="w-full md:w-48 space-y-1.5">
                                        <label className="text-xs text-muted-foreground">Project Role</label>
                                        <select 
                                            value={memberData.role}
                                            onChange={e => setMemberData('role', e.target.value)}
                                            className="w-full bg-card border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none transition-colors"
                                        >
                                            <option value="Manager">Manager</option>
                                            <option value="Contributor">Contributor</option>
                                            <option value="Viewer">Viewer</option>
                                        </select>
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={addingMember || !memberData.user_id}
                                        className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs px-4 py-2 rounded-sm transition-colors h-[38px]"
                                    >
                                        Add
                                    </button>
                                </form>
                            </section>

                            <section>
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border pb-2">Current Roster</h2>
                                <div className="border border-border rounded-sm bg-card overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted text-xs text-muted-foreground border-b border-border">
                                            <tr>
                                                <th className="px-4 py-2 font-normal">Name</th>
                                                <th className="px-4 py-2 font-normal">Role</th>
                                                <th className="px-4 py-2 font-normal text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {members.map(member => (
                                                <tr key={member.id} className="hover:bg-accent">
                                                    <td className="px-4 py-3 text-foreground">{member.name}</td>
                                                    <td className="px-4 py-3">
                                                        <select 
                                                            value={member.project_role}
                                                            onChange={e => handleRoleChange(member.id, e.target.value)}
                                                            className="bg-transparent border-0 text-muted-foreground text-xs focus:ring-0 cursor-pointer hover:text-foreground"
                                                        >
                                                            <option value="Manager">Manager</option>
                                                            <option value="Contributor">Contributor</option>
                                                            <option value="Viewer">Viewer</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button 
                                                            onClick={() => handleRemoveMember(member.id)}
                                                            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}