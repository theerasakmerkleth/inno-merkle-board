import React, { useState } from 'react';
import { router, Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Project {
  id: number;
  key: string;
  name: string;
}

interface Task {
  id: number;
  formatted_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  project: Project;
  created_at: string;
}

interface PageProps {
  tasks: Task[];
  available_projects: Project[];
}

export default function MyTasks({ tasks, available_projects }: PageProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(tasks.length > 0 ? tasks[0] : null);

  const getPriorityIcon = (priority: string) => {
      switch(priority) {
          case 'highest': return { icon: 'keyboard_double_arrow_up', color: 'text-red-600' };
          case 'high': return { icon: 'keyboard_arrow_up', color: 'text-red-500' };
          case 'low': return { icon: 'keyboard_arrow_down', color: 'text-blue-400' };
          case 'lowest': return { icon: 'keyboard_double_arrow_down', color: 'text-blue-300' };
          default: return { icon: 'drag_handle', color: 'text-zinc-300' };
      }
  };

  const breadcrumbs = (
    <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
        <span className="material-icons text-[14px]">inbox</span>
        <span className="text-zinc-900">Personal Inbox</span>
    </div>
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs} available_projects={available_projects}>
      <Head title="My Inbox | MerkleBoard" />
      
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-background">
          
          {/* LEFT PANE: Task Feed (v57 Zen) */}
          <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-zinc-100 bg-[#F9FAFB] h-full shrink-0">
              <header className="px-6 py-5 border-b border-zinc-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                  <div className="flex justify-between items-center">
                      <h2 className="text-sm font-black uppercase tracking-[0.15em] text-zinc-400">Your Work ({tasks.length})</h2>
                      <span className="material-icons text-zinc-300 text-[18px]">filter_list</span>
                  </div>
              </header>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
                  {tasks.map(task => (
                      <button 
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className={`w-full text-left p-4 rounded-xl transition-all duration-300 relative group overflow-hidden ${
                              selectedTask?.id === task.id 
                              ? 'bg-white shadow-md ring-1 ring-primary/5' 
                              : 'hover:bg-white hover:shadow-sm'
                          }`}
                      >
                          <div className="flex justify-between items-start mb-2">
                              <span className={`font-mono text-[10px] font-bold tracking-tighter ${selectedTask?.id === task.id ? 'text-primary' : 'text-zinc-400'}`}>
                                  {task.formatted_id}
                              </span>
                              <span className={`material-icons text-[16px] ${getPriorityIcon(task.priority).color}`}>
                                  {getPriorityIcon(task.priority).icon}
                              </span>
                          </div>
                          <h4 className={`text-sm font-semibold leading-snug line-clamp-2 transition-colors ${selectedTask?.id === task.id ? 'text-zinc-900' : 'text-zinc-500 group-hover:text-zinc-900'}`}>
                              {task.title}
                          </h4>
                          <div className="mt-3 flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-zinc-200" />
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">[{task.project.key}] {task.status.replace('_', ' ')}</span>
                          </div>
                      </button>
                  ))}
                  {tasks.length === 0 && (
                      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center opacity-30">
                          <span className="material-icons text-[48px] mb-4">check_circle_outline</span>
                          <p className="text-xs font-bold uppercase tracking-widest">Inbox Zero</p>
                      </div>
                  )}
              </div>
          </div>

          {/* RIGHT PANE: Detail View (v57 Unified) */}
          <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
              {selectedTask ? (
                  <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500">
                      {/* Sub-Header Area */}
                      <div className="px-8 py-5 border-b border-zinc-100 bg-white/80 backdrop-blur-md flex justify-between items-center shrink-0">
                          <div className="flex items-center gap-4">
                              <Link 
                                href={`/projects/${selectedTask.project.key}/boards?taskId=${selectedTask.id}`}
                                className="bg-primary/5 text-primary hover:bg-primary/10 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm border border-primary/10"
                              >
                                  <span className="material-icons text-[16px]">open_in_new</span>
                                  Open in Board
                              </Link>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mr-2">Status</span>
                              <select 
                                  className="bg-zinc-50 border border-zinc-100 text-[11px] font-black uppercase tracking-widest text-zinc-700 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-primary/10 outline-none cursor-pointer"
                                  value={selectedTask.status}
                                  onChange={(e) => {
                                      router.patch(`/tasks/${selectedTask.id}`, { board_column_id: selectedTask.id }, { preserveState: true, preserveScroll: true }); // Status update logic needs to match backend
                                      setSelectedTask({...selectedTask, status: e.target.value});
                                  }}
                              >
                                  <option value="todo">To Do</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="qa_ready">QA Ready</option>
                                  <option value="done">Done</option>
                              </select>
                          </div>
                      </div>

                      {/* Content Scroll Area */}
                      <div className="flex-1 overflow-y-auto p-10 lg:p-16">
                          <div className="max-w-3xl mx-auto space-y-10">
                              <div className="flex flex-col gap-4">
                                  <div className="flex items-center gap-3">
                                      <span className="text-[11px] font-mono font-bold bg-zinc-100 text-zinc-500 px-2 py-1 rounded-md border border-zinc-200 uppercase tracking-tighter">
                                          {selectedTask.formatted_id}
                                      </span>
                                      <div className="h-4 w-px bg-zinc-200" />
                                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                          {selectedTask.project.name}
                                      </span>
                                  </div>
                                  <h1 className="text-3xl font-bold text-zinc-900 leading-tight tracking-tight">
                                      {selectedTask.title}
                                  </h1>
                              </div>

                              <div className="prose prose-zinc max-w-none">
                                  <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-300 mb-4">Description</h3>
                                  {selectedTask.description ? (
                                      <div className="text-zinc-600 leading-relaxed text-sm whitespace-pre-wrap font-medium" dangerouslySetInnerHTML={{ __html: selectedTask.description }} />
                                  ) : (
                                      <p className="italic text-zinc-300 text-sm">No detailed specifications provided.</p>
                                  )}
                              </div>

                              {/* Metadata Grid */}
                              <div className="pt-10 border-t border-zinc-100 grid grid-cols-2 gap-12">
                                  <div className="space-y-2">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Timeline</span>
                                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                                          <span className="material-icons text-[18px] text-zinc-300">event</span>
                                          Created on {new Date(selectedTask.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                      </div>
                                  </div>
                                  <div className="space-y-2">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Priority Level</span>
                                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 uppercase">
                                          <span className={`material-icons text-[18px] ${getPriorityIcon(selectedTask.priority).color}`}>
                                              {getPriorityIcon(selectedTask.priority).icon}
                                          </span>
                                          {selectedTask.priority}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-300 p-8 text-center animate-pulse">
                      <span className="material-icons text-[64px] mb-4">inbox</span>
                      <p className="text-sm font-bold uppercase tracking-[0.2em]">Select a Task to Focus</p>
                  </div>
              )}
          </div>

      </div>
    </AppLayout>
  );
}
