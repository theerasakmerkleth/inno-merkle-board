import React, { useRef } from 'react';
import { Link, usePage } from '@inertiajs/react';
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
}

export default function Reports({ project, velocity, burndown, activeBoardName }: PageProps) {
    const dashboardRef = useRef<HTMLDivElement>(null);

    const handleExportPDF = async () => {
        if (!dashboardRef.current) {
            toast.error('Dashboard container not found.');
            return;
        }
        
        const toastId = toast.loading('Generating PDF...');
        
        try {
            // Add a small delay to ensure any pending renders/animations complete
            await new Promise(resolve => setTimeout(resolve, 500));

            const dataUrl = await toPng(dashboardRef.current, {
                pixelRatio: 2, // High resolution
                backgroundColor: '#ffffff', // Force solid white background
            });

            // Landscape orientation, A4 (297 x 210 mm)
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth(); // 297
            
            const imgProps = pdf.getImageProperties(dataUrl);
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // Add image to PDF at (x: 0, y: 0)
            pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            const filename = `${project.key}_Agile_Insights_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);
            
            toast.success('PDF downloaded successfully!', { id: toastId });
        } catch (error) {
            console.error('PDF Generation Error:', error);
            toast.error('Failed to generate PDF. See console for details.', { id: toastId });
        }
    };

    const handleExportExcel = (type: 'burndown' | 'velocity') => {
        const toastId = toast.loading(`Generating ${type} Excel...`);
        try {
            let data: any[] = [];
            let headers: string[] = [];
            let sheetName = '';

            if (type === 'burndown') {
                sheetName = 'Burndown Data';
                headers = ['Day', 'Remaining Work'];
                data = burndown.actual.map(item => ({
                    'Day': item.day,
                    'Remaining Work': item.remaining
                }));
            } else if (type === 'velocity') {
                sheetName = 'Velocity Data';
                headers = ['Sprint/Board Name', 'Committed Points', 'Completed Points'];
                data = velocity.map(item => ({
                    'Sprint/Board Name': item.name,
                    'Committed Points': item.committed,
                    'Completed Points': item.completed
                }));
            }

            if (data.length === 0) {
                toast.error('No data available to export.', { id: toastId });
                return;
            }

            const ws = XLSX.utils.json_to_sheet(data, { header: headers });

            // Basic styling for header row in Excel using xlsx (though limited without Pro, we set bold via properties if possible, but basic xlsx just does data)
            // For a free version, json_to_sheet is the best we can do client-side easily without a heavy library like exceljs pro.

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, sheetName);

            XLSX.writeFile(wb, `${project.key}_${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('Excel downloaded successfully!', { id: toastId });
        } catch (error) {
            toast.error('Failed to generate Excel.', { id: toastId });
        }
    };

    const breadcrumbs = (        <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono text-sm mr-2 md:mr-3 font-normal">[{project.key}]</span>
            {project.name}
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex-1 overflow-y-auto bg-background flex flex-col">
                
                {/* Global Header */}
                <header className="px-4 md:px-8 pt-4 md:pt-6 pb-4 border-b border-border flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div>
                                <h1 className="text-lg font-semibold text-foreground">Agile Insights</h1>
                                <p className="text-[11px] text-muted-foreground">Measure team velocity and sprint health.</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 md:gap-4">
                            {/* Export Menu */}
                            <div className="flex gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1.5">
                                            <span className="material-icons text-[14px]">download</span>
                                            <span className="hidden sm:inline">Export</span>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 bg-background border border-border shadow-md">
                                        <DropdownMenuItem onClick={handleExportPDF} className="text-xs cursor-pointer hover:bg-accent text-foreground focus:text-foreground">
                                            <span className="material-icons text-[14px] mr-2 text-muted-foreground">picture_as_pdf</span>
                                            Export Dashboard (PDF)
                                        </DropdownMenuItem>
                                        
                                        <div className="h-[1px] bg-border my-1"></div>
                                        
                                        <DropdownMenuItem onClick={() => handleExportExcel('burndown')} className="text-xs cursor-pointer hover:bg-accent text-foreground focus:text-foreground">
                                            <span className="material-icons text-[14px] mr-2 text-muted-foreground">table_view</span>
                                            Export Burndown (Excel)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleExportExcel('velocity')} className="text-xs cursor-pointer hover:bg-accent text-foreground focus:text-foreground">
                                            <span className="material-icons text-[14px] mr-2 text-muted-foreground">table_view</span>
                                            Export Velocity (Excel)
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* View Toggles (Segmented Control Style) */}
                            <div className="hidden sm:flex bg-muted rounded-sm p-0.5 border border-border/50">
                                <Link href={`/projects/${project.key}/boards`} className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                                    Board
                                </Link>
                                <Link href={`/projects/${project.key}/roadmap`} className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                                    Roadmap
                                </Link>
                                <div className="px-4 py-1.5 text-xs font-medium bg-background text-foreground shadow-sm rounded-sm">
                                    Reports
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div ref={dashboardRef} className="p-4 md:p-8 flex flex-col gap-8 bg-background">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Burndown Chart Card */}
                    <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <span className="material-icons text-[16px] text-primary">trending_down</span>
                                    Burndown Chart
                                </h2>
                                <p className="text-[10px] text-muted-foreground mt-1">Sprint: <span className="font-semibold text-foreground">{activeBoardName}</span></p>
                            </div>
                        </div>

                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={burndown.actual}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis 
                                        dataKey="day" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{fill: 'var(--muted-foreground)'}}
                                    />
                                    <YAxis 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{fill: 'var(--muted-foreground)'}}
                                    />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--foreground)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px', color: 'var(--muted-foreground)' }} />
                                    <Line 
                                        name="Work Remaining"
                                        type="monotone" 
                                        dataKey="remaining" 
                                        stroke="var(--primary)" 
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: 'var(--primary)' }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Velocity Chart Card */}
                    <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <span className="material-icons text-[16px] text-[#0391F2]">speed</span>
                                    Velocity Chart
                                </h2>
                                <p className="text-[10px] text-muted-foreground mt-1">Performance across historical boards.</p>
                            </div>
                        </div>

                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={velocity}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis 
                                        dataKey="name" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{fill: 'var(--muted-foreground)'}}
                                    />
                                    <YAxis 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{fill: 'var(--muted-foreground)'}}
                                    />
                                    <Tooltip 
                                        cursor={{fill: 'var(--muted)'}}
                                        contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--foreground)' }}
                                    />
                                    <Legend iconType="rect" wrapperStyle={{ fontSize: '10px', paddingTop: '20px', color: 'var(--muted-foreground)' }} />
                                    <Bar name="Committed" dataKey="committed" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} />
                                    <Bar name="Completed" dataKey="completed" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                {/* Additional Insight Table */}
                <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-border bg-muted/20">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Sprint Completion Statistics</h3>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/10 border-b border-border">
                            <tr>
                                <th className="px-6 py-3 font-medium">Board Name</th>
                                <th className="px-6 py-3 font-medium">Committed</th>
                                <th className="px-6 py-3 font-medium">Completed</th>
                                <th className="px-6 py-3 font-medium">Completion %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {velocity.map((v, i) => (
                                <tr key={i} className="hover:bg-accent transition-colors">
                                    <td className="px-6 py-4 font-medium text-foreground">{v.name}</td>
                                    <td className="px-6 py-4 text-muted-foreground">{v.committed} tasks</td>
                                    <td className="px-6 py-4 text-muted-foreground">{v.completed} tasks</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-xs w-10">
                                                {v.committed > 0 ? Math.round((v.completed / v.committed) * 100) : 0}%
                                            </span>
                                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[100px]">
                                                <div 
                                                    className="h-full bg-primary" 
                                                    style={{ width: `${v.committed > 0 ? (v.completed / v.committed) * 100 : 0}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {velocity.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground italic">No historical board data available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
        </AppLayout>
    );
}
