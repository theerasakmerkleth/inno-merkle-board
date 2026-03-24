import React, { useState, FormEvent, useEffect, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, DragEndEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, DragStartEvent, DragOverEvent, pointerWithin, rectIntersection, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Head, router, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import TaskModal from '@/Components/Task/TaskModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Task {
  id: number;
  db_id: number;
  project_task_number: number;
  formatted_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id: number | null;
  assignee: { name: string; avatar_url?: string } | null;
  project_id: number;
  board_id: number;
  board_column_id: number;
  story_points: number;
  checklists: any[];
  labels: string[];
  is_ai_assigned: boolean;
}

interface ColumnProps {
  id: string;
  db_id: number;
  title: string;
  tasks: Task[];
}

interface Board {
    id: number;
    name: string;
    is_default: boolean;
    order: number;
}

interface PageProps {
  current_project: { id: number; key: string; name: string; git_provider?: string; webhook_secret?: string };
  active_board: Board;
  project_boards: Board[];
  columns: ColumnProps[];
  project_members: { id: number; name: string }[];
  auth: any;
  project_role: string;
  user_permissions: {
    can_create_task: boolean;
    can_edit_task: boolean;
    can_delete_task: boolean;
    can_manage_boards: boolean;
    can_move_to_done: boolean;
  };
  available_projects: any[];
}

