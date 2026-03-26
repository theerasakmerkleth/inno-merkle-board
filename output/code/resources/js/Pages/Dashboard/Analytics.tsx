import React from 'react';
import { usePage, Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

interface ResourceLoad {
  id: number;
  name: string;
  active_tasks_count: number;
}

interface PageProps {
  resourceLoad: ResourceLoad[];
  avgCycleTimeHours: number;
  avgCycleTimeDays: number;
  available_projects: any[];
}

export default function Analytics({ resourceLoad, avgCycleTimeHours, avgCycleTimeDays, available_projects }: PageProps) {
  const maxTasks = Math.max(...resourceLoad.map(r => r.active_tasks_count), 1);

  const breadcrumbs = (
    <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
        <span className="material-icons text-[14px]">bar_chart</span>
        <span className="text-zinc-900">Workspace Analytics</span>
    </div>
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs} available_projects={available_projects}>
      <Head title="Analytics | MerkleBoard" />
      
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
          
          {/* UNIFIED WORKSPACE HEADER (v57) */}
          <header className="px-4 md:px-8 pt-6 pb-6 border-b border-primary/5 flex-shrink-0 bg-background/80 backdrop-blur-xl sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                      <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Enterprise Analytics</h1>
                      <p className="text-xs text-zinc-500 font-medium">High-level resource and performance metrics across the workspace.</p>
                  </div>
              </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 bg-[#F9FAFB] animate-in fade-in duration-500">
              <div className="max-w-7xl mx-auto space-y-8">
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Metric 1: Cycle Time */}
                      <div className="bg-white border border-zinc-200/60 rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-300 group">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 flex items-center gap-2">
                              <span className="material-icons text-[16px]">schedule</span>
                              Avg Cycle Time
                          </h3>
                          <div className="flex items-baseline gap-2">
                              <span className="text-5xl font-black text-zinc-900 tracking-tighter group-hover:text-primary transition-colors">{avgCycleTimeDays}</span>
                              <span className="text-zinc-400 font-bold text-xs uppercase">Days</span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-6 leading-relaxed font-medium">Average duration from In Progress to completion across all projects.</p>
                      </div>

                      {/* Metric 2: Resource Count */}
                      <div className="bg-white border border-zinc-200/60 rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-300 group">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4 flex items-center gap-2">
                              <span className="material-icons text-[16px]">group</span>
                              Active Members
                          </h3>
                          <div className="flex items-baseline gap-2">
                              <span className="text-5xl font-black text-zinc-900 tracking-tighter group-hover:text-primary transition-colors">{resourceLoad.length}</span>
                              <span className="text-zinc-400 font-bold text-xs uppercase">Talents</span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-6 leading-relaxed font-medium">Total unique contributors with tasks assigned in active boards.</p>
                      </div>

                      {/* Metric 3: AI Insights */}
                      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative overflow-hidden group">
                          <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-700">
                              <span className="material-icons text-[160px] text-primary">psychology</span>
                          </div>
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4 flex items-center gap-2 relative z-10">
                              <span className="material-icons text-[16px] animate-pulse">smart_toy</span>
                              AI Insights
                          </h3>
                          <div className="relative z-10">
                              {resourceLoad.length > 0 ? (
                                  <div className="text-sm font-semibold text-zinc-700 leading-relaxed">
                                      System capacity is <span className="text-primary">nominal</span>. 
                                      {resourceLoad.sort((a,b) => b.active_tasks_count - a.active_tasks_count)[0]?.name} is currently the primary focus with 
                                      <span className="bg-primary/10 px-1.5 py-0.5 rounded mx-1 text-primary font-mono">{resourceLoad.sort((a,b) => b.active_tasks_count - a.active_tasks_count)[0]?.active_tasks_count}</span> active tasks.
                                  </div>
                              ) : (
                                  <div className="text-sm text-zinc-400 italic">No significant bottlenecks detected by the cognitive engine.</div>
                              )}
                          </div>
                      </div>
                  </div>

                  {/* Resource Loading Heatmap */}
                  <div className="bg-white border border-zinc-200/60 rounded-2xl p-10 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                      <div className="flex justify-between items-center mb-10">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-3">
                              <div className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                              Resource Load Distribution
                          </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
                          {resourceLoad.map(resource => (
                              <div key={resource.id} className="flex flex-col gap-3 group">
                                  <div className="flex justify-between items-end">
                                      <div className="flex items-center gap-3">
                                          <div className="h-6 w-6 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-[8px] font-black text-zinc-400 uppercase">
                                              {resource.name.substring(0, 2)}
                                          </div>
                                          <span className="text-sm font-bold text-zinc-700 group-hover:text-primary transition-colors">{resource.name}</span>
                                      </div>
                                      <span className="text-[10px] font-mono font-black text-zinc-400 tracking-tighter">{resource.active_tasks_count} ACTIVE</span>
                                  </div>
                                  <div className="w-full bg-zinc-50 rounded-full h-1.5 overflow-hidden border border-zinc-100 shadow-inner">
                                      <div 
                                          className={`h-full transition-all duration-1000 ease-out ${resource.active_tasks_count > 5 ? 'bg-red-400' : 'bg-primary'}`} 
                                          style={{ width: `${(resource.active_tasks_count / maxTasks) * 100}%` }}
                                      ></div>
                                  </div>
                              </div>
                          ))}
                          {resourceLoad.length === 0 && (
                              <div className="col-span-2 py-20 text-center flex flex-col items-center opacity-30">
                                  <span className="material-icons text-4xl mb-2">group_off</span>
                                  <p className="text-xs font-bold uppercase tracking-widest">No active resource data</p>
                              </div>
                          )}
                      </div>
                  </div>

              </div>
          </div>

      </div>
    </AppLayout>
  );
}
