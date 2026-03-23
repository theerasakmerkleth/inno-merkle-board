import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, DragEndEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, DragStartEvent, DragOverEvent, pointerWithin, rectIntersection, DragOverlay } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { router, usePage, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import TaskModal from '@/components/Task/TaskModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface User {
  id: number;
  name: string;
  email: string;
}

interface ChecklistItem {
    id: number;
    content: string;
    is_completed: boolean;
    position: number;
}

interface Checklist {
    id: number;
    title: string;
    items: ChecklistItem[];
}

interface Task {
  id: number;
  formatted_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'awaiting_review' | 'qa_ready' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee_id: number | null;
  assignee: User | null;
  is_ai_assigned: boolean;
  requires_human_review: boolean;
  start_date?: string;
  due_date?: string;
  checklists: Checklist[];
}

interface ColumnProps {
  id: string;
  db_id: number;
  title: string;
  tasks: Task[];
}

interface Project {
  id: number;
  key: string;
  name: string;
}

interface Board {
  id: number;
  name: string;
}

interface PageProps {
  current_project: Project;
  available_projects: Project[];
  boards: Board[];
  active_board: Board;
  columns: ColumnProps[];
  project_members: User[];
  project_role: string;
}

const KanbanBoard = ({ current_project, available_projects, boards, active_board, columns, project_members, project_role }: PageProps) => {
  const { auth } = usePage<{ auth: { user: { name: string, can_move_to_done: boolean } } }>().props;
  const user_permissions = { can_move_to_done: auth.user.can_move_to_done };
  
  const [boardColumns, setBoardColumns] = useState<ColumnProps[]>(columns);
  const [projectBoards, setProjectBoards] = useState<Board[]>(boards);

  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [initialColIdForCreate, setInitialColIdForCreate] = useState<number | null>(null);

  // Sync columns when props change
  useEffect(() => {
    setBoardColumns(columns);
    setProjectBoards(boards);
    
    if (editingTask && isModalOpen) {
       for (const col of columns) {
           const updatedTask = col.tasks.find(t => t.id === editingTask.id);
           if (updatedTask && JSON.stringify(updatedTask) !== JSON.stringify(editingTask)) {
               setEditingTask(updatedTask);
               break;
           }
       }
    }
  }, [columns, boards, isModalOpen, editingTask]);

  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const [isConfigMode, setIsConfigMode] = useState(false);

  const canCreateOrEdit = project_role === 'Manager' || project_role === 'Contributor';
  const canDelete = project_role === 'Manager';

  // Structure Lock: Only allow reordering lanes and tabs when in Config Mode.
  const isStructureUnlocked = canCreateOrEdit && isConfigMode;
  // Work Permission: Allow moving task cards anytime if the user has edit rights.
  const canMoveTasks = canCreateOrEdit;

  const handleCreateBoard = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && newBoardName.trim()) {
          router.post(`/projects/${current_project.id}/boards`, { name: newBoardName }, {
              preserveScroll: true,
              onSuccess: () => {
                  setIsCreatingBoard(false);
                  setNewBoardName('');
              }
          });
      } else if (e.key === 'Escape') {
          setIsCreatingBoard(false);
          setNewBoardName('');
      }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnProps | null>(null);
  const [activeBoardTab, setActiveBoardTab] = useState<Board | null>(null);

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
    let overId = null;
    
    if (overType === 'Task') {
        overId = over.data.current?.task?.id;
    } else if (overType === 'Column') {
        overId = over.data.current?.column?.id;
    }

    if (!activeTaskId || !overId || activeTaskId === overId) return;

    setBoardColumns((prevColumns) => {
        const sourceColIdx = prevColumns.findIndex(col => col.tasks.some(t => t.id === activeTaskId));
        let targetColIdx = -1;

        if (overType === 'Task') {
            targetColIdx = prevColumns.findIndex(col => col.tasks.some(t => t.id === overId));
        } else if (overType === 'Column') {
            targetColIdx = prevColumns.findIndex(col => col.id == overId);
        }

        if (sourceColIdx === -1 || targetColIdx === -1 || sourceColIdx === targetColIdx) {
            return prevColumns;
        }

        // Permission check for Done during drag
        const targetColObj = prevColumns[targetColIdx];
        if (targetColObj.title.toLowerCase().includes('done') && !user_permissions.can_move_to_done) {
            return prevColumns;
        }

        const newColumns = [...prevColumns];
        const sourceTasks = [...newColumns[sourceColIdx].tasks];
        const targetTasks = [...newColumns[targetColIdx].tasks];

        const activeIndex = sourceTasks.findIndex(t => t.id === activeTaskId);
        let overIndex = -1;

        if (overType === 'Task') {
            overIndex = targetTasks.findIndex(t => t.id === overId);
            
            // Adjust position based on whether we are hovering over the top or bottom half
            if (active.rect.current.translated && over.rect) {
                const isBelowOverItem = active.rect.current.translated.top > over.rect.top + over.rect.height / 2;
                const modifier = isBelowOverItem ? 1 : 0;
                overIndex = overIndex >= 0 ? overIndex + modifier : targetTasks.length + 1;
            } else {
                overIndex = targetTasks.length + 1;
            }
        } else {
            overIndex = targetTasks.length + 1;
        }

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

    // 1. Handle Column Reordering
    if (activeType === 'Column') {
        if (!isStructureUnlocked) return;
        const activeColId = active.data.current?.column?.id;
        const overColId = over.data.current?.column?.id;
        if (activeColId != overColId) {
            const oldIndex = boardColumns.findIndex(col => col.id == activeColId);
            const newIndex = boardColumns.findIndex(col => col.id == overColId);
            
            const newOrder = arrayMove(boardColumns, oldIndex, newIndex);
            setBoardColumns(newOrder);

            router.patch(`/boards/${active_board.id}/columns/reorder`, {
                column_ids: newOrder.map(col => parseInt(col.id))
            }, {
                preserveScroll: true,
            });
        }
        return;
    }

    // 2. Handle Board Reordering
    if (activeType === 'Board') {
        if (!isStructureUnlocked) return;
        const activeBoardId = active.data.current?.board?.id;
        const overBoardId = over.data.current?.board?.id;
        if (activeBoardId != overBoardId) {
            const oldIndex = projectBoards.findIndex(b => b.id == activeBoardId);
            const newIndex = projectBoards.findIndex(b => b.id == overBoardId);

            const newOrder = arrayMove(projectBoards, oldIndex, newIndex);
            setProjectBoards(newOrder);

            router.patch(`/projects/${current_project.id}/boards/reorder`, {
                board_ids: newOrder.map(b => b.id)
            }, {
                preserveScroll: true,
            });
        }
        return;
    }

    // 3. Handle Task Reordering
    if (activeType === 'Task') {
        if (!canMoveTasks) return;
        const activeTaskId = active.data.current?.task?.id;
        let overId = null;
        
        if (overType === 'Task') {
            overId = over.data.current?.task?.id;
        } else if (overType === 'Column') {
            overId = over.data.current?.column?.id;
        }

        if (activeTaskId === overId) return;

        const task = active.data.current?.task as Task;
        
        // Find Source Column
        const sourceColumn = boardColumns.find(col => col.tasks.some(t => t.id === task.id));
        if (!sourceColumn) return;

        // Determine Target Column
        let targetColumnId = '';
        if (overType === 'Column') {
            targetColumnId = overId;
        } else if (overType === 'Task') {
            targetColumnId = boardColumns.find(col => col.tasks.some(t => t.id === overId))?.id || '';
        }

        if (!targetColumnId) return;

        const newBoardColumns = [...boardColumns];
        const sourceColIdx = newBoardColumns.findIndex(c => c.id == sourceColumn.id);
        const targetColIdx = newBoardColumns.findIndex(c => c.id == targetColumnId);
        
        // Permission check for Done
        const targetColObj = newBoardColumns[targetColIdx];
        if (targetColObj.title.toLowerCase().includes('done') && !user_permissions.can_move_to_done && sourceColumn.id !== targetColumnId) {
            alert("Permission Denied: Only PM or QA can move tasks to Done.");
            return;
        }

        if (sourceColumn.id === targetColumnId) {
            // Internal Reorder
            const sourceTasks = [...newBoardColumns[sourceColIdx].tasks];
            const oldIdx = sourceTasks.findIndex(t => t.id === activeTaskId);
            const newIdx = sourceTasks.findIndex(t => t.id === overId);

            let finalIdx = newIdx;
            if (newIdx === -1) {
                finalIdx = sourceTasks.length; 
            }

            const reorderedTasks = arrayMove(sourceTasks, oldIdx, finalIdx);
            
            // Proper object cloning for React state
            newBoardColumns[sourceColIdx] = {
                ...newBoardColumns[sourceColIdx],
                tasks: reorderedTasks
            };
            
            setBoardColumns(newBoardColumns);

            router.patch(`/boards/${active_board.id}/tasks/reorder`, {
                column_id: parseInt(targetColumnId),
                task_ids: reorderedTasks.map(t => t.id)
            }, { preserveScroll: true, preserveState: true });
        } else {
            // Cross Column Move
            const sourceTasks = [...newBoardColumns[sourceColIdx].tasks].filter(t => t.id !== activeTaskId);
            const targetTasks = [...newBoardColumns[targetColIdx].tasks];
            const dropIdx = targetTasks.findIndex(t => t.id === overId);
            
            if (dropIdx !== -1) {
                targetTasks.splice(dropIdx, 0, task);
            } else {
                targetTasks.push(task);
            }
            
            // Proper object cloning for React state
            newBoardColumns[sourceColIdx] = {
                ...newBoardColumns[sourceColIdx],
                tasks: sourceTasks
            };
            newBoardColumns[targetColIdx] = {
                ...newBoardColumns[targetColIdx],
                tasks: targetTasks
            };
            
            setBoardColumns(newBoardColumns);

            router.patch(`/boards/${active_board.id}/tasks/reorder`, {
                column_id: parseInt(targetColumnId),
                task_ids: targetTasks.map(t => t.id)
            }, { preserveScroll: true, preserveState: true });
        }
    }
  };

  // Helper for done check
  function str_contains(haystack: string, needle: string) {
      return haystack.indexOf(needle) !== -1;
  }

  const handleCreateColumn = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newColumnTitle.trim()) {
        router.post(`/boards/${active_board.id}/columns`, { title: newColumnTitle }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsCreatingColumn(false);
                setNewColumnTitle('');
            }
        });
    } else if (e.key === 'Escape') {
        setIsCreatingColumn(false);
        setNewColumnTitle('');
    }
  };

  const handleRenameColumn = (columnId: number, newTitle: string) => {
      router.patch(`/columns/${columnId}`, { title: newTitle }, { preserveScroll: true });
  };

  const handleDeleteColumn = (columnId: number) => {
      if (confirm("Are you sure? All tasks in this column will be moved to another column.")) {
          router.delete(`/columns/${columnId}`, { preserveScroll: true });
      }
  };

  const handleDeleteBoard = () => {
    if (confirm(`Are you sure you want to delete the board "${active_board.name}"? All tasks inside will be lost forever.`)) {
        router.delete(`/projects/${current_project.id}/boards/${active_board.id}`, {
            preserveScroll: true,
        });
    }
  };

  const handleLogout = () => {
    router.post('/logout');
  };

  const switchProject = (key: string) => {
      setProjectMenuOpen(false);
      router.get(`/projects/${key}/boards`);
  };

  const handleExport = async (scope: 'board' | 'project') => {
      const toastId = toast.loading('Generating Excel report...');
      try {
          const url = scope === 'board' 
              ? `/projects/${current_project.id}/export?board_id=${active_board.id}`
              : `/projects/${current_project.id}/export`;
              
          const response = await fetch(url, {
              method: 'GET',
              headers: {
                  'X-Requested-With': 'XMLHttpRequest',
              }
          });

          if (!response.ok) throw new Error('Failed to generate report');

          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          
          // Get filename from Content-Disposition if possible, otherwise generate one
          const contentDisposition = response.headers.get('Content-Disposition');
          let filename = `${current_project.key}_Tasks.xlsx`;
          if (contentDisposition && contentDisposition.includes('filename=')) {
              filename = contentDisposition.split('filename=')[1].replace(/["']/g, '');
          }
          
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(downloadUrl);

          toast.success('Report downloaded successfully!', { id: toastId });
      } catch (error) {
          toast.error('Failed to generate report. Please try again.', { id: toastId });
      }
  };

  const openCreateModal = (columnId?: number) => {
      setEditingTask(null);
      setInitialColIdForCreate(columnId || null);
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

  const breadcrumbs = (
      <div className="flex items-center gap-2">
        {!canCreateOrEdit && <span className="material-icons text-[14px] text-muted-foreground/60" title="View Only Mode">lock</span>}
        <span className="text-muted-foreground font-mono text-sm mr-2 md:mr-3 font-normal">[{current_project.key}]</span>
        {current_project.name}
      </div>
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs} available_projects={available_projects}>
      
      {/* Top Header: Board Context & Tabs */}
      <header className="px-4 md:px-8 pt-4 md:pt-6 pb-0 border-b border-border flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
          <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                 <div className="flex flex-col">
                    <h1 className="text-lg font-semibold text-foreground truncate max-w-[200px]" title={active_board.name}>
                        {active_board.name}
                    </h1>
                    <p className="text-[11px] text-muted-foreground hidden sm:block">Manage tasks and team workflow.</p>
                 </div>
                 {canCreateOrEdit && (
                     <button 
                        onClick={() => openCreateModal()}
                        className="bg-primary hover:bg-primary/90 text-white text-xs px-4 py-2 rounded-sm transition-colors shadow-sm flex items-center gap-1.5 font-semibold">
                        <span className="material-icons text-[16px]">add</span>
                        Create Task
                     </button>
                 )}
              </div>
              
              <div className="flex items-center gap-2 md:gap-4">
                  {/* Unified Actions Menu */}
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <button className="bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs px-2 py-1.5 rounded-sm transition-colors flex items-center">
                              <span className="material-icons text-[18px]">more_horiz</span>
                          </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-background border border-border shadow-md">
                          <DropdownMenuItem onClick={() => setIsConfigMode(!isConfigMode)} className="text-xs cursor-pointer hover:bg-accent text-foreground focus:text-foreground">
                              <span className="material-icons text-[14px] mr-2 text-muted-foreground">{isConfigMode ? 'settings_suggest' : 'settings_overscan'}</span>
                              {isConfigMode ? 'Disable Configuration' : 'Configure Board'}
                          </DropdownMenuItem>
                          
                          <div className="h-[1px] bg-border my-1"></div>
                          
                          <DropdownMenuItem onClick={() => handleExport('board')} className="text-xs cursor-pointer hover:bg-accent text-foreground focus:text-foreground">
                              <span className="material-icons text-[14px] mr-2 text-muted-foreground">download</span>
                              Export to Excel (Current Board)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport('project')} className="text-xs cursor-pointer hover:bg-accent text-foreground focus:text-foreground">
                              <span className="material-icons text-[14px] mr-2 text-muted-foreground">folder_open</span>
                              Export All Tasks (Project)
                          </DropdownMenuItem>

                          {((canDelete && isConfigMode && active_board.name !== 'Backlog') || (project_role === 'Manager' || (auth?.user as any)?.role === 'Admin')) && (
                              <>
                                  <div className="h-[1px] bg-border my-1"></div>
                                  {(project_role === 'Manager' || (auth?.user as any)?.role === 'Admin') && (
                                      <DropdownMenuItem asChild className="text-xs cursor-pointer hover:bg-accent text-foreground focus:text-foreground">
                                          <Link href={`/projects/${current_project.key}/settings`} className="flex items-center w-full">
                                              <span className="material-icons text-[14px] mr-2 text-muted-foreground">settings</span>
                                              Project Settings
                                          </Link>
                                      </DropdownMenuItem>
                                  )}
                                  {canDelete && isConfigMode && active_board.name !== 'Backlog' && (
                                      <DropdownMenuItem onClick={handleDeleteBoard} className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground focus:text-destructive-foreground focus:bg-destructive text-destructive">
                                          <span className="material-icons text-[14px] mr-2">delete</span>
                                          Delete Board
                                      </DropdownMenuItem>
                                  )}
                              </>
                          )}
                      </DropdownMenuContent>
                  </DropdownMenu>

                  {/* View Toggles (Segmented Control Style) */}
                  <div className="hidden sm:flex bg-muted rounded-sm p-0.5 border border-border/50">
                      <div className="px-4 py-1.5 text-xs font-medium bg-background text-foreground shadow-sm rounded-sm">
                          Board
                      </div>
                      <Link href={`/projects/${current_project.key}/roadmap`} className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                          Roadmap
                      </Link>
                      <Link href={`/projects/${current_project.key}/reports`} className="px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                          Reports
                      </Link>
                  </div>
              </div>
          </div>

          {/* Board Tabs */}
          <div className="flex gap-6 mt-4 items-center overflow-x-auto no-scrollbar">
              <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} sensors={sensors}>
                  <SortableContext items={projectBoards.map(b => `board-${b.id}`)} strategy={horizontalListSortingStrategy}>
                      {projectBoards.map(b => (
                          <DraggableBoardTab 
                              key={b.id} 
                              board={b} 
                              isActive={b.id === active_board.id} 
                              projectKey={current_project.key}
                              canEdit={isStructureUnlocked}
                          />
                      ))}
                  </SortableContext>
                  <DragOverlay>
                      {activeBoardTab ? (
                          <div className="opacity-80 rotate-2 scale-105 transition-transform shadow-2xl cursor-grabbing bg-background border-b-2 border-primary text-primary px-4 py-3 whitespace-nowrap text-sm font-medium">
                              {activeBoardTab.name}
                          </div>
                      ) : null}
                  </DragOverlay>
              </DndContext>
              
              {isStructureUnlocked && (
                  isCreatingBoard ? (
                      <input 
                          type="text"
                          value={newBoardName}
                          onChange={e => setNewBoardName(e.target.value)}
                          onKeyDown={handleCreateBoard}
                          autoFocus
                          onBlur={() => setIsCreatingBoard(false)}
                          placeholder="Board name... (Press Enter)"
                          className="bg-transparent border-b border-primary text-sm focus:outline-none focus:ring-0 px-1 py-1 w-48 text-foreground"
                      />
                  ) : (
                      <button
                         onClick={() => setIsCreatingBoard(true)}
                         className="pb-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 font-medium border-b-2 border-transparent"
                      >
                         <span className="material-icons text-[14px]">add</span> New Board
                      </button>
                  )
              )}
          </div>
      </header>
      
      {/* Kanban Board Content */}
      <div className="flex-1 flex gap-6 overflow-x-auto overflow-y-hidden px-8 py-6 items-start">
        <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} sensors={sensors}>
          <SortableContext items={boardColumns.map(col => `column-${col.id}`)} strategy={horizontalListSortingStrategy}>
            {boardColumns.map((column) => (
                <DroppableColumn 
                    key={column.id} 
                    column={column} 
                    user_permissions={user_permissions}
                    canEdit={isStructureUnlocked}
                    isConfigMode={isConfigMode}
                    onRename={handleRenameColumn}
                    onDelete={handleDeleteColumn}
                >
                    <SortableContext items={column.tasks.map(t => `task-${t.id}`)} strategy={verticalListSortingStrategy}>
                        {column.tasks.map((task) => (
                            <DraggableTask 
                                key={task.id} 
                                task={task} 
                                onClick={() => openEditModal(task)} 
                                canDrag={canMoveTasks}
                            />
                        ))}
                    </SortableContext>
                </DroppableColumn>
            ))}
          </SortableContext>
          <DragOverlay>
            {activeTask ? (
                <div className="opacity-80 rotate-3 scale-105 transition-transform shadow-xl cursor-grabbing">
                    <TaskCard task={activeTask} />
                </div>
            ) : null}
            {activeColumn ? (
                <div className="opacity-80 rotate-3 scale-105 transition-transform shadow-xl cursor-grabbing bg-background rounded-xl p-2 min-w-[280px]">
                    <div className="flex items-center justify-between px-1 group/header">
                        <div className="flex items-center gap-2 flex-1">
                            <span className="material-icons text-[16px] text-primary">drag_indicator</span>
                            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">{activeColumn.title}</h3>
                        </div>
                    </div>
                </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Add Column Button */}
        {isStructureUnlocked && (
            <div className="min-w-[280px] max-w-[320px] pt-2">
                {isCreatingColumn ? (
                    <div className="bg-card border border-primary p-3 rounded-lg shadow-sm">
                        <input 
                            type="text"
                            value={newColumnTitle}
                            onChange={e => setNewColumnTitle(e.target.value)}
                            onKeyDown={handleCreateColumn}
                            autoFocus
                            onBlur={() => setIsCreatingColumn(false)}
                            placeholder="Column title... (Enter)"
                            className="w-full bg-transparent text-sm focus:outline-none focus:ring-0 text-foreground"
                        />
                    </div>
                ) : (
                    <button 
                        onClick={() => setIsCreatingColumn(true)}
                        className="w-full flex items-center justify-center gap-2 p-4 border border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all group"
                    >
                        <span className="material-icons text-[20px] group-hover:scale-110 transition-transform">add_circle_outline</span>
                        <span className="text-sm font-medium">Add Column</span>
                    </button>
                )}
            </div>
        )}
      </div>

      {/* Task Modal (Create & Edit) */}
      {isModalOpen && (
          <TaskModal 
              isOpen={isModalOpen}
              onClose={closeModal}
              task={editingTask}
              initialColumnIdForCreate={initialColIdForCreate}
              current_project={current_project}
              active_board={active_board}
              columns={boardColumns}
              project_members={project_members}
              canEdit={canCreateOrEdit}
              canDelete={canDelete}
          />
      )}

    </AppLayout>
  );
}


