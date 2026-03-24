import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Log {
    id: number;
    action: string;
    description: string;
    created_at: string;
    user: {
        id: number;
        name: string;
        avatar_url?: string;
    } | null;
    task: {
        id: number;
        formatted_id: string;
        title: string;
        board_id: number;
        project: {
            id: number;
            name: string;
            key: string;
        }
    } | null;
}

interface PageProps {
    logs: {
        data: Log[];
        links: any[];
        current_page: number;
        last_page: number;
    };
    filters: {
        project_id?: string;
        search?: string;
    };
    available_projects: { id: number; name: string; key: string }[];
}

export default function ActivityIndex({ logs, filters, available_projects }: PageProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [projectId, setProjectId] = useState(filters.project_id || '');

    const handleFilter = () => {
        router.get('/activity', { search, project_id: projectId }, { 
            preserveState: true,
            replace: true 
        });
    };

    const getLogIcon = (action: string) => {
        switch (action) {
            case 'created': return 'add_circle_outline';
            case 'status_changed': return 'swap_horiz';
            case 'assigned': return 'person_add';
            case 'moved': return 'input';
            case 'commented': return 'chat_bubble_outline';
            default: return 'edit';
        }
    };

    const renderDescription = (desc: string) => {
        if (!desc) return '';
        const parts = desc.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <span key={i} className="font-bold text-foreground">{part.slice(2, -2)}</span>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateHeader = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    };

    // Group logs by date
    const groupedLogs: { [key: string]: Log[] } = {};
    logs.data.forEach(log => {
        const dateKey = new Date(log.created_at).toDateString();
        if (!groupedLogs[dateKey]) groupedLogs[dateKey] = [];
        groupedLogs[dateKey].push(log);
    });

    return (
        <AppLayout breadcrumbs={<span>Activity Log</span>}>
            <Head title="Activity Log | MerkleBoard" />

            <div className="flex-1 overflow-y-auto p-8 bg-background">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Activity Log</h1>
                            <p className="text-sm text-muted-foreground mt-1">Tracking all relevant updates across your workspace.</p>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-card border border-border rounded-lg p-4 mb-8 flex flex-wrap items-center gap-4 shadow-sm">
                        <div className="flex-1 min-w-[200px] relative">
                            <span className="material-icons absolute left-3 top-2.5 text-muted-foreground/50 text-[18px]">search</span>
                            <input 
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleFilter()}
                                placeholder="Search by task ID or description..."
                                className="w-full bg-muted/30 border-none rounded-sm pl-10 pr-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary/30"
                            />
                        </div>
                        <select 
                            value={projectId}
                            onChange={e => { setProjectId(e.target.value); setTimeout(handleFilter, 0); }}
                            className="bg-muted/30 border-none rounded-sm px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary/30 min-w-[180px]"
                        >
                            <option value="">All Projects</option>
                            {available_projects.map(p => (
                                <option key={p.id} value={p.id}>[{p.key}] {p.name}</option>
                            ))}
                        </select>
                        <button 
                            onClick={handleFilter}
                            className="bg-primary text-white px-4 py-2 rounded-sm text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            Apply Filters
                        </button>
                    </div>

                    {/* Timeline Feed */}
                    <div className="space-y-12">
                        {Object.keys(groupedLogs).length > 0 ? Object.keys(groupedLogs).map(dateKey => (
                            <div key={dateKey} className="space-y-6">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-4 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                                    {formatDateHeader(dateKey)}
                                </h3>
                                <div className="space-y-4">
                                    {groupedLogs[dateKey].map(log => (
                                        <div key={log.id} className="bg-card border border-border/50 rounded-lg p-4 hover:border-primary/30 transition-all shadow-sm group">
                                            <div className="flex items-start gap-4">
                                                <Avatar className="h-9 w-9 border border-border">
                                                    {log.user?.avatar_url ? (
                                                        <AvatarImage src={log.user.avatar_url} />
                                                    ) : (
                                                        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold uppercase">
                                                            {log.user?.name?.substring(0, 2) || 'SYS'}
                                                        </AvatarFallback>
                                                    )}
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                                            <span className="font-bold text-foreground">{log.user?.name || 'System'}</span>
                                                            {' '}{renderDescription(log.description)}
                                                        </p>
                                                        <span className="text-[10px] font-mono text-muted-foreground/60 whitespace-nowrap ml-4">
                                                            {formatTime(log.created_at)}
                                                        </span>
                                                    </div>
                                                    
                                                    {log.task && (
                                                        <div className="mt-2 flex items-center gap-3">
                                                            <Link 
                                                                href={`/projects/${log.task.project.key}/boards/${log.task.board_id}?taskId=${log.task.id}`}
                                                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline bg-primary/5 px-2 py-0.5 rounded-sm"
                                                            >
                                                                <span className="material-icons text-[14px]">link</span>
                                                                {log.task.formatted_id}
                                                            </Link>
                                                            <span className="text-[11px] text-muted-foreground truncate font-medium">
                                                                {log.task.title}
                                                            </span>
                                                            <div className="h-1 w-1 rounded-full bg-border"></div>
                                                            <span className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-tighter">
                                                                {log.task.project.name}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 text-center flex flex-col items-center">
                                <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mb-6">
                                    <span className="material-icons text-4xl text-muted-foreground/30">history</span>
                                </div>
                                <h2 className="text-lg font-semibold text-foreground">No activity found</h2>
                                <p className="text-sm text-muted-foreground max-w-xs mt-2">Try adjusting your filters or check back later for updates.</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination Placeholder */}
                    {logs.last_page > 1 && (
                        <div className="mt-12 flex justify-center gap-2">
                            {/* Simple pagination logic could be added here */}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
