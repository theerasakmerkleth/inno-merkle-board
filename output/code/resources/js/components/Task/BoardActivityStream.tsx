import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
    } | null;
}

interface Props {
    projectKey: string;
    boardId: number;
    onTaskClick: (taskId: number) => void;
}

export function BoardActivityStream({ projectKey, boardId, onTaskClick }: Props) {
    const [logs, setLogs] = useState<Log[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchActivity = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/projects/${projectKey}/boards/${boardId}/activity`);
            const data = await response.json();
            setLogs(data.data || []);
        } catch (error) {
            console.error("Failed to fetch board activity", error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
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
                return <span key={i} className="font-bold text-zinc-900">{part.slice(2, -2)}</span>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <Sheet onOpenChange={(open) => open && fetchActivity()}>
            <SheetTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground hover:bg-zinc-100 p-2 rounded-lg transition-all" title="Board Activity">
                    <span className="material-icons text-[20px]">history</span>
                </button>
            </SheetTrigger>
            <SheetContent className="p-0 sm:max-w-[400px] border-l border-zinc-100 h-full flex flex-col bg-white/95 backdrop-blur-md">
                <SheetHeader className="px-6 py-5 border-b border-zinc-50 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-zinc-50 flex items-center justify-center">
                            <span className="material-icons text-zinc-400 text-[18px]">history</span>
                        </div>
                        <SheetTitle className="text-base font-bold tracking-tight text-zinc-900">Board Activity</SheetTitle>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {isLoading ? (
                        <div className="space-y-6">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-4 animate-pulse">
                                    <div className="h-8 w-8 rounded-full bg-zinc-100"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-zinc-100 rounded w-3/4"></div>
                                        <div className="h-2 bg-zinc-50 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-40">
                            <span className="material-icons text-[48px] mb-4">history</span>
                            <p className="text-sm font-medium uppercase tracking-widest">No recent activity</p>
                        </div>
                    ) : (
                        <div className="relative space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-zinc-100">
                            {logs.map((log) => (
                                <div 
                                    key={log.id} 
                                    className="relative flex items-start gap-4 group cursor-pointer"
                                    onClick={() => log.task && onTaskClick(log.task.id)}
                                >
                                    <div className="relative z-10">
                                        <Avatar className="h-8 w-8 border-2 border-white ring-1 ring-zinc-100 shadow-sm">
                                            {log.user?.avatar_url ? (
                                                <AvatarImage src={log.user.avatar_url} />
                                            ) : (
                                                <AvatarFallback className="bg-zinc-50 text-zinc-400 text-[10px] font-bold">
                                                    {log.user?.name?.substring(0, 2).toUpperCase() || 'SYS'}
                                                </AvatarFallback>
                                            )}
                                        </Avatar>
                                        <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white flex items-center justify-center shadow-sm border border-zinc-50 text-zinc-400 group-hover:text-primary transition-colors">
                                            <span className="material-icons text-[10px]">{getLogIcon(log.action)}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <p className="text-[12px] leading-relaxed text-zinc-500">
                                            {renderDescription(log.description)}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {log.task && (
                                                <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                    {log.task.formatted_id}
                                                </span>
                                            )}
                                            <span className="text-[10px] font-mono text-zinc-400">
                                                {formatTime(log.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
