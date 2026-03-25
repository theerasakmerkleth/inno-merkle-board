import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { toPng, toBlob } from 'html-to-image';
import jsPDF from 'jspdf';

import TaskModal from '@/components/Task/TaskModal';

interface User {
    id: number;
    name: string;
    email: string;
}

interface RoadmapTask {
    id: number;
    project_id: number;
    board_id: number;
    formatted_id: string;
    title: string;
    description: string;
    start_date: string | null;
    due_date: string | null;
    status: string;
    board_column_id: number;
    priority: string;
    assignee_id: number | null;
    assignee: User | null;
    story_points: number;
    labels: string[];
    checklists: any[];
    comments: any[];
    dependencies: number[];
    has_conflict: boolean;
}

interface ColumnProps {
    id: string;
    db_id: number;
    title: string;
}

interface Project {
    id: number;
    key: string;
    name: string;
}

interface PageProps {
    project: Project;
    tasks: RoadmapTask[];
    columns: ColumnProps[];
    project_members: User[];
    project_role: string;
    active_board: any;
}

type ViewMode = 'days' | 'weeks' | 'months';

export default function Roadmap({ project, tasks, columns = [], project_members = [], project_role = 'Viewer', active_board }: PageProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('weeks');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<RoadmapTask | null>(null);

    const openEditModal = (task: RoadmapTask) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };

    const isAdmin = project_role === 'Manager';
    const canEdit = project_role === 'Manager' || project_role === 'Contributor';

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

    const days = useMemo(() => {
        const items: Date[] = [];
        let current = new Date(startDateRange);
        while (current <= endDateRange) {
            items.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return items;
    }, [startDateRange, endDateRange]);

    const cellWidth = viewMode === 'days' ? 100 : viewMode === 'weeks' ? 40 : 20;

    const getTaskPosition = (task: RoadmapTask) => {
        if (!task.start_date || !task.due_date) return { display: 'none' };
        
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
            scrollContainerRef.current.scrollTo({
                left: todayPos - (containerWidth / 2) + 128, 
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        setTimeout(scrollToToday, 200);
    }, [viewMode]);

    const handleExport = async () => {
        const toastId = toast.loading('Generating Excel report...');
        try {
            const response = await fetch(`/projects/${project.id}/export`, {
                method: 'GET',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (!response.ok) throw new Error('Failed to generate report');
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${project.key}_Roadmap.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast.success('Report downloaded successfully!', { id: toastId });
        } catch (error) {
            toast.error('Failed to generate report.', { id: toastId });
        }
    };

    const exportVisualRoadmap = async (format: 'png' | 'pdf') => {
        const element = document.getElementById('gantt-chart-container');
        if (!element) return;
        const toastId = toast.loading(`Preparing ${format.toUpperCase()} export...`);
        try {
            const options = { quality: 0.95, pixelRatio: 2, backgroundColor: '#FFFFFF' };
            if (format === 'png') {
                const dataUrl = await toPng(element, options);
                const link = document.createElement('a');
                link.download = `${project.key}_Roadmap_Visual.png`;
                link.href = dataUrl;
                link.click();
            } else {
                const dataUrl = await toPng(element, options);
                const pdf = new jsPDF({
                    orientation: element.scrollWidth > element.scrollHeight ? 'l' : 'p',
                    unit: 'px',
                    format: [element.scrollWidth, element.scrollHeight]
                });
                pdf.addImage(dataUrl, 'PNG', 0, 0, element.scrollWidth, element.scrollHeight);
                pdf.save(`${project.key}_Roadmap_Full.pdf`);
            }
            toast.success('Roadmap exported successfully!', { id: toastId });
        } catch (error) {
            toast.error('Failed to export visual roadmap.', { id: toastId });
        }
    };

    const tasksWithDates = tasks.filter(t => t.start_date && t.due_date);
    const tasksWithoutDates = tasks.filter(t => !t.start_date || !t.due_date);

    const breadcrumbs = (
        <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono text-sm mr-2 md:mr-3 font-normal">[{project.key}]</span>
            {project.name}
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Roadmap | ${project.key}`} />
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
                {/* Global Header */}
                <header className="px-4 md:px-8 pt-4 md:pt-6 pb-0 border-b border-border flex-shrink-0 bg-background/95 backdrop-blur z-40">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col">
                            <h1 className="text-lg font-semibold text-foreground">Strategic Roadmap</h1>
                            <p className="text-[11px] text-muted-foreground">Macro-level timeline and planning.</p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex gap-2">
                                <button onClick={scrollToToday} className="text-xs px-3 py-1.5 border border-border rounded-sm text-foreground hover:bg-muted transition-colors flex items-center gap-1.5">
                                    <span className="material-icons text-[14px]">today</span>
                                    Jump to Today
                                </button>
                                
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs px-2 py-1.5 rounded-sm transition-colors flex items-center">
                                            <span className="material-icons text-[18px]">more_horiz</span>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64 bg-background border border-border shadow-md">
                                        <DropdownMenuItem onClick={() => handleExport()} className="text-xs cursor-pointer hover:bg-accent">
                                            <span className="material-icons text-[14px] mr-2">table_chart</span> Export to Excel
                                        </DropdownMenuItem>
                                        <div className="h-px bg-border my-1"></div>
                                        <DropdownMenuItem onClick={() => exportVisualRoadmap('png')} className="text-xs cursor-pointer hover:bg-accent">
                                            <span className="material-icons text-[14px] mr-2">image</span> Export as PNG
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => exportVisualRoadmap('pdf')} className="text-xs cursor-pointer hover:bg-accent">
                                            <span className="material-icons text-[14px] mr-2">picture_as_pdf</span> Export as PDF
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="hidden sm:flex bg-muted rounded-sm p-0.5 border border-border/50">
                                <Link href={`/projects/${project.key}/boards`} className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Board</Link>
                                <div className="px-4 py-1.5 text-xs font-medium bg-background text-foreground shadow-sm rounded-sm">Roadmap</div>
                                <Link href={`/projects/${project.key}/reports`} className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Reports</Link>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-6 mt-4 items-center overflow-x-auto no-scrollbar">
                        <div className="flex bg-muted rounded-sm p-0.5 mb-3">
                            {(['days', 'weeks', 'months'] as ViewMode[]).map(mode => (
                                <button key={mode} onClick={() => setViewMode(mode)} className={`px-4 py-1 text-xs font-medium rounded-sm transition-all ${viewMode === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <div ref={scrollContainerRef} className="flex-1 overflow-auto relative bg-background">
                    <div id="gantt-chart-container" className="flex min-h-full" style={{ width: `calc(256px + ${days.length * cellWidth}px)` }}>
                        
                        {/* 1. SIDEBAR */}
                        <div className="w-[256px] flex-shrink-0 bg-background border-r border-border/50 sticky left-0 z-20 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.15)]">
                            <div className="h-[60px] border-b border-border bg-background sticky top-0 flex items-center px-4 z-20 shadow-sm">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Project Tasks</span>
                            </div>
                            <div className="flex flex-col">
                                {tasksWithDates.map(task => (
                                    <div key={task.id} onClick={() => openEditModal(task)} className="h-10 px-4 flex items-center border-b border-border/40 hover:bg-muted/50 transition-colors cursor-pointer group bg-background">
                                        <span className="text-[9px] font-mono text-muted-foreground bg-muted/80 px-1 rounded-sm mr-2 flex-shrink-0">{task.formatted_id}</span>
                                        <span className="text-xs truncate font-medium group-hover:text-primary transition-colors flex-1">{task.title}</span>
                                    </div>
                                ))}
                                {tasksWithoutDates.map(task => (
                                    <div key={task.id} onClick={() => openEditModal(task)} className="h-10 px-4 flex items-center border-b border-border/40 hover:bg-amber-50/50 transition-colors cursor-pointer group bg-background italic text-muted-foreground/60">
                                        <span className="text-[9px] font-mono bg-muted/80 px-1 rounded-sm mr-2 flex-shrink-0">{task.formatted_id}</span>
                                        <span className="text-xs truncate flex-1 group-hover:text-amber-600 transition-colors">{task.title} (No date)</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. TIMELINE */}
                        <div className="flex-1 relative">
                            {/* Header Dates */}
                            <div className="h-[60px] border-b border-border flex sticky top-0 bg-background/95 backdrop-blur z-20 shadow-sm">
                                {days.map((day, i) => {
                                    const isToday = day.toDateString() === today.toDateString();
                                    const showLabel = viewMode === 'days' || (viewMode === 'weeks' && day.getDay() === 1) || (viewMode === 'months' && day.getDate() === 1);
                                    return (
                                        <div key={i} className={`flex-shrink-0 border-r border-border/30 h-full flex flex-col justify-center px-1 ${isToday ? 'bg-primary/5' : ''}`} style={{ width: `${cellWidth}px` }}>
                                            {showLabel && (
                                                <>
                                                    <span className={`text-[9px] font-bold uppercase tracking-tighter ${isToday ? 'text-primary' : 'text-zinc-400'}`}>
                                                        {viewMode === 'months' ? day.toLocaleDateString(undefined, { month: 'short' }) : day.toLocaleDateString(undefined, { weekday: 'short' })}
                                                    </span>
                                                    <span className={`text-[11px] font-mono font-bold leading-none ${isToday ? 'text-primary' : 'text-foreground'}`}>
                                                        {day.getDate()}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Gantt Grid */}
                            <div className="relative pt-0 min-h-full">
                                {tasksWithDates.map((task, idx) => (
                                    <div key={task.id} className="h-10 border-b border-border/30 relative">
                                        <div onClick={() => openEditModal(task)} className={`absolute h-6 rounded-md shadow-sm flex items-center px-2 cursor-pointer transition-all hover:brightness-110 hover:shadow-md z-10 overflow-hidden ${task.status === 'done' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-700' : task.has_conflict ? 'bg-red-500 text-white animate-pulse' : 'bg-primary text-white'}`} style={{ ...getTaskPosition(task), top: '8px' }}>
                                            <span className="text-[9px] font-bold truncate tracking-tight">{task.title}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <TaskModal 
                    isOpen={isModalOpen} onClose={closeModal} task={editingTask as any}
                    current_project={project as any} active_board={active_board}
                    columns={columns} project_members={project_members}
                    canEdit={canEdit} canDelete={isAdmin}
                />
            )}
        </AppLayout>
    );
}