const KanbanBoard = ({ current_project, active_board, project_boards = [], columns = [], project_members = [], auth, project_role = 'Viewer', user_permissions = {} as any, available_projects = [] }: PageProps) => {
  const [boardColumns, setBoardColumns] = useState<ColumnProps[]>(columns || []);
  const [projectBoards, setProjectBoards] = useState<Board[]>(project_boards || []);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [initialColIdForCreate, setInitialColIdForCreate] = useState<number | null>(null);

  // Auto-open task modal from URL query param
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const taskId = params.get('taskId');
      if (taskId) {
          const task = boardColumns.flatMap(c => c.tasks).find(t => t.id === parseInt(taskId));
          if (task) {
              setEditingTask(task);
              setIsModalOpen(true);
              
              // Clean up URL without reload
              const newUrl = window.location.pathname;
              window.history.replaceState({}, '', newUrl);
          }
      }
  }, [boardColumns]);

  useEffect(() => {
    setBoardColumns(columns || []);
  }, [columns]);

  useEffect(() => {
      setProjectBoards(project_boards || []);
  }, [project_boards]);

  if (!current_project || !active_board) {
      return (
          <AppLayout breadcrumbs={<span>Loading...</span>} available_projects={available_projects}>
              <div className="flex-1 flex items-center justify-center bg-background">
                  <div className="text-center space-y-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground animate-pulse">Initializing Kanban Workspace...</p>
                  </div>
              </div>
          </AppLayout>
      );
  }

  // Local UI State
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<number | string>('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const isAdmin = auth?.user?.role === 'Admin' || auth?.user?.roles?.some((r: any) => r.name === 'Admin');
  const canCreateOrEdit = project_role === 'Manager' || project_role === 'Contributor' || isAdmin;
  const canDelete = project_role === 'Manager' || isAdmin;
  const canMoveTasks = canCreateOrEdit;
  const isStructureUnlocked = (project_role === 'Manager' || isAdmin) && isConfigMode;

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        },
    })
  );

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnProps | null>(null);
  const [activeBoardTab, setActiveBoardTab] = useState<Board | null>(null);

  // Derived filtered columns for display
  const filteredColumns = useMemo(() => {
    return (boardColumns || []).map(col => {
        if (!col) return null;
        return {
            ...col,
            tasks: (col.tasks || []).filter(task => {
                if (!task) return false;
                const matchesSearch = (task.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                                      (task.formatted_id || '').toLowerCase().includes(searchQuery.toLowerCase());
                const matchesAssignee = filterAssignee === 'all' || task.assignee_id === Number(filterAssignee);
                const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
                return matchesSearch && matchesAssignee && matchesPriority;
            })
        };
    }).filter(Boolean) as ColumnProps[];
  }, [boardColumns, searchQuery, filterAssignee, filterPriority]);

  const breadcrumbs = (
    <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="material-icons text-[14px]">folder</span>
        <span className="font-medium text-foreground">{current_project?.name}</span>
        <span className="material-icons text-[14px]">chevron_right</span>
        <span>Boards</span>
    </div>
  );

  const openCreateModal = (columnId: number | null = null) => {
    setEditingTask(null);
    setInitialColIdForCreate(columnId);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setInitialColIdForCreate(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeType = active.data.current?.type;

    if (activeType === 'Task') {
        setActiveTask(active.data.current?.task);
    } else if (activeType === 'Column') {
        setActiveColumn(active.data.current?.column);
    } else if (activeType === 'Board') {
        setActiveBoardTab(active.data.current?.board);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType !== 'Task') return;

    const activeTaskId = active.data.current?.task?.id;
    if (!activeTaskId) return;

    let overId = null;
    if (overType === 'Task') {
        overId = over.data.current?.task?.id;
    } else if (overType === 'Column') {
        overId = over.data.current?.column?.id;
    }

    if (!overId || activeTaskId === overId) return;

    setBoardColumns((prevColumns) => {
        const sourceColIdx = prevColumns.findIndex(col => (col?.tasks || []).some(t => t?.id === activeTaskId));
        let targetColIdx = -1;

        if (overType === 'Task') {
            targetColIdx = prevColumns.findIndex(col => (col?.tasks || []).some(t => t?.id === overId));
        } else if (overType === 'Column') {
            targetColIdx = prevColumns.findIndex(col => col?.id == overId);
        }

        if (sourceColIdx === -1 || targetColIdx === -1 || sourceColIdx === targetColIdx) {
            return prevColumns;
        }

        const newColumns = [...prevColumns];
        const sourceTasks = [...(newColumns[sourceColIdx]?.tasks || [])];
        const targetTasks = [...(newColumns[targetColIdx]?.tasks || [])];

        const activeIndex = sourceTasks.findIndex(t => t?.id === activeTaskId);
        let overIndex = -1;

        if (overType === 'Task') {
            overIndex = targetTasks.findIndex(t => t?.id === overId);
        } else {
            overIndex = targetTasks.length;
        }

        if (activeIndex === -1) return prevColumns;

        const taskToMove = sourceTasks[activeIndex];
        sourceTasks.splice(activeIndex, 1);
        targetTasks.splice(overIndex, 0, taskToMove);

        newColumns[sourceColIdx] = { ...newColumns[sourceColIdx], tasks: sourceTasks };
        newColumns[targetColIdx] = { ...newColumns[targetColIdx], tasks: targetTasks };

        return newColumns;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    setActiveColumn(null);
    setActiveBoardTab(null);

    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === 'Column') {
        if (!isStructureUnlocked) return;
        const activeColId = active.data.current?.column?.id;
        const overColId = over.data.current?.column?.id;
        if (activeColId && overColId && activeColId != overColId) {
            const oldIndex = boardColumns.findIndex(col => col?.id == activeColId);
            const newIndex = boardColumns.findIndex(col => col?.id == overColId);
            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(boardColumns, oldIndex, newIndex);
                setBoardColumns(newOrder);
                router.patch(`/boards/${active_board?.id}/columns/reorder`, {
                    column_ids: newOrder.map(col => parseInt(col?.id || '0'))
                }, { preserveScroll: true });
            }
        }
    } else if (activeType === 'Board') {
        if (!isStructureUnlocked) return;
        const activeBoardId = active.data.current?.board?.id;
        const overBoardId = over.data.current?.board?.id;
        if (activeBoardId && overBoardId && activeBoardId != overBoardId) {
            const oldIndex = projectBoards.findIndex(b => b?.id == activeBoardId);
            const newIndex = projectBoards.findIndex(b => b?.id == overBoardId);
            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(projectBoards, oldIndex, newIndex);
                setProjectBoards(newOrder);
                router.patch(`/projects/${current_project?.id}/boards/reorder`, {
                    board_ids: newOrder.map(b => b?.id)
                }, { preserveScroll: true });
            }
        }
    } else if (activeType === 'Task') {
        if (!canMoveTasks) return;
        const task = active.data.current?.task as Task;
        if (!task?.id) return;
        
        let targetColumnId = '';
        if (overType === 'Column') {
            targetColumnId = over.id as string;
        } else if (overType === 'Task') {
            targetColumnId = boardColumns.find(col => (col?.tasks || []).some(t => t?.id === over.id))?.id || '';
        }

        if (!targetColumnId) return;

        // Permission check for Done
        const targetColObj = boardColumns.find(c => c?.id == targetColumnId);
        const sourceCol = boardColumns.find(col => (col?.tasks || []).some(t => t?.id === task?.id));
        
        if (targetColObj?.title?.toLowerCase().includes('done') && !user_permissions.can_move_to_done && sourceCol?.id !== targetColumnId) {
            alert("Permission Denied: Only PM or QA can move tasks to Done.");
            return;
        }
        
        router.patch(`/boards/${active_board?.id}/tasks/reorder`, {
            column_id: parseInt(targetColumnId.replace('column-', '')),
            task_ids: boardColumns.find(c => c?.id == targetColumnId)?.tasks?.map(t => t?.id) || []
        }, { preserveScroll: true });
    }
  };

  const handleCreateBoard = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newBoardName.trim()) {
        router.post(`/projects/${current_project?.id}/boards`, { name: newBoardName }, {
            onSuccess: () => {
                setIsCreatingBoard(false);
                setNewBoardName('');
            }
        });
    }
  };

  const handleCreateColumn = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newColumnTitle.trim()) {
        router.post(`/boards/${active_board?.id}/columns`, { title: newColumnTitle }, {
            onSuccess: () => {
                setIsCreatingColumn(false);
                setNewColumnTitle('');
            }
        });
    }
  };

  const handleRenameColumn = (id: number, title: string) => {
      router.patch(`/columns/${id}`, { title }, { preserveScroll: true });
  };

  const handleDeleteColumn = (id: number) => {
      if (confirm('Delete this column and move tasks to the first column?')) {
          router.delete(`/columns/${id}`, { preserveScroll: true });
      }
  };

  const handleDeleteBoard = () => {
      if (confirm(`Are you sure you want to delete board "${active_board?.name}"?`)) {
          router.delete(`/boards/${active_board?.id}`);
      }
  };

  const handleExport = (type: 'board' | 'project') => {
      window.location.href = `/exports/tasks?type=${type}&id=${type === 'board' ? active_board?.id : current_project?.id}`;
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs} available_projects={available_projects}>
      <Head title={`${active_board?.name} | ${current_project?.key}`} />
      
      <header className="px-4 md:px-8 pt-4 md:pt-6 pb-0 border-b border-zinc-100 flex-shrink-0 bg-white/95 backdrop-blur z-10">
          <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                 <div className="flex flex-col">
                    <h1 className="text-xl font-bold text-foreground tracking-tight truncate max-w-[200px]" title={active_board?.name}>
                        {active_board?.name}
                    </h1>
                    <p className="text-[11px] text-muted-foreground hidden sm:block">Manage tasks and team workflow.</p>
                 </div>
                 {canCreateOrEdit && (
                     <button 
                        onClick={() => openCreateModal()}
                        className="bg-zinc-100 hover:bg-zinc-200 text-foreground text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 font-semibold border border-zinc-200/50">
                        <span className="material-icons text-[16px]">add</span>
                        Create Task
                     </button>
                 )}
              </div>
              
              <div className="flex items-center gap-4">
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <button className="bg-transparent border border-zinc-200/50 text-muted-foreground hover:text-foreground hover:bg-zinc-50 text-xs px-2 py-1.5 rounded-lg transition-colors flex items-center">
                              <span className="material-icons text-[18px]">more_horiz</span>
                          </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-white border border-zinc-200 shadow-lg rounded-xl">
                          <DropdownMenuItem onClick={() => setIsConfigMode(!isConfigMode)} className="text-xs cursor-pointer hover:bg-zinc-50 rounded-lg">
                              <span className="material-icons text-[14px] mr-2 text-muted-foreground">{isConfigMode ? 'settings_suggest' : 'settings_overscan'}</span>
                              {isConfigMode ? 'Disable Configuration' : 'Configure Board'}
                          </DropdownMenuItem>
                          <div className="h-[1px] bg-zinc-100 my-1"></div>
                          <DropdownMenuItem onClick={() => handleExport('board')} className="text-xs cursor-pointer hover:bg-zinc-50 rounded-lg">
                              <span className="material-icons text-[14px] mr-2 text-muted-foreground">download</span>
                              Export to Excel
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="hidden sm:flex bg-zinc-50 rounded-lg p-0.5 border border-zinc-200/50">
                      <div className="px-4 py-1.5 text-xs font-medium bg-white text-foreground shadow-sm rounded-md border border-zinc-100">Board</div>
                      <Link href={`/projects/${current_project?.key}/roadmap`} className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Roadmap</Link>
                      <Link href={`/projects/${current_project?.key}/reports`} className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Reports</Link>
                  </div>
              </div>
          </div>

          <div className="flex gap-6 mt-4 items-center overflow-x-auto no-scrollbar">
              <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} sensors={sensors}>
                  <SortableContext items={(projectBoards || []).filter(b => b && b.id).map(b => `board-${b.id}`)} strategy={horizontalListSortingStrategy}>
                      {(projectBoards || []).map(b => b && (
                          <DraggableBoardTab key={b.id} board={b} isActive={b.id === active_board?.id} projectKey={current_project?.key || ''} canEdit={isStructureUnlocked} />
                      ))}
                  </SortableContext>
              </DndContext>
              {(project_role === 'Manager' || isAdmin) && (
                  <button onClick={() => setIsCreatingBoard(true)} className="pb-3 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium border-b-2 border-transparent">
                      <span className="material-icons text-[14px]">add</span> New Board
                  </button>
              )}
          </div>

          {/* Quick Filter Bar (FR4) */}
          <div className="flex flex-wrap items-center gap-4 py-3 border-t border-zinc-100 mt-1">
              <div className="relative group flex-1 min-w-[200px] max-w-sm">
                  <span className="material-icons absolute left-2.5 top-1.5 text-[16px] text-muted-foreground/50 group-focus-within:text-primary transition-colors">search</span>
                  <input 
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search tasks..."
                      className="w-full bg-zinc-50/50 border border-zinc-200/50 rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
                  />
              </div>

              <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest">Assignee:</span>
                  <select 
                      value={filterAssignee}
                      onChange={e => setFilterAssignee(e.target.value)}
                      className="bg-zinc-50/50 border border-zinc-200/50 rounded-lg px-2 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                      <option value="all">All Members</option>
                      {(project_members || []).map(m => m && (
                          <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                  </select>
              </div>

              <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest">Priority:</span>
                  <select 
                      value={filterPriority}
                      onChange={e => setFilterPriority(e.target.value)}
                      className="bg-zinc-50/50 border border-zinc-200/50 rounded-lg px-2 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  >
                      <option value="all">All Priorities</option>
                      <option value="highest">Highest</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                      <option value="lowest">Lowest</option>
                  </select>
              </div>

              {(searchQuery || filterAssignee !== 'all' || filterPriority !== 'all') && (
                  <button onClick={() => { setSearchQuery(''); setFilterAssignee('all'); setFilterPriority('all'); }} className="text-[10px] font-semibold text-primary hover:underline">Clear Filters</button>
              )}
          </div>
      </header>
      
      <div className="flex-1 flex gap-6 overflow-x-auto overflow-y-hidden px-8 py-6 items-start">
        <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} sensors={sensors}>
          <SortableContext items={(filteredColumns || []).filter(col => col && col.id).map(col => `column-${col.id}`)} strategy={horizontalListSortingStrategy}>
            {(filteredColumns || []).map((column) => column && (
                <DroppableColumn key={column.id} column={column} user_permissions={user_permissions} canEdit={isStructureUnlocked} isConfigMode={isConfigMode} onRename={handleRenameColumn} onDelete={handleDeleteColumn} onCreateCard={openCreateModal}>
                    <SortableContext items={(column.tasks || []).filter(t => t && t.id).map(t => `task-${t.id}`)} strategy={verticalListSortingStrategy}>
                        {(column.tasks || []).map((task) => task && (
                            <DraggableTask key={task.id} task={task} onClick={() => openEditModal(task)} canDrag={canMoveTasks} />
                        ))}
                    </SortableContext>
                </DroppableColumn>
            ))}
          </SortableContext>
        </DndContext>
        {isStructureUnlocked && (
            <div className="min-w-[280px] max-w-[320px] pt-2">
                {isCreatingColumn ? (
                    <div className="bg-white border-2 border-primary/20 p-3 rounded-2xl shadow-sm ring-4 ring-primary/5">
                        <input type="text" value={newColumnTitle} onChange={e => setNewColumnTitle(e.target.value)} onKeyDown={handleCreateColumn} autoFocus onBlur={() => setIsCreatingColumn(false)} placeholder="Column title... (Enter)" className="w-full bg-transparent text-sm focus:outline-none focus:ring-0 text-foreground font-bold" />
                    </div>
                ) : (
                    <button onClick={() => setIsCreatingColumn(true)} className="w-full flex items-center justify-center gap-2 p-4 border border-dashed border-zinc-200 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-zinc-50/50 hover:border-zinc-300 transition-all group">
                        <span className="material-icons text-[20px] group-hover:scale-110 transition-transform">add</span>
                        <span className="text-sm font-semibold">Add Column</span>
                    </button>
                )}
            </div>
        )}
      </div>

      {isModalOpen && (
          <TaskModal 
              isOpen={isModalOpen} onClose={closeModal} task={editingTask} initialColumnIdForCreate={initialColIdForCreate}
              current_project={current_project} active_board={active_board} columns={boardColumns || []} project_members={project_members || []}
              canEdit={canCreateOrEdit} canDelete={canDelete}
          />
      )}
    </AppLayout>
  );
}

