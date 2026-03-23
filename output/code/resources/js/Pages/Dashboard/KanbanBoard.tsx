import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, DragEndEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, DragStartEvent, DragOverEvent, pointerWithin, rectIntersection, DragOverlay } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { router, usePage, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import { useDropzone } from 'react-dropzone';

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

  // Sync columns when props change
  useEffect(() => {
    setBoardColumns(columns);
    setProjectBoards(boards);
  }, [columns, boards]);

  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [initialColIdForCreate, setInitialColIdForCreate] = useState<number | null>(null);

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
      <header className="px-4 md:px-8 pt-4 md:pt-6 pb-0 border-b border-border flex-shrink-0 bg-card/80 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                 {canCreateOrEdit && (
                     <button 
                        onClick={openCreateModal}
                        className="bg-primary hover:bg-primary/90 text-white text-xs px-3 py-1.5 rounded-sm transition-colors shadow-sm flex items-center gap-1">
                        <span className="material-icons text-[14px]">add</span>
                        Create Task
                     </button>
                 )}
              </div>
              
              <div className="flex items-center gap-3">
                  {canCreateOrEdit && (
                      <button 
                        onClick={() => setIsConfigMode(!isConfigMode)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${isConfigMode ? 'bg-primary text-primary-foreground shadow-inner' : 'bg-transparent border border-border text-muted-foreground hover:text-foreground'}`}
                      >
                        <span className="material-icons text-[14px]">{isConfigMode ? 'settings_suggest' : 'settings_overscan'}</span>
                        {isConfigMode ? 'Configuration: ON' : 'Configure Board'}
                      </button>
                  )}

                  <Link 
                      href={`/projects/${current_project.key}/roadmap`}
                      className="bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1.5"
                  >
                      <span className="material-icons text-[14px]">map</span>
                      <span className="hidden sm:inline">Roadmap</span>
                  </Link>
                  <Link 
                      href={`/projects/${current_project.key}/reports`}
                      className="bg-transparent border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1.5"
                  >
                      <span className="material-icons text-[14px]">assessment</span>
                      <span className="hidden sm:inline">Reports</span>
                  </Link>
                  {canDelete && isConfigMode && active_board.name !== 'Backlog' && (
                      <button 
                          onClick={handleDeleteBoard}
                          className="bg-transparent border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1.5"
                          title="Delete this board"
                      >
                          <span className="material-icons text-[14px]">delete</span>
                          <span className="hidden sm:inline">Delete Board</span>
                      </button>
                  )}
                  {(project_role === 'Manager' || (auth?.user as any)?.role === 'Admin') && (
                      <Link 
                          href={`/projects/${current_project.key}/settings`}
                          className="bg-transparent border border-border text-foreground hover:bg-accent text-xs px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1.5"
                      >
                          <span className="material-icons text-[14px]">settings</span>
                          <span className="hidden sm:inline">Project Settings</span>
                      </Link>
                  )}
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
                <div className="opacity-80 rotate-2 scale-105 transition-transform shadow-2xl cursor-grabbing">
                    <TaskCard task={activeTask} />
                </div>
            ) : null}
            {activeColumn ? (
                <div className="opacity-80 rotate-2 scale-105 transition-transform shadow-2xl cursor-grabbing bg-background rounded-lg p-2 min-w-[280px]">
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

// Task Modal Component
interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null; // null means create mode
    initialColumnIdForCreate?: number | null;
    current_project: Project;
    active_board: Board;
    columns: ColumnProps[];
    project_members: User[];
    canEdit: boolean;
    canDelete: boolean;
}

const TaskModal = ({ isOpen, onClose, task, initialColumnIdForCreate, current_project, active_board, columns, project_members, canEdit, canDelete }: TaskModalProps) => {
    const { auth } = usePage<any>().props;
    const isEditMode = !!task;
    
    // Helper to format date for <input type="date">
    const formatDate = (dateStr: any) => {
        if (!dateStr) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
        } catch (e) {
            return '';
        }
    };

    // Find initial column ID
    const initialColumnId = task ? columns.find(c => c.tasks.some(t => t.id === task.id))?.db_id || '' : initialColumnIdForCreate || columns[0]?.db_id || '';

    const { data, setData, post, patch, delete: destroy, processing, errors } = useForm({
        title: task?.title || '',
        description: task?.description || '',
        priority: task?.priority || 'medium',
        assignee_id: task?.assignee_id || '',
        board_column_id: initialColumnId,
        start_date: formatDate(task?.start_date),
        due_date: formatDate(task?.due_date),
    });

    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);

    // TipTap Editor Setup
    const editor = useEditor({
        extensions: [
            StarterKit,
            LinkExtension.configure({ openOnClick: false }),
        ],
        content: data.description,
        editable: canEdit,
        onUpdate: ({ editor }) => {
            setData('description', editor.getHTML());
        },
    });

    // Sync editor content when task changes
    useEffect(() => {
        if (editor && task?.description !== undefined) {
            if (editor.getHTML() !== task?.description) {
                editor.commands.setContent(task?.description || '');
            }
        }
    }, [task, editor]);

    // Dropzone Setup
    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Mock upload for MVP
        alert(`File upload simulation: ${acceptedFiles[0].name}. (Backend endpoint ready in AttachmentController)`);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    useEffect(() => {
        if (isEditMode && task?.id) {
            fetch(`/tasks/${task.id}/comments`)
                .then(res => res.json())
                .then(data => setComments(data));
        }
    }, [isEditMode, task?.id]);

    // Checklist Logic
    const [newChecklistItem, setNewChecklistItem] = useState('');
    
    const handleAddChecklistItem = (checklistId: number) => {
        if (!newChecklistItem.trim()) return;
        router.post(`/checklists/${checklistId}/items`, {
            content: newChecklistItem
        }, {
            preserveScroll: true,
            onSuccess: () => setNewChecklistItem('')
        });
    };

    const handleToggleChecklistItem = (itemId: number, isCompleted: boolean) => {
        router.patch(`/checklist-items/${itemId}`, {
            is_completed: !isCompleted
        }, { preserveScroll: true });
    };

    const handleDeleteChecklistItem = (itemId: number) => {
        if (confirm("Remove this sub-task?")) {
            router.delete(`/checklist-items/${itemId}`, { preserveScroll: true });
        }
    };

    const handleCreateChecklist = () => {
        router.post(`/tasks/${task?.id}/checklists`, {
            title: 'Sub-tasks'
        }, { preserveScroll: true });
    };

    const handlePostComment = () => {
        if (!newComment.trim() || !task) return;
        setIsPostingComment(true);
        fetch(`/tasks/${task.id}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
            },
            body: JSON.stringify({ content: newComment })
        })
        .then(res => res.json())
        .then(data => {
            setComments([...comments, data]);
            setNewComment('');
        })
        .finally(() => setIsPostingComment(false));
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!canEdit) return;

        if (isEditMode) {
            patch(`/tasks/${task.id}`, {
                onSuccess: () => onClose(),
                preserveScroll: true,
            });
        } else {
            post(`/projects/${current_project.id}/boards/${active_board.id}/tasks`, {
                onSuccess: () => onClose(),
                preserveScroll: true,
            });
        }
    };

    const handleDelete = () => {
        if (!canDelete || !task) return;
        if (confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
            destroy(`/tasks/${task.id}`, {
                onSuccess: () => onClose(),
                preserveScroll: true,
            });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            {/* Sheet Content */}
            <div className="relative bg-card border-l border-border shadow-2xl w-full sm:w-[800px] md:w-[900px] h-full flex flex-col overflow-hidden animate-in slide-in-from-right">
                <header className="px-6 py-4 border-b border-border flex justify-between items-center bg-background">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        {isEditMode ? (
                            <>
                                <span className="text-muted-foreground font-mono text-sm">{task.formatted_id}</span>
                                <input
                                    type="text"
                                    value={data.title}
                                    onChange={e => setData('title', e.target.value)}
                                    disabled={!canEdit}
                                    className="bg-transparent border-none focus:ring-0 text-xl font-semibold text-foreground w-full p-0"
                                    placeholder="Task Title"
                                />
                            </>
                        ) : 'Create New Task'}
                    </h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-sm hover:bg-muted">
                        <span className="material-icons">close</span>
                    </button>
                </header>

                <div {...getRootProps()} className={`flex-1 overflow-y-auto ${isDragActive ? 'bg-primary/5 border-2 border-dashed border-primary/50' : ''}`}>
                    <input {...getInputProps()} />
                    <form id="task-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 h-full">
                        
                        {/* MAIN CONTENT AREA */}
                        <div className="md:col-span-8 p-6 space-y-8 h-full overflow-y-auto">
                            
                            {!isEditMode && (
                                <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                    <label htmlFor="task-title" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</label>
                                    <input 
                                        id="task-title"
                                        name="title"
                                        autoComplete="off"
                                        type="text" 
                                        value={data.title}
                                        onChange={e => setData('title', e.target.value)}
                                        disabled={!canEdit}
                                        className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring transition-colors disabled:opacity-50"
                                        placeholder="E.g., Implement secure login portal"
                                        required
                                    />
                                    {errors.title && <div className="text-xs text-destructive">{errors.title}</div>}
                                </div>
                            )}

                            <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
                                
                                {/* TipTap Rich Text Toolbar */}
                                {editor && canEdit && (
                                    <div className="flex flex-wrap items-center gap-1 mb-2 bg-background border border-border rounded-sm p-1">
                                        <button
                                            type="button"
                                            onClick={() => editor.chain().focus().toggleBold().run()}
                                            className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground ${editor.isActive('bold') ? 'bg-accent text-accent-foreground' : ''}`}
                                        >
                                            <span className="material-icons text-[16px]">format_bold</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => editor.chain().focus().toggleItalic().run()}
                                            className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground ${editor.isActive('italic') ? 'bg-accent text-accent-foreground' : ''}`}
                                        >
                                            <span className="material-icons text-[16px]">format_italic</span>
                                        </button>
                                        <div className="w-[1px] h-4 bg-border mx-1"></div>
                                        <button
                                            type="button"
                                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                                            className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground font-bold text-xs ${editor.isActive('heading', { level: 1 }) ? 'bg-accent text-accent-foreground' : ''}`}
                                        >
                                            H1
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                                            className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground font-bold text-xs ${editor.isActive('heading', { level: 2 }) ? 'bg-accent text-accent-foreground' : ''}`}
                                        >
                                            H2
                                        </button>
                                        <div className="w-[1px] h-4 bg-border mx-1"></div>
                                        <button
                                            type="button"
                                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                                            className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground ${editor.isActive('bulletList') ? 'bg-accent text-accent-foreground' : ''}`}
                                        >
                                            <span className="material-icons text-[16px]">format_list_bulleted</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                            className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground ${editor.isActive('orderedList') ? 'bg-accent text-accent-foreground' : ''}`}
                                        >
                                            <span className="material-icons text-[16px]">format_list_numbered</span>
                                        </button>
                                        <div className="w-[1px] h-4 bg-border mx-1"></div>
                                        <button
                                            type="button"
                                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                                            className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground ${editor.isActive('blockquote') ? 'bg-accent text-accent-foreground' : ''}`}
                                        >
                                            <span className="material-icons text-[16px]">format_quote</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                                            className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground ${editor.isActive('codeBlock') ? 'bg-accent text-accent-foreground' : ''}`}
                                        >
                                            <span className="material-icons text-[16px]">code</span>
                                        </button>
                                    </div>
                                )}
                                
                                <div className="w-full bg-background border border-border rounded-sm p-3 text-sm text-foreground focus-within:border-ring transition-colors min-h-[200px] overflow-y-auto prose prose-sm dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 max-w-none">
                                    <EditorContent editor={editor} />
                                </div>

                                {errors.description && <div className="text-xs text-destructive">{errors.description}</div>}
                            </div>

                            {/* ATTACHMENTS PREVIEW */}
                            <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                                    <span className="material-icons text-[16px] text-muted-foreground">attach_file</span>
                                    Attachments
                                </h3>
                                <div className={`border-2 border-dashed border-border rounded-lg bg-muted/10 p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${isDragActive ? 'bg-primary/5 border-primary' : 'hover:bg-muted/20 hover:border-primary/50'}`}>
                                    <span className="material-icons text-[24px] text-muted-foreground mb-2">cloud_upload</span>
                                    <span className="text-sm text-muted-foreground">Drag & drop files or click to browse</span>
                                </div>
                            </div>

                            {/* CHECKLIST SECTION */}
                            {isEditMode && (
                                <div className="pt-6 border-t border-border" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                            <span className="material-icons text-[16px] text-muted-foreground">checklist</span>
                                            Sub-tasks
                                        </h3>
                                        {!task.checklists || task.checklists.length === 0 ? (
                                            <button 
                                                type="button"
                                                onClick={handleCreateChecklist}
                                                className="text-[10px] uppercase font-bold text-primary hover:underline"
                                            >
                                                + Add Checklist
                                            </button>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                {task.checklists[0].items.filter(i => i.is_completed).length} / {task.checklists[0].items.length}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {task.checklists && task.checklists.length > 0 && (
                                        <>
                                            {/* Progress bar */}
                                            <div className="w-full bg-muted rounded-full h-1 mb-6 overflow-hidden">
                                                <div 
                                                    className="bg-primary h-1 rounded-full transition-all duration-500" 
                                                    style={{ 
                                                        width: `${task.checklists[0].items.length > 0 
                                                            ? (task.checklists[0].items.filter(i => i.is_completed).length / task.checklists[0].items.length) * 100 
                                                            : 0}%` 
                                                    }}
                                                ></div>
                                            </div>

                                            <div className="space-y-3 mb-6">
                                                {task.checklists[0].items.map(item => (
                                                    <div key={item.id} className="flex items-center gap-3 group/item">
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleToggleChecklistItem(item.id, item.is_completed)}
                                                            className={`h-4 w-4 rounded-sm border flex items-center justify-center transition-colors ${item.is_completed ? 'bg-primary border-primary text-white' : 'border-border hover:border-primary'}`}
                                                        >
                                                            {item.is_completed && <span className="material-icons text-[12px]">check</span>}
                                                        </button>
                                                        <span className={`text-sm flex-1 ${item.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                                            {item.content}
                                                        </span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleDeleteChecklistItem(item.id)}
                                                            className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                                                        >
                                                            <span className="material-icons text-[14px]">delete_outline</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    value={newChecklistItem}
                                                    onChange={e => setNewChecklistItem(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem(task.checklists[0].id))}
                                                    placeholder="Add a sub-task..." 
                                                    className="flex-1 bg-background border border-border rounded-sm px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-ring transition-colors"
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => handleAddChecklistItem(task.checklists[0].id)}
                                                    disabled={!newChecklistItem.trim()}
                                                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-sm text-xs font-bold transition-colors disabled:opacity-50"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* COMMENTS SECTION */}
                            {isEditMode && (
                                <div className="pt-6 border-t border-border">
                                    <h3 className="text-sm font-semibold text-foreground mb-4">Activity & Comments</h3>
                                    
                                    <div className="space-y-4 mb-6">
                                        {comments.map((comment, idx) => {
                                            const isAI = comment.user?.name === 'AI Agent';
                                            return (
                                                <div key={idx} className="flex gap-3 relative">
                                                    {/* Timeline Line */}
                                                    {idx !== comments.length - 1 && (
                                                        <div className="absolute left-4 top-10 bottom-[-24px] w-[2px] bg-border z-0"></div>
                                                    )}
                                                    
                                                    <div className={`w-8 h-8 rounded-sm shrink-0 flex items-center justify-center text-xs font-bold z-10 ${isAI ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-muted text-muted-foreground border border-border'}`}>
                                                        {isAI ? <span className="material-icons text-[16px]">smart_toy</span> : comment.user?.name.charAt(0)}
                                                    </div>
                                                    <div className={`flex-1 rounded-sm p-3 border ${isAI ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-background border-border'}`}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-bold text-foreground flex items-center gap-1">
                                                                {comment.user?.name}
                                                                {isAI && <span className="text-[10px] uppercase bg-primary/20 text-primary px-1.5 py-0.5 rounded-sm ml-1">AI</span>}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">{new Date(comment.created_at).toLocaleString()}</span>
                                                        </div>
                                                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{comment.content}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {comments.length === 0 && (
                                            <div className="text-xs text-muted-foreground italic">No comments yet.</div>
                                        )}
                                    </div>

                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-sm bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 border border-primary/30">
                                            {auth?.user?.name?.charAt(0) || 'U'}
                                        </div>
                                        <textarea 
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                            placeholder="Add a comment or update..." 
                                            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring transition-colors min-h-[60px]"
                                        />
                                        <button 
                                            type="button"
                                            onClick={handlePostComment}
                                            disabled={isPostingComment || !newComment.trim()}
                                            className="self-end bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4 py-2 rounded-sm transition-colors disabled:opacity-50 whitespace-nowrap"
                                        >
                                            {isPostingComment ? 'Posting...' : 'Post'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* METADATA SIDEBAR */}
                        <div className="md:col-span-4 bg-muted/30 border-l border-border p-6 space-y-6 h-full overflow-y-auto">
                            
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Details</h4>
                                
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label htmlFor="task-status" className="text-xs text-muted-foreground col-span-1">Status</label>
                                    <select 
                                        id="task-status"
                                        name="board_column_id"
                                        value={data.board_column_id}
                                        onChange={e => setData('board_column_id', e.target.value)}
                                        disabled={!canEdit}
                                        className="col-span-2 w-full bg-background border border-border rounded-sm px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring transition-colors disabled:opacity-50"
                                    >
                                        {columns.map(col => (
                                            <option key={col.id} value={col.db_id}>{col.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label htmlFor="task-assignee" className="text-xs text-muted-foreground col-span-1">Assignee</label>
                                    <select 
                                        id="task-assignee"
                                        name="assignee_id"
                                        value={data.assignee_id}
                                        onChange={e => setData('assignee_id', e.target.value)}
                                        disabled={!canEdit}
                                        className="col-span-2 w-full bg-background border border-border rounded-sm px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring transition-colors disabled:opacity-50"
                                    >
                                        <option value="">Unassigned</option>
                                        {project_members.map(member => (
                                            <option key={member.id} value={member.id}>{member.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label htmlFor="task-priority" className="text-xs text-muted-foreground col-span-1">Priority</label>
                                    <select 
                                        id="task-priority"
                                        name="priority"
                                        value={data.priority}
                                        onChange={e => setData('priority', e.target.value)}
                                        disabled={!canEdit}
                                        className="col-span-2 w-full bg-background border border-border rounded-sm px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring transition-colors disabled:opacity-50"
                                    >
                                        <option value="lowest">Lowest</option>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="highest">Highest</option>
                                    </select>
                                </div>

                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Planning</h4>

                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label htmlFor="task-story-points" className="text-xs text-muted-foreground col-span-1">Story Points</label>
                                    <input 
                                        id="task-story-points"
                                        type="number" 
                                        min="0"
                                        step="0.5"
                                        value={data.story_points as number}
                                        onChange={e => setData('story_points', e.target.value)}
                                        disabled={!canEdit}
                                        className="col-span-2 w-full bg-background border border-border rounded-sm px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring transition-colors disabled:opacity-50"
                                    />
                                </div>

                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label htmlFor="task-start-date" className="text-xs text-muted-foreground col-span-1">Start Date</label>
                                    <input 
                                        id="task-start-date"
                                        type="date" 
                                        value={data.start_date as string}
                                        onChange={e => setData('start_date', e.target.value)}
                                        disabled={!canEdit}
                                        className="col-span-2 w-full bg-background border border-border rounded-sm px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring transition-colors disabled:opacity-50"
                                    />
                                </div>

                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label htmlFor="task-due-date" className="text-xs text-muted-foreground col-span-1">Due Date</label>
                                    <input 
                                        id="task-due-date"
                                        type="date" 
                                        value={data.due_date as string}
                                        onChange={e => setData('due_date', e.target.value)}
                                        disabled={!canEdit}
                                        className="col-span-2 w-full bg-background border border-border rounded-sm px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring transition-colors disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>
                    </form>

                    </div>

                <footer className="px-6 py-4 border-t border-border flex justify-between items-center bg-card">
                    <div>
                        {isEditMode && canDelete && (
                            <button 
                                type="button" 
                                onClick={handleDelete}
                                disabled={processing}
                                className="text-xs text-destructive hover:text-destructive transition-colors px-3 py-1.5 border border-destructive/30 hover:bg-destructive/20 rounded-sm"
                            >
                                Delete Task
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="text-xs text-muted-foreground hover:text-foreground px-4 py-2 transition-colors"
                        >
                            Cancel
                        </button>
                        {canEdit && (
                            <button 
                                type="submit" 
                                form="task-form"
                                disabled={processing}
                                className="bg-primary hover:bg-primary/90 text-white text-xs px-6 py-2 rounded-sm transition-colors shadow-sm disabled:opacity-50"
                            >
                                {processing ? 'Saving...' : 'Save Task'}
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    );
};

const TaskCard = ({ task }: { task: Task }) => {
  // Minimalist priority indicator
  const priorityBorder = task.priority === 'high' ? 'border-l-[#DD3039]' : task.priority === 'medium' ? 'border-l-[#0391F2]' : 'border-l-[#60607D]';

  return (
    <div className={`bg-card text-card-foreground hover:bg-card/80 transition-colors cursor-grab active:cursor-grabbing rounded-sm p-4 border-l-2 ${priorityBorder} border-t border-r border-b border-border relative group flex flex-col gap-3 shadow-sm`}>

      <div className="flex justify-between items-center">
        {/* Changed from just #ID to formatted Project Key ID */}
        <span className="text-xs text-muted-foreground font-mono tracking-tight">{task.formatted_id}</span>

        {task.is_ai_assigned && (
           <span className="material-icons text-muted-foreground text-[14px]" title="Assigned to AI Agent">
             smart_toy
           </span>
        )}
      </div>

      <h4 className="text-sm text-foreground leading-snug">
        {task.title}
      </h4>

      <div className="flex justify-between items-center mt-1">
         <div className="flex items-center gap-1.5">
             <span className={`h-1.5 w-1.5 rounded-full ${task.priority === 'high' ? 'bg-[#DD3039]' : task.priority === 'medium' ? 'bg-[#0391F2]' : 'bg-[#60607D]'}`}></span>             <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{task.priority}</span>
         </div>
         {task.assignee && (
             <div className="flex items-center gap-1.5">
                <div className="h-4 w-4 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[8px] font-medium flex-shrink-0" title={task.assignee.name}>
                  {task.assignee.name.substring(0, 2).toUpperCase()}
                </div>
             </div>
         )}
      </div>
    </div>
  );
}

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
          }}          style={style}
          className={`flex-1 min-w-[280px] max-w-[320px] flex flex-col gap-4 rounded-lg p-2 transition-all duration-200 ${isOver ? 'bg-accent/50' : ''} ${isConfigMode ? 'border border-dashed border-primary/30 bg-primary/[0.02]' : 'border border-transparent'} ${column.id === 'done' && !user_permissions.can_move_to_done ? 'opacity-50' : ''} ${!canEdit && !isConfigMode ? 'cursor-not-allowed' : ''}`}
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
                  className="mt-2 flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 p-2 rounded-md transition-colors text-sm w-full"
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