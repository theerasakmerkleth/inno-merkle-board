import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

interface User {
    id: number;
    name: string;
}

interface RoadmapTask {
    id: number;
    formatted_id: string;
    title: string;
    start_date: string | null;
    due_date: string | null;
    status: string;
    priority: string;
    assignee: User | null;
    dependencies: number[];
    has_conflict: boolean;
}

interface Project {
    id: number;
    key: string;
    name: string;
}

interface PageProps {
    project: Project;
    tasks: RoadmapTask[];
}

type ViewMode = 'days' | 'weeks' | 'months';

export default function Roadmap({ project, tasks }: PageProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('weeks');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Robust Date Normalization
    const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = normalizeDate(new Date());

    // Define timeline range (6 months total)
    const startDateRange = useMemo(() => {
        const d = new Date(today);
        d.setMonth(d.getMonth() - 2);
        d.setDate(1);
        return normalizeDate(d);
    }, []);

    const endDateRange = useMemo(() => {
        const d = new Date(today);
        d.setMonth(d.getMonth() + 4);
        d.setDate(0);
        return normalizeDate(d);
    }, []);

    // Configuration based on view mode
    const config = {
        days: { cellWidth: 80 },
        weeks: { cellWidth: 30 },
        months: { cellWidth: 8 }
    };

    const cellWidth = config[viewMode].cellWidth;

    const days = useMemo(() => {
        const arr = [];
        for (let dt = new Date(startDateRange); dt <= endDateRange; dt.setDate(dt.getDate() + 1)) {
            arr.push(new Date(dt));
        }
        return arr;
    }, [startDateRange, endDateRange]);

    const months = useMemo(() => {
        const groups: { month: string; year: number; width: number }[] = [];
        days.forEach(day => {
            const m = day.toLocaleString('default', { month: 'long' });
            const y = day.getFullYear();
            const last = groups[groups.length - 1];
            if (!last || last.month !== m || last.year !== y) {
                groups.push({ month: m, year: y, width: cellWidth });
            } else {
                last.width += cellWidth;
            }
        });
        return groups;
    }, [days, cellWidth]);

    const getTaskStyle = (task: RoadmapTask) => {
        if (!task.start_date || !task.due_date) return { display: 'none' };
        
        // Parse YYYY-MM-DD explicitly to avoid TZ drift
        const [sYear, sMonth, sDay] = task.start_date.split('-').map(Number);
        const [eYear, eMonth, eDay] = task.due_date.split('-').map(Number);
        
        const start = new Date(sYear, sMonth - 1, sDay);
        const end = new Date(eYear, eMonth - 1, eDay);

        const leftDiff = Math.round((start.getTime() - startDateRange.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        return {
            left: `${leftDiff * cellWidth}px`,
            width: `${duration * cellWidth}px`,
        };
    };

    const scrollToToday = () => {
        if (scrollContainerRef.current) {
            const todayPos = Math.round((today.getTime() - startDateRange.getTime()) / (1000 * 60 * 60 * 24)) * cellWidth;
            const containerWidth = scrollContainerRef.current.offsetWidth;
            // Adjustment for sidebar offset
            scrollContainerRef.current.scrollTo({
                left: todayPos - (containerWidth / 2) + 128, 
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        setTimeout(scrollToToday, 200);
    }, [viewMode]);

    const tasksWithoutDates = tasks.filter(t => !t.start_date || !t.due_date);

    const breadcrumbs = (
        <>
          <span className="text-muted-foreground font-mono text-sm mr-2 font-normal">[{project.key}]</span>
          Roadmap
        </>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
                {/* Fixed Header */}
                <header className="px-6 py-3 border-b border-border flex justify-between items-center bg-card z-40">
                    <div className="flex items-center gap-6">
                        <div>
                            <h1 className="text-lg font-semibold text-foreground">Strategic Roadmap</h1>
                            <p className="text-[11px] text-muted-foreground">Macro-level timeline and blockers.</p>
                        </div>
                        <div className="flex bg-muted rounded-sm p-0.5 ml-4">
                            {(['days', 'weeks', 'months'] as ViewMode[]).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-3 py-1 text-[10px] font-medium rounded-sm transition-all ${viewMode === mode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={scrollToToday}
                            className="text-[10px] px-3 py-1.5 border border-border rounded-sm text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                        >
                            <span className="material-icons text-[14px]">today</span>
                            Jump to Today
                        </button>
                        <Link 
                            href={`/projects/${project.key}/boards`}
                            className="text-[10px] px-3 py-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Back to Board
                        </Link>
                    </div>
                </header>

                {/* Main Scrollable Area: Syncing Sidebar and Timeline via single container */}
                <div ref={scrollContainerRef} className="flex-1 overflow-auto relative">
                    
                    {/* Unified Timeline Wrapper */}
                    <div className="flex min-h-full" style={{ width: `calc(256px + ${days.length * cellWidth}px)` }}>
                        
                        {/* 1. STICKY TASK SIDEBAR */}
                        <div className="w-64 flex-shrink-0 bg-card border-r border-border sticky left-0 z-30">
                            {/* Sidebar Header Space (to align with date headers) */}
                            <div className="h-[60px] border-b border-border bg-card sticky top-0 flex items-center px-4 z-30 shadow-sm">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Project Tasks</span>
                            </div>
                            
                            {/* Task Titles */}
                            <div className="flex flex-col">
                                {tasks.map(task => (
                                    <div key={task.id} className="h-10 px-4 flex items-center border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer group">
                                        <span className="text-[9px] font-mono text-primary/70 mr-2 flex-shrink-0">[{task.formatted_id}]</span>
                                        <span className={`text-[11px] truncate font-medium group-hover:text-primary transition-colors ${!task.start_date ? 'text-muted-foreground/50 italic font-normal' : 'text-foreground'}`}>
                                            {task.title}
                                        </span>
                                    </div>
                                ))}
                                {tasksWithoutDates.length > 0 && (
                                    <div className="p-4 bg-amber-500/5 mt-2 border-y border-amber-500/10">
                                        <div className="flex items-center gap-1.5 text-amber-600">
                                            <span className="material-icons text-[14px]">warning_amber</span>
                                            <span className="text-[9px] font-bold leading-tight">{tasksWithoutDates.length} tasks missing dates</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. TIMELINE CANVAS */}
                        <div className="flex-1 relative">
                            
                            {/* STICKY DATE HEADERS */}
                            <div className="sticky top-0 z-20 flex flex-col bg-background/80 backdrop-blur-md shadow-sm border-b border-border">
                                {/* Month Header */}
                                <div className="flex h-7 border-b border-border/30">
                                    {months.map((m, i) => (
                                        <div 
                                            key={i} 
                                            style={{ width: `${m.width}px` }}
                                            className="h-full border-r border-border/30 flex items-center px-3 text-[10px] font-bold text-foreground truncate"
                                        >
                                            {m.month} {m.year}
                                        </div>
                                    ))}
                                </div>
                                {/* Day/Week Header */}
                                <div className="flex h-[32px]">
                                    {days.map((day, i) => {
                                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                        const isToday = day.toDateString() === today.toDateString();
                                        return (
                                            <div 
                                                key={i} 
                                                style={{ width: `${cellWidth}px` }}
                                                className={`h-full border-r border-border/10 flex flex-col items-center justify-center text-[9px] ${isWeekend ? 'bg-muted/10' : ''} ${isToday ? 'bg-primary/5' : ''}`}
                                            >
                                                {viewMode === 'days' && <span className="text-[8px] text-muted-foreground/60">{day.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}</span>}
                                                {viewMode !== 'months' && <span className={`${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{day.getDate()}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* GRID CONTENT */}
                            <div className="relative" style={{ width: `${days.length * cellWidth}px` }}>
                                {/* Vertical Grid Lines */}
                                <div className="absolute inset-0 flex pointer-events-none">
                                    {days.map((day, i) => (
                                        <div 
                                            key={i} 
                                            style={{ width: `${cellWidth}px` }}
                                            className={`h-full border-r border-border/5 ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-muted/[0.03]' : ''}`}
                                        />
                                    ))}
                                </div>

                                {/* Today Vertical Line */}
                                <div 
                                    className="absolute top-0 bottom-0 w-px bg-primary z-10"
                                    style={{ left: `${Math.round((today.getTime() - startDateRange.getTime()) / (1000 * 60 * 60 * 24)) * cellWidth}px` }}
                                >
                                    <div className="absolute top-0 -left-1.5 w-3 h-3 bg-primary rounded-full border-2 border-background shadow-md" />
                                </div>

                                {/* ROWS OF TASK BARS */}
                                <div className="flex flex-col">
                                    {tasks.map(task => (
                                        <div key={task.id} className="h-10 relative border-b border-border/5 group transition-colors hover:bg-muted/[0.05]">
                                            {task.start_date && task.due_date && (
                                                <div 
                                                    style={getTaskStyle(task)}
                                                    className={`absolute top-2 h-6 rounded-sm flex items-center px-2 transition-all cursor-pointer shadow-sm group-hover:ring-2 group-hover:ring-primary/20 z-10 overflow-hidden ${
                                                        task.status === 'done' ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
                                                    }`}
                                                    title={`${task.title} (${task.start_date} to ${task.due_date})`}
                                                >
                                                    {cellWidth > 20 && (
                                                        <span className="text-[10px] font-semibold truncate leading-none">{task.title}</span>
                                                    )}
                                                    {task.has_conflict && (
                                                        <span className="material-icons text-[14px] text-destructive ml-auto animate-pulse">warning</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
