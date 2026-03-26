import React, { useRef } from 'react';
import { Link, usePage, Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface Project {
    id: number;
    key: string;
    name: string;
}

interface VelocityItem {
    name: string;
    committed: number;
    completed: number;
}

interface BurndownItem {
    day: string;
    remaining: number;
}

interface PageProps {
    project: Project;
    velocity: VelocityItem[];
    burndown: {
        actual: BurndownItem[];
        ideal: { day: string; value: number }[];
    };
    activeBoardName: string;
    project_role: string;
    auth: any;
}

export default function Reports({ project, velocity, burndown, activeBoardName, project_role = 'Viewer', auth }: PageProps) {
    const dashboardRef = useRef<HTMLDivElement>(null);
    const isAdmin = auth?.user?.role === 'Admin' || auth?.user?.roles?.some((r: any) => r.name === 'Admin');

    const handleExportPDF = async () => {
        if (!dashboardRef.current) return;
        const toastId = toast.loading('Preparing PDF report...');
        try {
            const dataUrl = await toPng(dashboardRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${project.key}_Insights.pdf`);
            toast.success('PDF report downloaded.', { id: toastId });
        } catch (error) {
            toast.error('Export failed.', { id: toastId });
        }
    };

    const handleExportExcel = (type: 'burndown' | 'velocity') => {
        const toastId = toast.loading(`Generating ${type} Excel...`);
        try {
            let data = type === 'burndown' 
                ? burndown.actual.map(i => ({ 'Day': i.day, 'Work Remaining': i.remaining }))
                : velocity.map(v => ({ 'Board': v.name, 'Committed': v.committed, 'Completed': v.completed }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Data');
            XLSX.writeFile(wb, `${project.key}_${type}.xlsx`);
            toast.success('Excel downloaded.', { id: toastId });
        } catch (error) {
            toast.error('Export failed.', { id: toastId });
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
            <Head title={`Insights | ${project.key}`} />
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
                
                {/* UNIFIED WORKSPACE HEADER (v57) */}
                <header className="px-4 md:px-8 pt-6 pb-0 border-b border-primary/5 flex-shrink-0 bg-background/80 backdrop-blur-xl sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Agile Insights</h1>
                            <p className="text-xs text-zinc-500 font-medium">Performance analytics and team velocity.</p>
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
                                    <DropdownMenuItem onClick={handleExportPDF} className="text-xs cursor-pointer hover:bg-zinc-50 py-2.5">
                                        <span className="material-icons text-[16px] mr-3 text-zinc-400">picture_as_pdf</span> Export Dashboard (PDF)
                                    </DropdownMenuItem>
                                    <div className="h-px bg-zinc-100 my-1"></div>
                                    <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tabular Data</div>
                                    <DropdownMenuItem onClick={() => handleExportExcel('burndown')} className="text-xs cursor-pointer hover:bg-zinc-50 py-2.5">
                                        <span className="material-icons text-[16px] mr-3 text-zinc-400">table_view</span> Export Burndown (Excel)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExportExcel('velocity')} className="text-xs cursor-pointer hover:bg-zinc-50 py-2.5">
                                        <span className="material-icons text-[16px] mr-3 text-zinc-400">table_view</span> Export Velocity (Excel)
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="hidden sm:flex bg-zinc-100/80 rounded-md p-1 gap-1 border border-zinc-200/50 shadow-inner">
                                <Link href={`/projects/${project?.key}/boards`} className="px-4 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Board</Link>
                                <Link href={`/projects/${project?.key}/roadmap`} className="px-4 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Roadmap</Link>
                                <div className="px-4 py-1.5 text-xs font-bold bg-white text-zinc-900 shadow-sm rounded-[4px] border border-zinc-200/50">Reports</div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 bg-[#F9FAFB] animate-in fade-in duration-300">
                    <div ref={dashboardRef} className="max-w-7xl mx-auto flex flex-col gap-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            {/* Burndown Card */}
                            <div className="bg-white border border-zinc-200/60 rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-8">
                                <div>
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                        Burndown Velocity
                                    </h2>
                                    <p className="text-sm font-bold text-zinc-900 mt-1">Sprint: {activeBoardName}</p>
                                </div>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <LineChart data={burndown.actual}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                                            <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#a1a1aa'}} />
                                            <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#a1a1aa'}} />
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '12px', fontSize: '12px' }} />
                                            <Line name="Work Remaining" type="monotone" dataKey="remaining" stroke="oklch(0.488 0.243 264.376)" strokeWidth={4} dot={{ r: 4, fill: 'oklch(0.488 0.243 264.376)' }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Velocity Card */}
                            <div className="bg-white border border-zinc-200/60 rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col gap-8">
                                <div>
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                                        Historical Performance
                                    </h2>
                                    <p className="text-sm font-bold text-zinc-900 mt-1">Cross-board Velocity</p>
                                </div>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <BarChart data={velocity}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                                            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#a1a1aa'}} />
                                            <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#a1a1aa'}} />
                                            <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7', borderRadius: '12px', fontSize: '12px' }} />
                                            <Bar name="Committed" dataKey="committed" fill="#e4e4e7" radius={[4, 4, 0, 0]} />
                                            <Bar name="Completed" dataKey="completed" fill="oklch(0.488 0.243 264.376)" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Completion Table */}
                        <div className="bg-white border border-zinc-200/60 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                            <div className="px-8 py-5 border-b border-zinc-50 bg-zinc-50/30 flex justify-between items-center">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Board Completion Statistics</h3>
                            </div>
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] uppercase tracking-widest text-zinc-400 bg-white border-b border-zinc-50">
                                    <tr>
                                        <th className="px-8 py-4 font-bold">Board Name</th>
                                        <th className="px-8 py-4 font-bold">Committed</th>
                                        <th className="px-8 py-4 font-bold">Completed</th>
                                        <th className="px-8 py-4 font-bold">Health</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-50">
                                    {velocity.map((v, i) => {
                                        const pct = v.committed > 0 ? Math.round((v.completed / v.committed) * 100) : 0;
                                        return (
                                            <tr key={i} className="hover:bg-primary/[0.01] transition-colors">
                                                <td className="px-8 py-5 font-bold text-zinc-900">{v.name}</td>
                                                <td className="px-8 py-5 text-zinc-500 font-medium">{v.committed} pts</td>
                                                <td className="px-8 py-5 text-zinc-500 font-medium">{v.completed} pts</td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-mono text-xs font-bold text-zinc-900 w-10">{pct}%</span>
                                                        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden max-w-[120px]">
                                                            <div className={`h-full transition-all duration-1000 ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