const TaskCard = React.memo(({ task }: { task: Task }) => {
  if (!task) return null;
  const priorityIcon = task.priority === 'highest' ? { icon: 'keyboard_double_arrow_up', color: 'text-zinc-600' } :
                       task.priority === 'high' ? { icon: 'keyboard_arrow_up', color: 'text-zinc-500' } : 
                       task.priority === 'low' ? { icon: 'keyboard_arrow_down', color: 'text-zinc-400' } : 
                       task.priority === 'lowest' ? { icon: 'keyboard_double_arrow_down', color: 'text-zinc-400' } : 
                       { icon: 'drag_handle', color: 'text-zinc-300' };

  return (
    <div className="bg-white border border-zinc-200/60 rounded-xl p-4 relative group flex flex-col gap-3 transition-all duration-200 hover:shadow-sm hover:border-zinc-300 hover:-translate-y-[1px]">
      <div className="flex justify-between items-start">
        <span className="font-mono text-[10px] text-muted-foreground/70 tracking-tight uppercase">{task.formatted_id}</span>
        <div className="flex items-center gap-1">
            {task.is_ai_assigned && <span className="material-icons text-primary/60 text-[12px]" title="Assigned to AI Agent">smart_toy</span>}
            {task.assignee ? (
                <div className="h-5 w-5 rounded-full bg-zinc-100 text-foreground flex items-center justify-center text-[9px] font-bold border border-zinc-200" title={task.assignee.name}>
                  {task.assignee.name.substring(0, 2).toUpperCase()}
                </div>
            ) : (
                <div className="h-5 w-5 rounded-full bg-zinc-50 flex items-center justify-center text-[10px] text-muted-foreground/30 border border-dashed border-zinc-200" title="Unassigned">
                    <span className="material-icons text-[10px]">person_outline</span>
                </div>
            )}
        </div>
      </div>
      <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{task.title}</h4>
      <div className="flex items-center justify-between mt-1">
         <div className="flex items-center gap-2">
             <span className={`material-icons text-[16px] ${priorityIcon.color}`} title={`Priority: ${task.priority}`}>{priorityIcon.icon}</span>
             {(task.story_points || 0) > 0 && <span className="text-muted-foreground/70 text-[11px] font-mono font-medium">{task.story_points} pts</span>}
         </div>
         {task.labels && task.labels.length > 0 && (
             <div className="flex -space-x-1 overflow-hidden">
                 {task.labels.slice(0, 3).map((label, idx) => (
                     <div 
                        key={idx} 
                        className="h-2 w-2 rounded-full border border-background bg-primary/20" 
                        title={label}
                     />
                 ))}
             </div>
         )}
      </div>
    </div>
  );
});

