import React, { useState, FormEvent, useEffect, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, DragEndEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, DragStartEvent, DragOverEvent, pointerWithin, rectIntersection, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Head, router, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import TaskModal from '@/Components/Task/TaskModal';
import { TaskListView } from '@/components/Task/TaskListView';
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
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

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
                      <p className="text-muted-foreground animate-pulse font-medium">Initializing Zen Workspace...</p>
                  </div>
              </div>
          </AppLayout>
      );
  }

  const [isConfigMode, setIsConfigMode] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

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
    <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
        <span className="material-icons text-[14px]">folder_open</span>
        <span className="text-zinc-900">{current_project?.name}</span>
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
    if (activeType === 'Task') setActiveTask(active.data.current?.task);
    else if (activeType === 'Column') setActiveColumn(active.data.current?.column);
    else if (activeType === 'Board') setActiveBoardTab(active.data.current?.board);
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
    if (overType === 'Task') overId = over.data.current?.task?.id;
    else if (overType === 'Column') overId = over.data.current?.column?.id;
    if (!overId || activeTaskId === overId) return;

    setBoardColumns((prevColumns) => {
        const sourceColIdx = prevColumns.findIndex(col => (col?.tasks || []).some(t => t?.id === activeTaskId));
        let targetColIdx = -1;
        if (overType === 'Task') targetColIdx = prevColumns.findIndex(col => (col?.tasks || []).some(t => t?.id === overId));
        else if (overType === 'Column') targetColIdx = prevColumns.findIndex(col => col?.id == overId);
        if (sourceColIdx === -1 || targetColIdx === -1 || sourceColIdx === targetColIdx) return prevColumns;
        const targetColObj = prevColumns[targetColIdx];
        if (targetColObj?.title?.toLowerCase().includes('done') && !user_permissions.can_move_to_done) return prevColumns;
        const newColumns = [...prevColumns];
        const sourceTasks = [...(newColumns[sourceColIdx]?.tasks || [])];
        const targetTasks = [...(newColumns[targetColIdx]?.tasks || [])];
        const activeIndex = sourceTasks.findIndex(t => t?.id === activeTaskId);
        let overIndex = overType === 'Task' ? targetTasks.findIndex(t => t?.id === overId) : targetTasks.length;
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
    setActiveTask(null); setActiveColumn(null); setActiveBoardTab(null);
    const { active, over } = event;
    if (!over) return;
    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === 'Column' && isStructureUnlocked) {
        const activeColId = active.data.current?.column?.id;
        const overColId = over.data.current?.column?.id;
        if (activeColId && overColId && activeColId != overColId) {
            const oldIndex = boardColumns.findIndex(col => col?.id == activeColId);
            const newIndex = boardColumns.findIndex(col => col?.id == overColId);
            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(boardColumns, oldIndex, newIndex);
                setBoardColumns(newOrder);
                router.patch(`/boards/${active_board?.id}/columns/reorder`, { column_ids: newOrder.map(col => parseInt(col?.id || '0')) }, { preserveScroll: true });
            }
        }
    } else if (activeType === 'Board' && isStructureUnlocked) {
        const activeBoardId = active.data.current?.board?.id;
        const overBoardId = over.data.current?.board?.id;
        if (activeBoardId && overBoardId && activeBoardId != overBoardId) {
            const oldIndex = projectBoards.findIndex(b => b?.id == activeBoardId);
            const newIndex = projectBoards.findIndex(b => b?.id == overBoardId);
            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(projectBoards, oldIndex, newIndex);
                setProjectBoards(newOrder);
                router.patch(`/projects/${current_project?.id}/boards/reorder`, { board_ids: newOrder.map(b => b?.id) }, { preserveScroll: true });
            }
        }
    } else if (activeType === 'Task' && canMoveTasks) {
        const task = active.data.current?.task as Task;
        if (!task?.id) return;
        let targetColumnId = overType === 'Column' ? over.id as string : boardColumns.find(col => (col?.tasks || []).some(t => t?.id === over.id))?.id || '';
        if (!targetColumnId) return;
        const targetColObj = boardColumns.find(c => c?.id == targetColumnId);
        const sourceCol = boardColumns.find(col => (col?.tasks || []).some(t => t?.id === task?.id));
        if (targetColObj?.title?.toLowerCase().includes('done') && !user_permissions.can_move_to_done && sourceCol?.id !== targetColumnId) {
            alert("Permission Denied: Only PM or QA can move tasks to Done."); return;
        }
        router.patch(`/boards/${active_board?.id}/tasks/reorder`, { column_id: parseInt(targetColumnId.replace('column-', '')), task_ids: boardColumns.find(c => c?.id == targetColumnId)?.tasks?.map(t => t?.id) || [] }, { preserveScroll: true });
    }
  };

  const handleCreateBoard = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && newBoardName.trim()) { router.post(`/projects/${current_project?.id}/boards`, { name: newBoardName }, { onSuccess: () => { setIsCreatingBoard(false); setNewBoardName(''); } }); } };
  const handleCreateColumn = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && newColumnTitle.trim()) { router.post(`/boards/${active_board?.id}/columns`, { title: newColumnTitle }, { onSuccess: () => { setIsCreatingColumn(false); setNewColumnTitle(''); } }); } };
  const handleRenameColumn = (id: number, title: string) => router.patch(`/columns/${id}`, { title }, { preserveScroll: true });
  const handleDeleteColumn = (id: number) => { if (confirm('Delete this column and move tasks to the first column?')) router.delete(`/columns/${id}`, { preserveScroll: true }); };
  const handleExport = (type: 'board' | 'project') => window.location.href = `/exports/tasks?type=${type}&id=${type === 'board' ? active_board?.id : current_project?.id}`;

  return (
    <AppLayout breadcrumbs={breadcrumbs} available_projects={available_projects}>
      <Head title={`${active_board?.name} | ${current_project?.key}`} />
      
      <header className="px-4 md:px-8 pt-6 pb-0 border-b border-zinc-200/50 flex-shrink-0 bg-white/80 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-6">
                 <div className="flex flex-col">
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{active_board?.name}</h1>
                    <p className="text-xs text-zinc-500 font-medium">Manage team workflow and task execution.</p>
                 </div>
                 {canCreateOrEdit && (
                     <button onClick={() => openCreateModal()} className="bg-primary hover:bg-primary/90 text-white text-[11px] px-5 py-2 rounded-md transition-all shadow-sm flex items-center gap-2 font-bold uppercase tracking-wider">
                        <span className="material-icons text-[16px]">add</span> Create Task
                     </button>
                 )}
              </div>
              
              <div className="flex items-center gap-3">
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <button className="bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 px-2.5 py-1.5 rounded-md transition-all flex items-center shadow-sm">
                              <span className="material-icons text-[20px]">more_horiz</span>
                          </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-white border border-zinc-200 shadow-lg rounded-lg">
                          <DropdownMenuItem onClick={() => setIsConfigMode(!isConfigMode)} className="text-xs cursor-pointer hover:bg-zinc-50 py-2.5">
                              <span className="material-icons text-[16px] mr-3 text-zinc-400">{isConfigMode ? 'settings_suggest' : 'settings_overscan'}</span>
                              {isConfigMode ? 'Disable Configuration' : 'Configure Board'}
                          </DropdownMenuItem>
                          <div className="h-px bg-zinc-100 my-1"></div>
                          <DropdownMenuItem onClick={() => handleExport('board')} className="text-xs cursor-pointer hover:bg-zinc-50 py-2.5">
                              <span className="material-icons text-[16px] mr-3 text-zinc-400">download</span> Export to Excel
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="hidden sm:flex bg-zinc-100/80 rounded-md p-1 gap-1 border border-zinc-200/50">
                      <button 
                        onClick={() => setViewMode('board')}
                        className={`px-4 py-1.5 text-xs font-bold transition-all rounded-[4px] border ${viewMode === 'board' ? 'bg-white text-zinc-900 shadow-sm border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-900 border-transparent'}`}
                      >
                        Board
                      </button>
                      <button 
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-1.5 text-xs font-bold transition-all rounded-[4px] border ${viewMode === 'list' ? 'bg-white text-zinc-900 shadow-sm border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-900 border-transparent'}`}
                      >
                        List
                      </button>
                      <div className="w-px bg-zinc-200 mx-1 my-1" />
                      <Link href={`/projects/${current_project?.key}/roadmap`} className="px-4 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Roadmap</Link>
                      <Link href={`/projects/${current_project?.key}/reports`} className="px-4 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Reports</Link>
                  </div>
              </div>
          </div>

          <div className="flex gap-8 items-center overflow-x-auto no-scrollbar">
              <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} sensors={sensors}>
                  <SortableContext items={(projectBoards || []).filter(b => b && b.id).map(b => `board-${b.id}`)} strategy={horizontalListSortingStrategy}>
                      {(projectBoards || []).map(b => b && (
                          <DraggableBoardTab key={b.id} board={b} isActive={b.id === active_board?.id} projectKey={current_project?.key || ''} canEdit={isStructureUnlocked} />
                      ))}
                  </SortableContext>
              </DndContext>
              {(project_role === 'Manager' || isAdmin) && (
                  <button onClick={() => setIsCreatingBoard(true)} className="pb-3 text-xs text-zinc-400 hover:text-zinc-900 flex items-center gap-1.5 font-bold uppercase tracking-widest transition-colors">
                      <span className="material-icons text-[14px]">add</span> New Board
                  </button>
              )}
          </div>

          <div className="flex flex-wrap items-center gap-6 py-4 border-t border-zinc-100 mt-1">
              <div className="relative group flex-1 min-w-[240px] max-w-md">
                  <span className="material-icons absolute left-3 top-2.5 text-[18px] text-zinc-300 group-focus-within:text-primary transition-colors">search</span>
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Filter tasks by ID or name..." className="w-full bg-zinc-50/50 border border-zinc-200/60 rounded-md pl-10 pr-3 py-2 text-xs text-zinc-900 focus:ring-2 focus:ring-primary/5 focus:border-primary/30 focus:bg-white transition-all outline-none" />
              </div>
              <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Assignee</span>
                  <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-[11px] text-zinc-700 font-medium focus:ring-2 focus:ring-primary/5 outline-none shadow-sm transition-all" >
                      <option value="all">Everyone</option>
                      {(project_members || []).map(m => m && <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
              </div>
              <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Priority</span>
                  <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="bg-white border border-zinc-200 rounded-md px-3 py-1.5 text-[11px] text-zinc-700 font-medium focus:ring-2 focus:ring-primary/5 outline-none shadow-sm transition-all" >
                      <option value="all">All Levels</option>
                      <option value="highest">Highest</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="lowest">Lowest</option>
                  </select>
              </div>
              {(searchQuery || filterAssignee !== 'all' || filterPriority !== 'all') && (
                  <button onClick={() => { setSearchQuery(''); setFilterAssignee('all'); setFilterPriority('all'); }} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter">Reset</button>
              )}
          </div>
      </header>
      
      {viewMode === 'board' ? (
        <div className="flex-1 flex gap-8 overflow-x-auto overflow-y-hidden px-8 py-8 items-start bg-background">
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
              <div className="min-w-[300px] pt-2">
                  {isCreatingColumn ? (
                      <div className="bg-white border border-primary/30 p-4 rounded-xl shadow-lg ring-4 ring-primary/5">
                          <input type="text" value={newColumnTitle} onChange={e => setNewColumnTitle(e.target.value)} onKeyDown={handleCreateColumn} autoFocus onBlur={() => setIsCreatingColumn(false)} placeholder="Column title... (Enter)" className="w-full bg-transparent text-sm focus:outline-none text-zinc-900 font-bold" />
                      </div>
                  ) : (
                      <button onClick={() => setIsCreatingColumn(true)} className="w-full flex items-center justify-center gap-3 p-5 border border-dashed border-zinc-200 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-white hover:border-zinc-300 transition-all group">
                          <span className="material-icons text-[20px]">add_circle_outline</span>
                          <span className="text-sm font-bold uppercase tracking-wider">Add Column</span>
                      </button>
                  )}
              </div>
          )}
        </div>
      ) : (
        <TaskListView 
            columns={filteredColumns}
            onTaskClick={openEditModal}
        />
      )}

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
    <div className="bg-white border border-zinc-200/60 shadow-[0_1px_2px_0_rgba(0,0,0,0.03)] hover:shadow-[0_8px_16px_-2px_rgba(0,0,0,0.05),0_4px_8px_-2px_rgba(0,0,0,0.03)] hover:-translate-y-[2px] transition-all duration-300 cursor-grab rounded-lg p-4 relative group flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <span className="font-mono text-[10px] text-zinc-400 font-bold tracking-tight uppercase">{task.formatted_id}</span>
        <div className="flex items-center gap-1.5">
            {task.is_ai_assigned && <span className="material-icons text-primary/40 text-[14px]" title="AI Agent Support">smart_toy</span>}
            {task.assignee ? (
                <div className="h-5 w-5 rounded-full bg-zinc-50 text-zinc-600 flex items-center justify-center text-[9px] font-bold border border-zinc-200 shadow-sm" title={task.assignee.name}>
                  {task.assignee.name.substring(0, 2).toUpperCase()}
                </div>
            ) : (
                <div className="h-5 w-5 rounded-full bg-zinc-50/50 flex items-center justify-center text-[10px] text-zinc-300 border border-dashed border-zinc-200" title="Unassigned">
                    <span className="material-icons text-[12px]">person_outline</span>
                </div>
            )}
        </div>
      </div>
      <h4 className="text-sm font-semibold text-zinc-900 leading-snug line-clamp-2 tracking-tight">{task.title}</h4>
      <div className="flex items-center justify-between mt-1 pt-2.5 border-t border-zinc-50">
         <div className="flex items-center gap-2">
             <span className={`material-icons text-[16px] ${priorityIcon.color}`} title={`Priority: ${task.priority}`}>{priorityIcon.icon}</span>
             {(task.story_points || 0) > 0 && <span className="bg-zinc-50 text-zinc-500 px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-bold">{task.story_points}</span>}
         </div>
         {task.labels && task.labels.length > 0 && (
             <div className="flex -space-x-1">
                 {task.labels.slice(0, 3).map((label, idx) => (
                     <div key={idx} className="h-2.5 w-2.5 rounded-full border-2 border-white bg-zinc-200 shadow-sm" title={label} />
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
    return <Link ref={setNodeRef} style={style} {...attributes} {...listeners} href={`/projects/${projectKey}/boards/${board.id}`} className={`pb-3 text-xs uppercase tracking-widest font-extrabold transition-all border-b-2 whitespace-nowrap cursor-grab ${isActive ? 'border-primary text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>{board?.name}</Link>;
};

const DraggableTask = ({ task, onClick, canDrag }: { task: Task; onClick: () => void; canDrag: boolean }) => {
    if (!task) return null;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `task-${task.id}`, data: { type: 'Task', task }, disabled: !canDrag });
    const style = { transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 50 : 1, opacity: isDragging ? 0.6 : 1 };
    return <div ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }} className="cursor-pointer" ><TaskCard task={task} /></div>;
};