const TaskCard = React.memo(({ task }: { task: Task }) => {
  // Minimalist priority indicator mapping
  const priorityIcon = task.priority === 'highest' ? { icon: 'keyboard_double_arrow_up', color: 'text-[#DD3039]' } :
                       task.priority === 'high' ? { icon: 'keyboard_arrow_up', color: 'text-[#DD3039]' } : 
                       task.priority === 'low' ? { icon: 'keyboard_arrow_down', color: 'text-[#0391F2]' } : 
                       task.priority === 'lowest' ? { icon: 'keyboard_double_arrow_down', color: 'text-[#0391F2]' } : 
                       { icon: 'drag_handle', color: 'text-[#60607D]' }; // Medium

  return (
    <div className={`bg-card border border-border/60 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing rounded-lg p-3 relative group flex flex-col gap-2.5`}>

      {/* Top Row: Task Key & Assignee */}
      <div className="flex justify-between items-start">
        <span className="font-mono text-[10px] text-muted-foreground tracking-tight px-1.5 py-0.5 bg-muted/50 rounded-sm">{task.formatted_id}</span>
        
        <div className="flex items-center gap-1">
            {task.is_ai_assigned && (
               <span className="material-icons text-muted-foreground text-[12px]" title="Assigned to AI Agent">
                 smart_toy
               </span>
            )}
            {task.assignee ? (
                <div className="h-5 w-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[9px] font-medium flex-shrink-0 ring-1 ring-background" title={task.assignee.name}>
                  {task.assignee.name.substring(0, 2).toUpperCase()}
                </div>
            ) : (
                <div className="h-5 w-5 rounded-full bg-muted/50 flex items-center justify-center text-[10px] text-muted-foreground/50 ring-1 ring-background border border-dashed border-border" title="Unassigned">
                    <span className="material-icons text-[10px]">person_outline</span>
                </div>
            )}
        </div>
      </div>

      {/* Middle Row: Title */}
      <h4 className="text-sm font-medium text-foreground leading-snug line-clamp-2">
        {task.title}
      </h4>

      {/* Bottom Row: Metadata (Priority, Points, Checklist, Labels) */}
      <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/40">
         <div className="flex items-center gap-2">
             <span className={`material-icons text-[14px] ${priorityIcon.color}`} title={`Priority: ${task.priority}`}>
                 {priorityIcon.icon}
             </span>
             
             {task.story_points > 0 && (
                 <span className="bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-medium" title="Story Points">
                     {task.story_points}
                 </span>
             )}

             {task.checklists && task.checklists.length > 0 && (
                 <div className="flex items-center gap-0.5 text-muted-foreground" title="Sub-tasks progress">
                     <span className="material-icons text-[11px]">check_box</span>
                     <span className="text-[10px] font-mono">{task.checklists[0].items.filter((i:any) => i.is_completed).length}/{task.checklists[0].items.length}</span>
                 </div>
             )}
         </div>

         {/* Labels */}
         {task.labels && task.labels.length > 0 && (
             <div className="flex gap-1">
                 {task.labels.slice(0, 2).map((label: string, idx: number) => (
                     <span key={idx} className="bg-accent/80 text-accent-foreground text-[8px] px-1.5 py-0.5 rounded-full uppercase font-semibold tracking-wider max-w-[60px] truncate" title={label}>
                         {label}
                     </span>
                 ))}
                 {task.labels.length > 2 && (
                     <span className="bg-muted text-muted-foreground text-[8px] px-1.5 py-0.5 rounded-full font-bold" title={`+${task.labels.length - 2} more`}>
                         +{task.labels.length - 2}
                     </span>
                 )}
             </div>
         )}
      </div>
    </div>
  );
});

