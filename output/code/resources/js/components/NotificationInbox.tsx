import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { router } from '@inertiajs/react';

interface Notification {
    id: string;
    data: {
        task_id: number;
        project_key: string;
        message: string;
        causer_name: string;
        causer_avatar?: string;
    };
    read_at: string | null;
    created_at: string;
}

export function NotificationInbox() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = () => {
        fetch('/notifications')
            .then(res => res.json())
            .then(data => {
                if (data.notifications) {
                    setNotifications(data.notifications);
                    setUnreadCount(data.unread_count);
                }
            })
            .catch(err => console.error("Failed to fetch notifications", err));
    };

    useEffect(() => {
        fetchNotifications();
        
        // Polling every 60s as a fallback to websockets for MVP
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Refresh when sheet opens
    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const markAsRead = (id: string, taskId: number, projectKey: string) => {
        fetch(`/notifications/${id}/read`, {
            method: 'PATCH',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }).then(() => {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            
            // Navigate to task
            setIsOpen(false);
            if (projectKey && taskId) {
                router.visit(`/projects/${projectKey}/boards?task=${taskId}`);
            }
        });
    };

    const markAllAsRead = () => {
        fetch('/notifications/mark-all-read', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }).then(() => {
            setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
            setUnreadCount(0);
        });
    };

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    // Helper to safely render markdown-lite (bolding) from backend
    const renderMessage = (msg: string) => {
        const parts = msg.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <span key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</span>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <button className="relative text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-muted">
                    <span className="material-icons text-[20px]">notifications</span>
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                        </span>
                    )}
                </button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md p-0 flex flex-col border-l border-border bg-card">
                <SheetHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0 sticky top-0 bg-card/95 backdrop-blur z-10">
                    <div className="flex flex-col gap-0.5">
                        <SheetTitle className="text-lg font-semibold flex items-center gap-2">
                            Inbox
                            {unreadCount > 0 && (
                                <Badge variant="secondary" className="bg-primary/10 text-primary text-xs px-1.5 py-0">
                                    {unreadCount} new
                                </Badge>
                            )}
                        </SheetTitle>
                        <SheetDescription className="sr-only">Your project notifications and activity alerts.</SheetDescription>
                    </div>
                    {unreadCount > 0 && (
                        <button 
                            onClick={markAllAsRead}
                            className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                            Mark all as read
                        </button>
                    )}
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                            <span className="material-icons text-4xl text-muted-foreground/30 mb-3">inbox</span>
                            <p className="text-sm font-medium text-foreground">You're all caught up!</p>
                            <p className="text-xs text-muted-foreground mt-1">No new notifications.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {notifications.map((notification) => (
                                <div 
                                    key={notification.id}
                                    onClick={() => markAsRead(notification.id, notification.data.task_id, notification.data.project_key)}
                                    className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer relative group ${!notification.read_at ? 'bg-primary/[0.02]' : ''}`}
                                >
                                    {!notification.read_at && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                                    )}
                                    <div className="flex gap-3">
                                        <Avatar className="h-8 w-8 border border-border">
                                            {notification.data.causer_avatar ? (
                                                <AvatarImage src={notification.data.causer_avatar} />
                                            ) : (
                                                <AvatarFallback className="bg-muted text-xs">
                                                    {notification.data.causer_name.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            )}
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-muted-foreground leading-snug">
                                                {renderMessage(notification.data.message)}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/70 mt-1.5 flex items-center gap-1">
                                                <span className="material-icons text-[12px]">schedule</span>
                                                {formatRelativeTime(notification.created_at)}
                                            </p>
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
