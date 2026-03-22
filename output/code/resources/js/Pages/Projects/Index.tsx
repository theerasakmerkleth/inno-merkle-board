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
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background flex flex-col">
          <div className="flex justify-between items-center mb-8">
              <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">Projects</h1>
                  <p className="text-sm text-muted-foreground mt-1">Manage and access all your workspace initiatives.</p>
              </div>
              {canCreate && (
                  <button 
                      onClick={() => setIsCreating(true)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-sm text-sm transition-colors shadow-sm flex items-center gap-1.5"
                  >
                      <span className="material-icons text-[16px]">add</span>
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
            className="bg-card border border-border rounded-lg p-6 flex flex-col shadow-sm relative group cursor-default"
        >
            <div className="flex justify-between items-start mb-4 pr-6">
                <div className="flex items-center gap-2">
                    {canEdit && (
                        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 -ml-2">
                            <span className="material-icons text-[16px]">drag_indicator</span>
                        </div>
                    )}
                    <span className="font-mono text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-sm border border-primary/20">
                        {project.key}
                    </span>
                </div>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm border ${project.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                    {project.status}
                </span>
            </div>

            {canEdit && (
                <Link 
                    href={`/projects/${project.key}/settings`} 
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-full transition-colors flex items-center justify-center"
                    title="Project Settings"
                >
                    <span className="material-icons text-[16px]">settings</span>
                </Link>
            )}
            
            <Link href={`/projects/${project.key}/boards`} className="hover:text-primary transition-colors block">
                <h2 className="text-lg font-semibold text-foreground leading-tight mb-2">
                    {project.name}
                </h2>
            </Link>
            
            <div className="mt-auto pt-4 flex items-center gap-2 text-sm text-muted-foreground border-t border-border">
                <span className="material-icons text-[16px]">group</span>
                {project.users_count} {project.users_count === 1 ? 'member' : 'members'}
            </div>
        </div>
    );
};
