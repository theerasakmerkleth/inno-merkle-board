import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Log {
    id: number;
    action: string;
    description: string;
    created_at: string;
    user: {
        name: string;
        avatar_url?: string;
    } | null;
}

export function ActivityLogTimeline({ taskId }: { taskId: number }) {
    const [logs, setLogs] = useState<Log[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        fetch(`/tasks/${taskId}/activity-logs`)
            .then(res => res.json())
            .then(data => {
                setLogs(data.data || []); // Laravel paginator puts items in 'data'
            })
            .catch(err => console.error("Failed to load activity logs", err))
            .finally(() => setIsLoading(false));
    }, [taskId]);

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    };

    const getIcon = (action: string) => {
        switch (action) {
            case 'created': return 'add_circle_outline';
            case 'status_changed': return 'swap_horiz';
            case 'assigned': return 'person_add';
            case 'moved': return 'input';
            case 'commented': return 'chat_bubble_outline';
            default: return 'edit';
        }
    };

    // Helper to safely render markdown-lite (bolding) from backend
    const renderDescription = (desc: string) => {
        if (!desc) return '';
        const parts = desc.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <span key={i} className="font-medium text-foreground">{part.slice(2, -2)}</span>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <div className="space-y-6 pt-2 pl-2">
            {isLoading ? (
                <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">Loading history...</div>
            ) : logs.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">No activity recorded yet.</div>
            ) : (
                <div className="relative border-l-2 border-border/50 ml-3.5 space-y-6 pb-4">
                    {logs.map((log) => (
                    <div key={log.id} className="relative flex items-start group">
                        {/* Icon Node */}
                        <div className="absolute -left-[15px] bg-card p-0.5 rounded-full border border-border flex items-center justify-center h-7 w-7 text-muted-foreground group-hover:text-primary group-hover:border-primary/50 transition-colors">
                            <span className="material-icons text-[14px]">{getIcon(log.action)}</span>
                        </div>
                        
                        {/* Content */}
                        <div className="ml-8 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <Avatar className="h-4 w-4">
                                    {log.user?.avatar_url ? (
                                        <AvatarImage src={log.user.avatar_url} />
                                    ) : (
                                        <AvatarFallback className="bg-muted text-[8px]">
                                            {log.user ? log.user.name.substring(0, 2).toUpperCase() : 'SYS'}
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                                <span className="text-xs font-semibold text-foreground">
                                    {log.user ? log.user.name : 'System'}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {formatTime(log.created_at)}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {renderDescription(log.description)}
                            </p>
                        </div>
                    </div>
                    ))}
                </div>
            )}
        </div>
    );
}
