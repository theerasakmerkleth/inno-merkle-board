import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

import TaskModal from '@/components/Task/TaskModal';
import { AICommandCenter } from '@/components/AI/AICommandCenter';

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
            const dataUrl = await toPng(element, options);
            if (format === 'png') {
                const link = document.createElement('a');
                link.download = `${project.key}_Roadmap_Visual.png`;
                link.href = dataUrl;
                link.click();
            } else {
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
        <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
            <span className="material-icons text-[14px]">folder_open</span>
            <span className="text-zinc-900">[{project.key}] {project.name}</span>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Roadmap | ${project.key}`} />
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
                
                {/* UNIFIED WORKSPACE HEADER (v57) */}
                <header className="px-4 md:px-8 pt-6 pb-0 border-b border-primary/5 flex-shrink-0 bg-background/80 backdrop-blur-xl sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Strategic Roadmap</h1>
                                <p className="text-xs text-zinc-500 font-medium">Macro-level timeline and planning.</p>
                            </div>
                            {canEdit && (
                                <div className="flex items-center gap-2">
                                    <AICommandCenter projectId={project.id} projectKey={project.key} />
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {(project_role === 'Manager' || isAdmin) && (
                                <Link href={`/projects/${project.key}/settings`} className="bg-white border border-zinc-200 text-zinc-500 hover:text-primary hover:border-primary/30 p-1.5 rounded-md transition-all flex items-center shadow-sm" title="Project Settings">
                                    <span className="material-icons text-[20px]">settings</span>
                                </Link>
                            )}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 px-2.5 py-1.5 rounded-md transition-all flex items-center shadow-sm">
                                        <span className="material-icons text-[20px]">more_horiz</span>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 bg-white border border-zinc-200 shadow-xl rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                    <DropdownMenuItem onClick={scrollToToday} className="text-xs cursor-pointer hover:bg-zinc-50 py-2.5">
                                        <span className="material-icons text-[16px] mr-3 text-zinc-400">today</span> Jump to Today
                                    </DropdownMenuItem>
                                    <div className="h-px bg-zinc-100 my-1"></div>
                                    <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Reports</div>
                                    <DropdownMenuItem onClick={handleExport} className="text-xs cursor-pointer hover:bg-zinc-50 py-2.5">
                                        <span className="material-icons text-[16px] mr-3 text-zinc-400">table_chart</span> Export to Excel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => exportVisualRoadmap('png')} className="text-xs cursor-pointer hover:bg-zinc-50 py-2.5">
                                        <span className="material-icons text-[16px] mr-3 text-zinc-400">image</span> Export as PNG
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => exportVisualRoadmap('pdf')} className="text-xs cursor-pointer hover:bg-zinc-50 py-2.5">
                                        <span className="material-icons text-[16px] mr-3 text-zinc-400">picture_as_pdf</span> Export as PDF
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* UNIFIED VIEW SWITCHER (v57) */}
                            <div className="hidden sm:flex bg-zinc-100/80 rounded-md p-1 gap-1 border border-zinc-200/50 shadow-inner">
                                <Link href={`/projects/${project?.key}/boards`} className="px-4 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Board</Link>
                                <div className="px-4 py-1.5 text-xs font-bold bg-white text-zinc-900 shadow-sm rounded-[4px] border border-zinc-200/50">Roadmap</div>
                                <Link href={`/projects/${project?.key}/reports`} className="px-4 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Reports</Link>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-8 items-center overflow-x-auto no-scrollbar pb-0.5">
                        <div className="flex bg-zinc-100/80 rounded-md p-1 mb-3 shadow-inner">
                            {(['days', 'weeks', 'months'] as ViewMode[]).map(mode => (
                                <button key={mode} onClick={() => setViewMode(mode)} className={`px-4 py-1 text-xs font-bold uppercase tracking-widest rounded-[4px] transition-all ${viewMode === mode ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-400 hover:text-zinc-600'}`}>
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                <div ref={scrollContainerRef} className="flex-1 overflow-auto relative bg-[#F9FAFB] animate-in fade-in duration-300">
                    <div id="gantt-chart-container" className="flex min-h-full" style={{ width: `calc(256px + ${days.length * cellWidth}px)` }}>
                        
                        {/* 1. SIDEBAR */}
                        <div className="w-[256px] flex-shrink-0 bg-background border-r border-border/50 sticky left-0 z-20 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.05)]">
                            <div className="h-[60px] border-b border-border/30 bg-background sticky top-0 flex items-center px-4 z-20">
                                <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-black">Project Tasks</span>
                            </div>
                            <div className="flex flex-col">
                                {tasksWithDates.map(task => (
                                    <div key={task.id} onClick={() => openEditModal(task)} className="h-10 px-4 flex items-center border-b border-zinc-50 hover:bg-muted/30 transition-colors cursor-pointer group bg-background">
                                        <span className="text-[9px] font-mono text-zinc-400 bg-zinc-50 px-1 rounded-sm mr-2 flex-shrink-0 border border-zinc-100">{task.formatted_id}</span>
                                        <span className="text-xs truncate font-semibold text-zinc-700 group-hover:text-primary transition-colors flex-1">{task.title}</span>
                                    </div>
                                ))}
                                {tasksWithoutDates.map(task => (
                                    <div key={task.id} onClick={() => openEditModal(task)} className="h-10 px-4 flex items-center border-b border-zinc-50 hover:bg-amber-50/30 transition-colors cursor-pointer group bg-background italic">
                                        <span className="text-[9px] font-mono bg-amber-50 text-amber-600 px-1 rounded-sm mr-2 flex-shrink-0 border border-amber-100">{task.formatted_id}</span>
                                        <span className="text-xs truncate flex-1 text-zinc-400 group-hover:text-amber-600 transition-colors">{task.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. TIMELINE */}
                        <div className="flex-1 relative">
                            {/* Header Dates */}
                            <div className="h-[60px] border-b border-border/30 flex sticky top-0 bg-background/95 backdrop-blur z-20">
                                {days.map((day, i) => {
                                    const isToday = day.toDateString() === today.toDateString();
                                    const showLabel = viewMode === 'days' || (viewMode === 'weeks' && day.getDay() === 1) || (viewMode === 'months' && day.getDate() === 1);
                                    return (
                                        <div key={i} className={`flex-shrink-0 border-r border-zinc-100 h-full flex flex-col justify-center px-1 ${isToday ? 'bg-primary/[0.03]' : ''}`} style={{ width: `${cellWidth}px` }}>
                                            {showLabel && (
                                                <>
                                                    <span className={`text-[9px] font-black uppercase tracking-tighter ${isToday ? 'text-primary' : 'text-zinc-300'}`}>
                                                        {viewMode === 'months' ? day.toLocaleDateString(undefined, { month: 'short' }) : day.toLocaleDateString(undefined, { weekday: 'short' })}
                                                    </span>
                                                    <span className={`text-[11px] font-mono font-bold leading-none ${isToday ? 'text-primary' : 'text-zinc-500'}`}>
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
                                    <div key={task.id} className="h-10 border-b border-zinc-50 relative group">
                                        <div 
                                            onClick={() => openEditModal(task)} 
                                            className={`absolute h-6 rounded-md shadow-sm flex items-center px-2 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md z-10 overflow-hidden ${
                                                task.status === 'done' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700' : 
                                                task.has_conflict ? 'bg-red-500 text-white animate-pulse' : 
                                                'bg-primary text-white'
                                            }`} 
                                            style={{ ...getTaskPosition(task), top: '8px' }}
                                        >
                                            <span className="text-[10px] font-black truncate tracking-tight">{task.title}</span>
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