const DroppableColumn = ({ column, user_permissions, canEdit, isConfigMode, onRename, onDelete, onCreateCard, children }: { column: ColumnProps; user_permissions: any; canEdit: boolean; isConfigMode: boolean; onRename: (id: number, title: string) => void; onDelete: (id: number) => void; onCreateCard: (columnId: number) => void; children: React.ReactNode }) => {
    if (!column) return null;
    const { isOver, setNodeRef: setDroppableRef } = useDroppable({ id: `column-${column.id}`, data: { type: 'Column', column } });
    const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({ id: `column-${column.id}`, data: { type: 'Column', column }, disabled: !canEdit });
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(column.title || '');
    useEffect(() => setEditTitle(column.title || ''), [column.title]);
    const handleRename = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && editTitle.trim()) { onRename(column.db_id, editTitle); setIsEditing(false); } else if (e.key === 'Escape') { setEditTitle(column.title); setIsEditing(false); } };
    const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

    return (
      <div ref={(node) => { setSortableRef(node); setDroppableRef(node); }} style={style} className={`flex-1 min-w-[300px] max-w-[340px] flex flex-col gap-5 p-2 transition-all duration-300 rounded-xl ${isOver ? 'bg-white shadow-inner ring-2 ring-primary/5' : 'bg-transparent'} ${isConfigMode ? 'border-2 border-dashed border-primary/20 bg-primary/[0.01]' : ''}`} >
        <div className="flex items-center justify-between px-2 group/header">
            <div className="flex items-center gap-3 flex-1">
                {canEdit && isConfigMode ? (<div {...listeners} {...attributes} className="cursor-grab text-zinc-300 hover:text-primary p-0.5"><span className="material-icons text-[18px]">drag_indicator</span></div>) : (!canEdit && <span className="material-icons text-[12px] text-zinc-300">lock</span>)}
                {isEditing ? (<input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} onKeyDown={handleRename} onBlur={() => setIsEditing(false)} autoFocus className="bg-transparent border-b border-primary text-xs font-bold uppercase tracking-widest text-zinc-900 focus:outline-none w-full" />) : (<h3 onDoubleClick={() => canEdit && isConfigMode && setIsEditing(true)} className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isConfigMode && canEdit ? 'text-primary cursor-text' : 'text-zinc-500'}`}>{column.title}</h3>)}
            </div>
            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{(column.tasks || []).length}</span>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto pb-4 scrollbar-hide min-h-[200px] px-1">
          {children}
          {canEdit && <button onClick={() => onCreateCard(column.db_id)} className="mt-2 flex items-center justify-center gap-2 text-zinc-400 hover:text-zinc-900 hover:bg-white hover:shadow-sm px-3 py-3 rounded-lg transition-all text-[10px] font-bold uppercase tracking-widest border border-dashed border-zinc-200 hover:border-zinc-300"><span className="material-icons text-[16px]">add</span>New Task</button>}
        </div>
      </div>
    );
};

export default KanbanBoard;
