import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
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
    
    const breadcrumbs = (
        <>
          <span className="text-muted-foreground font-mono text-sm mr-2 font-normal">[{project.key}]</span>
          Reports
        </>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background flex flex-col gap-8">
                
                <header className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground">Agile Insights</h1>
                        <p className="text-sm text-muted-foreground mt-1">Measure team velocity and sprint health.</p>
                    </div>
                    <div className="flex gap-2">
                        <Link 
                            href={`/projects/${project.key}/boards`}
                            className="text-xs px-3 py-1.5 border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Back to Board
                        </Link>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Burndown Chart Card */}
                    <div className="bg-card border border-border rounded-lg p-6 shadow-sm flex flex-col gap-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                    <span className="material-icons text-[18px] text-primary">trending_down</span>
                                    Burndown Chart
                                </h2>
                                <p className="text-xs text-muted-foreground mt-1">Sprint: <span className="font-semibold text-foreground">{activeBoardName}</span></p>
                            </div>
                        </div>

                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={burndown.actual}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
                                    <XAxis 
                                        dataKey="day" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{fill: '#71717A'}}
                                    />
                                    <YAxis 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{fill: '#71717A'}}
                                    />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E4E4E7', borderRadius: '4px', fontSize: '12px' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                                    <Line 
                                        name="Work Remaining"
                                        type="monotone" 
                                        dataKey="remaining" 
                                        stroke="#0328D1" 
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#0328D1' }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Velocity Chart Card */}
                    <div className="bg-card border border-border rounded-lg p-6 shadow-sm flex flex-col gap-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                    <span className="material-icons text-[18px] text-[#0391F2]">speed</span>
                                    Velocity Chart
                                </h2>
                                <p className="text-xs text-muted-foreground mt-1">Performance across historical boards.</p>
                            </div>
                        </div>

                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={velocity}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
                                    <XAxis 
                                        dataKey="name" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{fill: '#71717A'}}
                                    />
                                    <YAxis 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{fill: '#71717A'}}
                                    />
                                    <Tooltip 
                                        cursor={{fill: '#F4F4F5'}}
                                        contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E4E4E7', borderRadius: '4px', fontSize: '12px' }}
                                    />
                                    <Legend iconType="rect" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                                    <Bar name="Committed" dataKey="committed" fill="#AEAEBC" radius={[4, 4, 0, 0]} />
                                    <Bar name="Completed" dataKey="completed" fill="#0391F2" radius={[4, 4, 0, 0]} />
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
        </AppLayout>
    );
}
