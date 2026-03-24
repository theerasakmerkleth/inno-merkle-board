import React, { useState, FormEvent, useEffect } from 'react';
import { usePage, Link, useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Project {
  id: number;
  key: string;
  name: string;
  status: string;
  users_count: number;
}

interface PageProps {
  projects: Project[];
}

export default function ProjectsIndex({ projects }: PageProps) {
  const { auth } = usePage<{ auth: { user: { role: string } } }>().props;
  const [isCreating, setIsCreating] = useState(false);
  const [projectList, setProjectList] = useState<Project[]>(projects);

  useEffect(() => {
    setProjectList(projects);
  }, [projects]);

  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    key: '',
  });

  const canCreate = auth.user.role === 'Admin' || auth.user.role === 'Project Manager';

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    post('/projects', {
      preserveScroll: true,
      onSuccess: () => {
        setIsCreating(false);
        reset();
      },
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
        const oldIndex = projectList.findIndex(p => p.id.toString() === active.id);
        const newIndex = projectList.findIndex(p => p.id.toString() === over.id);

        const newList = arrayMove(projectList, oldIndex, newIndex);
        setProjectList(newList);

        router.patch('/projects/reorder', {
            project_ids: newList.map(p => p.id)
        }, {
            preserveScroll: true,
        });
    }
  };

  // Generate key from name if not manually edited
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      setData('name', name);
      if (!data.key || data.key === name.substring(0, data.key.length).toUpperCase()) {
          const generatedKey = name.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase();
          setData('key', generatedKey);
      }
  };

  return (
    <AppLayout breadcrumbs={<span>Workspace Hub</span>}>
      
      <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-background flex flex-col">
          <div className="flex justify-between items-end mb-10">
              <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">Workspace Hub</h1>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">Your centralized project directory and management center.</p>
              </div>
              {canCreate && (
                  <button 
                      onClick={() => setIsCreating(true)}
                      className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-2"
                  >
                      <span className="material-icons text-[18px]">add</span>
                      New Project
                  </button>
              )}
          </div>

          {projectList.length > 0 ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={projectList.map(p => p.id.toString())} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {projectList.map(project => (
                              <SortableProjectCard 
                                  key={project.id} 
                                  project={project} 
                                  canEdit={canCreate} 
                              />
                          ))}
                      </div>
                  </SortableContext>
              </DndContext>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <div className="bg-muted w-24 h-24 rounded-full flex items-center justify-center mb-6">
                      <span className="material-icons text-5xl text-muted-foreground">folder_open</span>
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">No projects yet</h2>
                  <p className="text-muted-foreground max-w-md mb-6">Create your first project to start organizing tasks, sprints, and teams.</p>
                  {canCreate && (
                      <button 
                          onClick={() => setIsCreating(true)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-sm text-sm transition-colors shadow-sm"
                      >
                          Create Project
                      </button>
                  )}
              </div>
          )}

          {/* Create Project Slide-over Panel (Sheet) */}
          {isCreating && (
              <div className="fixed inset-0 z-[100] flex justify-end">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsCreating(false)}></div>
                  <div className="relative bg-card border-l border-border shadow-2xl w-full sm:w-[400px] h-full flex flex-col overflow-hidden animate-in slide-in-from-right">
                      <header className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
                          <h2 className="text-lg font-semibold text-foreground">Create New Project</h2>
                          <button onClick={() => setIsCreating(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-sm hover:bg-muted">
                              <span className="material-icons">close</span>
                          </button>
                      </header>
                      
                      <div className="p-6 flex-1 overflow-y-auto">
                          <form id="create-project-form" onSubmit={handleCreate} className="space-y-6">
                              <div className="space-y-2">
                                  <label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project Name</label>
                                  <input
                                      id="name"
                                      type="text"
                                      value={data.name}
                                      onChange={handleNameChange}
                                      className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring transition-colors"
                                      placeholder="e.g., Marketing Q3"
                                      autoFocus
                                      required
                                  />
                                  {errors.name && <div className="text-xs text-destructive">{errors.name}</div>}
                              </div>

                              <div className="space-y-2">
                                  <label htmlFor="key" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project Key</label>
                                  <input
                                      id="key"
                                      type="text"
                                      value={data.key}
                                      onChange={e => setData('key', e.target.value.toUpperCase())}
                                      className="w-full bg-transparent border border-border rounded-sm px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-ring transition-colors"
                                      placeholder="e.g., MKT"
                                      required
                                      maxLength={5}
                                      minLength={2}
                                  />
                                  <p className="text-xs text-muted-foreground">Used as a prefix for task IDs (e.g., MKT-123).</p>
                                  {errors.key && <div className="text-xs text-destructive">{errors.key}</div>}
                              </div>
                          </form>
                      </div>

                      <footer className="p-4 border-t border-border bg-muted/30 flex justify-end gap-3">
                          <button 
                              type="button" 
                              onClick={() => setIsCreating(false)}
                              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit" 
                              form="create-project-form"
                              disabled={processing}
                              className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm px-6 py-2 rounded-sm transition-colors shadow-sm disabled:opacity-50"
                          >
                              {processing ? 'Creating...' : 'Create Project'}
                          </button>
                      </footer>
                  </div>
              </div>
          )}

      </div>
    </AppLayout>
  );
}

const SortableProjectCard = ({ project, canEdit }: { project: Project; canEdit: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: project.id.toString(),
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 999 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            className="bg-card border border-border/60 rounded-lg p-6 flex flex-col shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05),0_4px_6px_-4px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 relative group cursor-default"
        >
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    {canEdit && (
                        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-primary transition-colors">
                            <span className="material-icons text-[18px]">drag_indicator</span>
                        </div>
                    )}
                    <span className="font-mono text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded border border-primary/10 tracking-widest uppercase">
                        {project.key}
                    </span>
                </div>
                <div className={`h-2 w-2 rounded-full ${project.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-zinc-300'}`} title={project.status}></div>
            </div>

            {canEdit && (
                <Link 
                    href={`/projects/${project.key}/settings`} 
                    className="absolute top-6 right-6 text-muted-foreground/40 hover:text-foreground hover:bg-zinc-50 p-1.5 rounded-md transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                    title="Project Settings"
                >
                    <span className="material-icons text-[18px]">settings</span>
                </Link>
            )}
            
            <Link href={`/projects/${project.key}/boards`} className="block group/title mb-8">
                <h2 className="text-xl font-bold text-foreground leading-tight tracking-tight group-hover/title:text-primary transition-colors">
                    {project.name}
                </h2>
            </Link>
            
            <div className="mt-auto pt-5 flex items-center justify-between text-[10px] text-muted-foreground/60 border-t border-border/50 font-bold uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                    <span className="material-icons text-[14px]">group</span>
                    {project.users_count} {project.users_count === 1 ? 'member' : 'members'}
                </div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-primary">
                    Enter <span className="material-icons text-[12px]">arrow_forward</span>
                </span>
            </div>
        </div>
    );
};