const DraggableBoardTab = ({ board, isActive, projectKey, canEdit }: { board: Board; isActive: boolean; projectKey: string; canEdit: boolean }) => {
    if (!board) return null;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `board-${board.id}`, data: { type: 'Board', board }, disabled: !canEdit });
    const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
    return <Link ref={setNodeRef} style={style} {...attributes} {...listeners} href={`/projects/${projectKey}/boards/${board.id}`} className={`pb-3 text-sm transition-colors border-b-2 whitespace-nowrap cursor-grab ${isActive ? 'border-primary text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{board?.name}</Link>;
};

const DraggableTask = ({ task, onClick, canDrag }: { task: Task; onClick: () => void; canDrag: boolean }) => {
    if (!task) return null;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `task-${task.id}`, data: { type: 'Task', task }, disabled: !canDrag });
    const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
    
    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...listeners} 
            {...attributes} 
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className="cursor-pointer"
        >
            <TaskCard task={task} />
        </div>
    );
};

const DroppableColumn = ({ column, user_permissions, canEdit, isConfigMode, onRename, onDelete, onCreateCard, children }: { column: ColumnProps; user_permissions: any; canEdit: boolean; isConfigMode: boolean; onRename: (id: number, title: string) => void; onDelete: (id: number) => void; onCreateCard: (columnId: number) => void; children: React.ReactNode }) => {
    if (!column) return null;
    const { isOver, setNodeRef: setDroppableRef } = useDroppable({ id: `column-${column.id}`, data: { type: 'Column', column } });
    const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({ id: `column-${column.id}`, data: { type: 'Column', column }, disabled: !canEdit });
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(column.title || '');
    
    useEffect(() => {
        setEditTitle(column.title || '');
    }, [column.title]);

    const handleRename = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && editTitle.trim()) { onRename(column.db_id, editTitle); setIsEditing(false); } else if (e.key === 'Escape') { setEditTitle(column.title); setIsEditing(false); } };
    const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

    return (
      <div 
        ref={(node) => { setSortableRef(node); setDroppableRef(node); }} 
        style={style} 
        className={`flex-1 min-w-[280px] max-w-[320px] flex flex-col gap-4 p-2 transition-all duration-200 border-r border-dashed border-zinc-200/80 last:border-r-0 ${isOver ? 'bg-zinc-50/50' : 'bg-transparent'} ${isConfigMode ? 'border-2 border-dashed border-primary/20 bg-primary/[0.01]' : ''}`}
      >
        <div className="flex items-center justify-between px-2 mb-2 group/header">
            <div className="flex items-center gap-2 flex-1">
                {canEdit && isConfigMode ? (<div {...listeners} {...attributes} className="cursor-grab text-muted-foreground/30 hover:text-primary p-0.5"><span className="material-icons text-[16px]">drag_indicator</span></div>) : (!canEdit && <span className="material-icons text-[12px] text-muted-foreground/20">lock</span>)}
                {isEditing ? (<input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} onKeyDown={handleRename} onBlur={() => setIsEditing(false)} autoFocus className="bg-transparent border-b border-primary text-[12px] font-bold text-foreground focus:outline-none w-full" />) : (<h3 onDoubleClick={() => canEdit && isConfigMode && setIsEditing(true)} className={`text-[12px] font-bold text-foreground flex items-center gap-2 ${isConfigMode && canEdit ? 'cursor-text' : ''}`}>{column.title}</h3>)}
            </div>
            <span className="text-[10px] text-muted-foreground/50 font-mono font-bold bg-zinc-100 px-2 py-0.5 rounded-full">{(column.tasks || []).length}</span>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto pb-2 scrollbar-hide min-h-[150px] px-1">
          {children}
          {canEdit && <button onClick={() => onCreateCard(column.db_id)} className="mt-2 flex items-center gap-2 text-muted-foreground/60 hover:text-foreground hover:bg-zinc-50 px-3 py-2.5 rounded-lg transition-colors text-xs font-semibold w-full border border-dashed border-transparent hover:border-zinc-200"><span className="material-icons text-[16px]">add</span>New Task</button>}
        </div>
      </div>
    );
};

export default KanbanBoard;
