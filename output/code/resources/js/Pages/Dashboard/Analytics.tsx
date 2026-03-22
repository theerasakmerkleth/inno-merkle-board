import React from 'react';
import { usePage } from '@inertiajs/react';
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
}

const Analytics = ({ resourceLoad, avgCycleTimeHours, avgCycleTimeDays }: PageProps) => {
  const maxTasks = Math.max(...resourceLoad.map(r => r.active_tasks_count), 1);

  return (
    <AppLayout breadcrumbs={<span>Analytics Dashboard</span>}>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 bg-background">
          <div className="flex justify-between items-end mb-2">
              <div>
                  <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">Enterprise Analytics</h2>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">High-level resource and performance metrics across the workspace.</p>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Cycle Time */}
              <div className="bg-card border border-border rounded-lg p-6 flex flex-col shadow-sm">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span className="material-icons text-[16px]">schedule</span>
                      Average Cycle Time
                  </h3>
                  <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-4xl font-semibold tracking-tight text-foreground">{avgCycleTimeDays}</span>
                      <span className="text-muted-foreground text-sm">Days</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">Average time from In Progress to Done.</p>
              </div>

              {/* Card 2: Active Members */}
              <div className="bg-card border border-border rounded-lg p-6 flex flex-col shadow-sm">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span className="material-icons text-[16px]">group</span>
                      Active Team Members
                  </h3>
                  <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-4xl font-semibold tracking-tight text-foreground">{resourceLoad.length}</span>
                  </div>
              </div>

              {/* Card 3: AI Insights */}
              <div className="bg-[#0391F2]/10 border border-[#0391F2]/30 rounded-lg p-6 flex flex-col shadow-sm relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-10">
                      <span className="material-icons text-[100px] text-[#0391F2]">smart_toy</span>
                  </div>
                  <h3 className="text-sm font-medium text-[#0391F2] uppercase tracking-wider mb-2 flex items-center gap-2 z-10">
                      <span className="material-icons text-[16px]">smart_toy</span>
                      AI Insights
                  </h3>
                  <div className="flex-1 mt-2 z-10">
                      {resourceLoad.length > 0 ? (
                          <div className="text-sm text-foreground leading-relaxed">
                              System capacity is currently at nominal levels. <strong className="text-foreground">User {resourceLoad.sort((a,b) => b.active_tasks_count - a.active_tasks_count)[0]?.name}</strong> has the highest workload with {resourceLoad.sort((a,b) => b.active_tasks_count - a.active_tasks_count)[0]?.active_tasks_count} active tasks. Consider rebalancing if cycle times increase.
                          </div>
                      ) : (
                          <div className="text-sm text-muted-foreground italic">No significant bottlenecks detected.</div>
                      )}
                  </div>
              </div>
          </div>

          {/* Resource Loading Heatmap */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm mt-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                  <span className="material-icons text-[16px]">assessment</span>
                  Resource Workloads
              </h3>
              <div className="space-y-5">
                  {resourceLoad.map(resource => (
                      <div key={resource.id} className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-foreground font-medium">{resource.name}</span>
                              <span className="text-muted-foreground font-mono text-xs">{resource.active_tasks_count} active tasks</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3 overflow-hidden shadow-inner">
                              <div 
                                  className="bg-primary h-3 rounded-full transition-all duration-500" 
                                  style={{ width: `${(resource.active_tasks_count / maxTasks) * 100}%` }}
                              ></div>
                          </div>
                      </div>
                  ))}
                  {resourceLoad.length === 0 && (
                      <div className="text-sm text-muted-foreground italic py-4 text-center">No resources currently assigned to active tasks.</div>
                  )}
              </div>
          </div>

      </div>
    </AppLayout>
  );
}

export default Analytics;