const DraggableBoardTab = ({ board, isActive, projectKey, canEdit }: { board: Board; isActive: boolean; projectKey: string; canEdit: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `board-${board.id}`,
        data: {
            type: 'Board',
            board
        },
        disabled: !canEdit
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
    };

    return (
        <Link
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            href={`/projects/${projectKey}/boards/${board.id}`}
            className={`pb-3 text-sm transition-colors border-b-2 whitespace-nowrap cursor-grab active:cursor-grabbing ${isActive ? 'border-primary text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
            {board.name}
        </Link>
    );
};

const DraggableTask = ({ task, onClick, canDrag }: { task: Task; onClick: () => void; canDrag: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: `task-${task.id}`,
      data: {
          type: 'Task',
          task
      },
      disabled: !canDrag
    });
  
    const style = {
      transform: CSS.Translate.toString(transform),
      transition,
      opacity: isDragging ? 0 : 1,
    };
  
    return (
      <div 
          ref={setNodeRef} 
          style={style} 
          {...listeners} 
          {...attributes} 
          onClick={(e) => {
              onClick();
          }}
      >
           <TaskCard task={task} />
      </div>
    );
};
  
const DroppableColumn = ({ column, user_permissions, canEdit, isConfigMode, onRename, onDelete, onCreateCard, children }: { column: ColumnProps; user_permissions: any; canEdit: boolean; isConfigMode: boolean; onRename: (id: number, title: string) => void; onDelete: (id: number) => void; onCreateCard: (columnId: number) => void; children: React.ReactNode }) => {
    const { isOver, setNodeRef: setDroppableRef } = useDroppable({
      id: `column-${column.id}`,
      data: {
          type: 'Column',
          column
      }
    });

    const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({
        id: `column-${column.id}`,
        data: {
            type: 'Column',
            column
        },
        disabled: !canEdit
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(column.title);

    const handleRename = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && editTitle.trim()) {
            onRename(column.db_id, editTitle);
            setIsEditing(false);
        } else if (e.key === 'Escape') {
            setEditTitle(column.title);
            setIsEditing(false);
        }
    };
  
    const style = {
      transform: CSS.Translate.toString(transform),
      transition,
      opacity: isDragging ? 0 : 1,
    };

    return (
      <div 
          ref={(node) => {
              setSortableRef(node);
              setDroppableRef(node);
          }}
          style={style}
          className={`flex-1 min-w-[280px] max-w-[320px] flex flex-col gap-4 rounded-xl p-2 transition-all duration-200 ${isOver ? 'bg-primary/5 border-primary/20 border' : 'bg-muted/10 border border-border/50'} ${isConfigMode ? 'border-dashed border-primary/30 bg-primary/[0.02]' : ''} ${column.id === 'done' && !user_permissions.can_move_to_done ? 'opacity-50' : ''} ${!canEdit && !isConfigMode ? 'cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center justify-between px-1 group/header">
            <div className="flex items-center gap-2 flex-1">
                {canEdit && isConfigMode ? (
                    <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary p-0.5">
                        <span className="material-icons text-[16px]">drag_indicator</span>
                    </div>
                ) : (
                    !canEdit && <span className="material-icons text-[12px] text-muted-foreground/40" title="Lane Locked">lock</span>
                )}
                
                {isEditing ? (
                    <input 
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={handleRename}
                        onBlur={() => setIsEditing(false)}
                        autoFocus
                        className="bg-background border-b border-primary text-[11px] font-semibold uppercase tracking-wider focus:outline-none w-full"
                    />
                ) : (
                    <h3 
                        onDoubleClick={() => canEdit && isConfigMode && setIsEditing(true)}
                        className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-2 ${isConfigMode && canEdit ? 'text-primary cursor-text' : 'text-muted-foreground'}`}
                    >
                      {column.title}
                      {canEdit && isConfigMode && <span className="material-icons text-[10px] opacity-50">edit</span>}
                      {column.title.toLowerCase().includes('done') && !user_permissions.can_move_to_done && (
                          <span className="material-icons text-[12px]" title="Restricted Access">lock</span>
                      )}
                    </h3>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">{column.tasks.length}</span>
                {canEdit && isConfigMode && !isEditing && (
                    <button 
                        onClick={() => onDelete(column.db_id)}
                        className="text-muted-foreground hover:text-destructive transition-all"
                    >
                        <span className="material-icons text-[14px]">delete_outline</span>
                    </button>
                )}
            </div>
        </div>
        
        <div className="flex flex-col gap-2 overflow-y-auto pb-2 scrollbar-hide min-h-[150px]">
          {children}
          {canEdit && (
              <button 
                  onClick={() => onCreateCard(column.db_id)}
                  className="mt-1 flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 px-3 py-2 rounded-lg transition-colors text-xs font-medium w-full"
              >
                  <span className="material-icons text-[16px]">add</span>
                  Create Card
              </button>
          )}
        </div>
      </div>
    );
};

export default KanbanBoard;