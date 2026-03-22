import React, { useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

interface User {
  id: number;
  name: string;
  email: string;
}

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

const MyTasks = ({ tasks, available_projects }: PageProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(tasks.length > 0 ? tasks[0] : null);

  const getPriorityColor = (priority: string) => {
      switch(priority) {
          case 'high': return 'text-merkle-red border-merkle-red bg-merkle-red/10';
          case 'medium': return 'text-amber-500 border-amber-500 bg-amber-500/10';
          case 'low': return 'text-emerald-500 border-emerald-500 bg-emerald-500/10';
          default: return 'text-zinc-500 border-zinc-500 bg-zinc-500/10';
      }
  };

  return (
    <AppLayout breadcrumbs={<span>My Inbox</span>} available_projects={available_projects}>
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-white">
          
          {/* LEFT PANE: Task List (35%) */}
          <div className="w-full md:w-1/3 flex flex-col border-r border-zinc-200/80 bg-zinc-50 h-full">
              <div className="px-4 py-3 border-b border-zinc-200 flex justify-between items-center bg-white">
                  <h3 className="text-sm font-semibold text-foreground">Active Tasks ({tasks.length})</h3>
                  <button className="text-zinc-500 hover:text-foreground transition-colors">
                      <span className="material-icons text-[18px]">filter_list</span>
                  </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {tasks.map(task => (
                      <button 
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className={`w-full text-left px-3 py-3 rounded-sm transition-all border-l-2 ${selectedTask?.id === task.id ? 'bg-white border-zinc-200 shadow-sm' : 'border-transparent hover:bg-white/50'}`}
                      >
                          <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-mono text-zinc-500">[{task.project.key}] {task.formatted_id}</span>
                              <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                              </span>
                          </div>
                          <h4 className={`text-sm leading-snug line-clamp-2 ${selectedTask?.id === task.id ? 'text-foreground font-medium' : 'text-zinc-300'}`}>
                              {task.title}
                          </h4>
                          <div className="mt-2 flex items-center gap-2">
                              <span className="text-[10px] text-zinc-500 capitalize">{task.status.replace('_', ' ')}</span>
                          </div>
                      </button>
                  ))}
                  {tasks.length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-zinc-500">
                          <span className="material-icons text-4xl text-zinc-700 block mb-2">done_all</span>
                          Inbox Zero. Great job!
                      </div>
                  )}
              </div>
          </div>

          {/* RIGHT PANE: Task Details (65%) */}
          <div className="flex-1 flex flex-col h-full bg-white overflow-y-auto">
              {selectedTask ? (
                  <div className="flex-1 flex flex-col relative max-w-4xl w-full mx-auto">
                      {/* Actions Bar */}
                      <div className="px-8 py-4 flex justify-between items-center border-b border-zinc-900/50 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                          <div className="flex gap-2">
                              <button className="px-3 py-1.5 text-xs text-primary-foreground bg-primary hover:bg-primary/90 rounded-sm transition-colors flex items-center gap-1.5">
                                  <span className="material-icons text-[14px]">edit</span> Edit Task
                              </button>
                              <button 
                                onClick={() => router.visit(`/projects/${selectedTask.project.key}/boards`)}
                                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-foreground transition-colors flex items-center gap-1.5"
                              >
                                  <span className="material-icons text-[14px]">open_in_new</span> Go to Board
                              </button>
                          </div>
                          <select 
                              className="bg-white border border-zinc-200 text-xs text-foreground rounded-sm px-3 py-1.5 focus:outline-none focus:border-zinc-500 capitalize"
                              value={selectedTask.status}
                              onChange={(e) => {
                                  router.patch(`/tasks/${selectedTask.id}/status`, { status: e.target.value }, { preserveState: true, preserveScroll: true });
                                  setSelectedTask({...selectedTask, status: e.target.value});
                              }}
                          >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="awaiting_review">Awaiting Review</option>
                              <option value="qa_ready">QA Ready</option>
                              <option value="done">Done</option>
                          </select>
                      </div>

                      {/* Detail Content */}
                      <div className="p-8">
                          <div className="mb-6 flex items-center gap-3">
                              <span className="text-sm font-mono text-zinc-500 bg-white px-2 py-1 rounded-sm border border-zinc-200">
                                  {selectedTask.formatted_id}
                              </span>
                              <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border ${getPriorityColor(selectedTask.priority)}`}>
                                  {selectedTask.priority} Priority
                              </span>
                          </div>

                          <h2 className="text-2xl font-semibold text-foreground leading-tight mb-6">
                              {selectedTask.title}
                          </h2>

                          <div className="prose prose-invert max-w-none prose-p:text-sm prose-p:text-zinc-300 prose-headings:text-foreground prose-a:text-merkle-red hover:prose-a:text-red-400 mb-10">
                              {selectedTask.description ? (
                                  <p className="whitespace-pre-wrap">{selectedTask.description}</p>
                              ) : (
                                  <p className="italic text-zinc-600">No description provided.</p>
                              )}
                          </div>

                          {/* Metadata Sidebar (Inline for MVP) */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-sm border border-zinc-200 bg-zinc-50">
                              <div>
                                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Project</div>
                                  <div className="text-sm text-foreground">{selectedTask.project.name}</div>
                              </div>
                              <div>
                                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Created</div>
                                  <div className="text-sm text-foreground">{new Date(selectedTask.created_at).toLocaleDateString()}</div>
                              </div>
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 h-full p-8 text-center">
                      <span className="material-icons text-6xl text-zinc-800 mb-4 block">touch_app</span>
                      <p>Select a task from the list to view details.</p>
                  </div>
              )}
          </div>

      </div>
    </AppLayout>
  );
}

export default MyTasks;