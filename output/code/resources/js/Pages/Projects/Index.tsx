import React, { useState, FormEvent, useEffect } from 'react';
import { usePage, Link, useForm, router, Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CreateProjectSheet from '@/components/CreateProjectSheet';

interface Project {
  id: number;
  key: string;
  name: string;
  status: string;
  users_count: number;
}

interface PageProps {
  projects: Project[];
  available_projects: Project[];
}

export default function ProjectsIndex({ projects, available_projects }: PageProps) {
  const { auth } = usePage<any>().props;
  const [isCreating, setIsCreating] = useState(false);
  const [projectList, setProjectList] = useState<Project[]>(projects);

  useEffect(() => {
    setProjectList(projects);
  }, [projects]);

  const canCreate = auth.user.role === 'Admin' || auth.user.role === 'Project Manager';

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
        router.patch('/projects/reorder', { project_ids: newList.map(p => p.id) }, { preserveScroll: true });
    }
  };

  const breadcrumbs = (
    <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
        <span className="material-icons text-[14px]">grid_view</span>
        <span className="text-zinc-900">Workspace Hub</span>
    </div>
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs} available_projects={available_projects}>
      <Head title="Workspace Hub | MerkleBoard" />
      
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
          
          {/* UNIFIED WORKSPACE HEADER (v57) */}
          <header className="px-4 md:px-8 pt-6 pb-6 border-b border-primary/5 flex-shrink-0 bg-background/80 backdrop-blur-xl sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                      <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Workspace Hub</h1>
                      <p className="text-xs text-zinc-500 font-medium">Your centralized project directory and management center.</p>
                  </div>
                  {canCreate && (
                      <button 
                          onClick={() => setIsCreating(true)}
                          className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-primary/10 flex items-center gap-1.5"
                      >
                          <span className="material-icons text-[18px]">add</span>
                          New Project
                      </button>
                  )}
              </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 bg-[#F9FAFB] animate-in fade-in duration-500">
              <div className="max-w-7xl mx-auto">
                  {projectList.length > 0 ? (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                          <SortableContext items={projectList.map(p => p.id.toString())} strategy={rectSortingStrategy}>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                      <div className="flex-1 flex flex-col items-center justify-center py-32 text-center opacity-40">
                          <div className="bg-zinc-100 w-24 h-24 rounded-full flex items-center justify-center mb-6 border border-zinc-200 shadow-inner">
                              <span className="material-icons text-5xl text-zinc-400">folder_open</span>
                          </div>
                          <h2 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">No projects active</h2>
                          <p className="text-sm text-zinc-500 max-w-sm mb-8 font-medium leading-relaxed">Organize your initiatives by creating your first project container.</p>
                          {canCreate && (
                              <button 
                                  onClick={() => setIsCreating(true)}
                                  className="bg-primary/10 text-primary px-8 py-3 rounded-md text-[10px] font-black uppercase tracking-widest transition-all border border-primary/20 hover:bg-primary/20"
                              >
                                  Get Started
                              </button>
                          )}
                      </div>
                  )}
              </div>
          </div>

          <CreateProjectSheet open={isCreating} onOpenChange={setIsCreating} />

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
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 999 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            className="bg-white border border-zinc-200/60 rounded-2xl p-8 flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_20px_-5px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300 relative group cursor-default overflow-hidden"
        >
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-3">
                    {canEdit && (
                        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-primary transition-colors">
                            <span className="material-icons text-[18px]">drag_indicator</span>
                        </div>
                    )}
                    <span className="font-mono text-[10px] font-black text-primary bg-primary/5 px-2.5 py-1 rounded-md border border-primary/10 tracking-widest uppercase">
                        {project.key}
                    </span>
                </div>
                <div className={`h-2.5 w-2.5 rounded-full border-2 border-white ring-1 ${project.status === 'active' ? 'bg-emerald-500 ring-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-zinc-300 ring-zinc-200'}`} title={project.status}></div>
            </div>

            {canEdit && (
                <Link 
                    href={`/projects/${project.key}/settings`} 
                    className="absolute top-8 right-8 text-zinc-300 hover:text-primary hover:bg-primary/5 p-2 rounded-xl transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                    title="Project Settings"
                >
                    <span className="material-icons text-[20px]">settings</span>
                </Link>
            )}
            
            <Link href={`/projects/${project.key}/boards`} className="block group/title mb-10 flex-1">
                <h2 className="text-xl font-bold text-zinc-900 leading-tight tracking-tight group-hover/title:text-primary transition-colors">
                    {project.name}
                </h2>
            </Link>
            
            <div className="mt-auto pt-6 flex items-center justify-between text-[10px] text-zinc-400 border-t border-zinc-50 font-black uppercase tracking-[0.15em]">
                <div className="flex items-center gap-2">
                    <span className="material-icons text-[16px] text-zinc-300">group</span>
                    {project.users_count} {project.users_count === 1 ? 'member' : 'members'}
                </div>
                <span className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 text-primary translate-x-2 group-hover:translate-x-0">
                    Access <span className="material-icons text-[12px]">arrow_forward</span>
                </span>
            </div>
        </div>
    );
};
