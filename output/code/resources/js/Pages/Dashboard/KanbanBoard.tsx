import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, DragEndEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
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

  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const canCreateOrEdit = project_role === 'Manager' || project_role === 'Contributor';
  const canDelete = project_role === 'Manager';

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    // Handle Column Reordering
    if (active.data.current?.type === 'Column') {
        if (active.id !== over.id) {
            const oldIndex = boardColumns.findIndex(col => col.id === active.id);
            const newIndex = boardColumns.findIndex(col => col.id === over.id);
            
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

    // Handle Board Reordering
    if (active.data.current?.type === 'Board') {
        if (active.id !== over.id) {
            const oldIndex = projectBoards.findIndex(b => b.id.toString() === active.id);
            const newIndex = projectBoards.findIndex(b => b.id.toString() === over.id);

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

    // Handle Task Reordering
    if (active.id !== over.id) {
        const task = active.data.current?.task as Task;
        const targetId = over.id as string;
        
        // Find source and target columns
        let sourceColumnId = '';
        let targetColumnId = '';

        boardColumns.forEach(col => {
            if (col.tasks.some(t => t.id.toString() === active.id)) {
                sourceColumnId = col.id;
            }
            if (col.id === targetId) {
                targetColumnId = col.id;
            } else if (col.tasks.some(t => t.id.toString() === targetId)) {
                targetColumnId = col.id;
            }
        });

        if (!sourceColumnId || !targetColumnId) return;

        // Optimistic Update
        const newBoardColumns = [...boardColumns];
        const sourceColIdx = newBoardColumns.findIndex(c => c.id === sourceColumnId);
        const targetColIdx = newBoardColumns.findIndex(c => c.id === targetColumnId);
        
        const sourceTasks = [...newBoardColumns[sourceColIdx].tasks];
        const taskToMove = sourceTasks.find(t => t.id.toString() === active.id)!;
        
        // Permission check for Done
        const targetColObj = newBoardColumns[targetColIdx];
        if (targetColObj.title.toLowerCase().includes('done') && !user_permissions.can_move_to_done && sourceColumnId !== targetColumnId) {
            alert("Permission Denied: Only PM or QA can move tasks to Done.");
            return;
        }

        if (sourceColumnId === targetColumnId) {
            // Internal Reorder
            const oldIdx = sourceTasks.findIndex(t => t.id.toString() === active.id);
            const newIdx = sourceTasks.findIndex(t => t.id.toString() === targetId);
            const reorderedTasks = arrayMove(sourceTasks, oldIdx, newIdx);
            newBoardColumns[sourceColIdx].tasks = reorderedTasks;
            setBoardColumns(newBoardColumns);

            router.patch(`/boards/${active_board.id}/tasks/reorder`, {
                column_id: parseInt(targetColumnId),
                task_ids: reorderedTasks.map(t => t.id)
            }, { preserveScroll: true });
        } else {
            // Cross Column Move
            const filteredSourceTasks = sourceTasks.filter(t => t.id.toString() !== active.id);
            const targetTasks = [...newBoardColumns[targetColIdx].tasks];
            const dropIdx = targetTasks.findIndex(t => t.id.toString() === targetId);
            
            if (dropIdx !== -1) {
                targetTasks.splice(dropIdx, 0, taskToMove);
            } else {
                targetTasks.push(taskToMove);
            }
            
            newBoardColumns[sourceColIdx].tasks = filteredSourceTasks;
            newBoardColumns[targetColIdx].tasks = targetTasks;
            setBoardColumns(newBoardColumns);

            router.patch(`/boards/${active_board.id}/tasks/reorder`, {
                column_id: parseInt(targetColumnId),
                task_ids: targetTasks.map(t => t.id)
            }, { preserveScroll: true });
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

  const openCreateModal = () => {
      setEditingTask(null);
      setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
      setEditingTask(task);
      setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingTask(null);
  };

  const breadcrumbs = (
    <>
      <span className="text-muted-foreground font-mono text-sm mr-2 md:mr-3 font-normal">[{current_project.key}]</span>
      {active_board.name}
    </>
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
                  {canDelete && active_board.name !== 'Backlog' && (
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
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
                  <SortableContext items={projectBoards.map(b => b.id.toString())} strategy={horizontalListSortingStrategy}>
                      {projectBoards.map(b => (
                          <DraggableBoardTab 
                              key={b.id} 
                              board={b} 
                              isActive={b.id === active_board.id} 
                              projectKey={current_project.key}
                              canEdit={canCreateOrEdit}
                          />
                      ))}
                  </SortableContext>
              </DndContext>
              
              {canCreateOrEdit && (
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
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
          <SortableContext items={boardColumns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
            {boardColumns.map((column) => (
                <DroppableColumn 
                    key={column.id} 
                    column={column} 
                    user_permissions={user_permissions}
                    canEdit={canCreateOrEdit}
                    onRename={handleRenameColumn}
                    onDelete={handleDeleteColumn}
                >
                    <SortableContext items={column.tasks.map(t => t.id.toString())} strategy={verticalListSortingStrategy}>
                        {column.tasks.map((task) => (
                            <DraggableTask key={task.id} task={task} onClick={() => openEditModal(task)} />
                        ))}
                    </SortableContext>
                </DroppableColumn>
            ))}
          </SortableContext>
        </DndContext>

        {/* Add Column Button */}
        {canCreateOrEdit && (
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
    current_project: Project;
    active_board: Board;
    columns: ColumnProps[];
    project_members: User[];
    canEdit: boolean;
    canDelete: boolean;
}

const TaskModal = ({ isOpen, onClose, task, current_project, active_board, columns, project_members, canEdit, canDelete }: TaskModalProps) => {
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
    const initialColumnId = task ? columns.find(c => c.tasks.some(t => t.id === task.id))?.db_id || '' : columns[0]?.db_id || '';

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
            <div className="relative bg-card border-l border-border shadow-2xl w-full sm:w-[600px] md:w-[700px] h-full flex flex-col overflow-hidden animate-in slide-in-from-right">
                <header className="px-6 py-4 border-b border-border flex justify-between items-center bg-background">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        {isEditMode ? (
                            <>
                                <span className="text-muted-foreground font-mono text-sm">{task.formatted_id}</span>
                                <span>{task.title}</span>
                            </>
                        ) : 'Create New Task'}
                    </h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-sm hover:bg-muted">
                        <span className="material-icons">close</span>
                    </button>
                </header>

                <div {...getRootProps()} className={`p-6 overflow-y-auto flex-1 ${isDragActive ? 'bg-primary/5 border-2 border-dashed border-primary/50 rounded-sm' : ''}`}>
                    <input {...getInputProps()} />
                    <form id="task-form" onSubmit={handleSubmit} className="space-y-5">
                        
                        <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</label>
                            <input 
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
                                    <button
                                        type="button"
                                        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                                        className={`p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground ${editor.isActive('codeBlock') ? 'bg-accent text-accent-foreground' : ''}`}
                                    >
                                        <span className="material-icons text-[16px]">code</span>
                                    </button>
                                </div>
                            )}
                            
                            <div className="w-full bg-background border border-border rounded-sm p-3 text-sm text-foreground focus-within:border-ring transition-colors min-h-[120px] max-h-[300px] overflow-y-auto prose prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 max-w-none">
                                <EditorContent editor={editor} />
                            </div>

                            {errors.description && <div className="text-xs text-destructive">{errors.description}</div>}
                        </div>

                        <div className="grid grid-cols-2 gap-4" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date</label>
                                <input 
                                    type="date" 
                                    value={data.start_date as string}
                                    onChange={e => setData('start_date', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring transition-colors disabled:opacity-50"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</label>
                                <input 
                                    type="date" 
                                    value={data.due_date as string}
                                    onChange={e => setData('due_date', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring transition-colors disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</label>
                                <select 
                                    value={data.priority}
                                    onChange={e => setData('priority', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring transition-colors disabled:opacity-50"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                                {errors.priority && <div className="text-xs text-destructive">{errors.priority}</div>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assignee</label>
                                <select 
                                    value={data.assignee_id}
                                    onChange={e => setData('assignee_id', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring transition-colors disabled:opacity-50"
                                >
                                    <option value="">Unassigned</option>
                                    {project_members.map(member => (
                                        <option key={member.id} value={member.id}>{member.name}</option>
                                    ))}
                                </select>
                                {errors.assignee_id && <div className="text-xs text-destructive">{errors.assignee_id}</div>}
                            </div>
                        </div>

                        {isEditMode && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status (Column)</label>
                                <select 
                                    value={data.board_column_id}
                                    onChange={e => setData('board_column_id', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring transition-colors disabled:opacity-50"
                                >
                                    {columns.map(col => (
                                        <option key={col.id} value={col.db_id}>{col.title}</option>
                                    ))}
                                </select>
                                {errors.board_column_id && <div className="text-xs text-destructive">{errors.board_column_id}</div>}
                            </div>
                        )}
                    </form>

                    {/* ATTACHMENTS PREVIEW (MVP Mock) */}
                    {isEditMode && (
                        <div className="mt-8 pt-6 border-t border-border" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                <span className="material-icons text-[16px] text-muted-foreground">attach_file</span>
                                Attachments
                            </h3>
                            <div className="flex items-center gap-3 overflow-x-auto pb-2">
                                {/* Placeholder for drag state */}
                                {isDragActive ? (
                                    <div className="h-16 w-full border-2 border-dashed border-primary rounded-sm flex items-center justify-center bg-primary/10 text-destructive text-xs">
                                        Drop files here...
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted-foreground italic">No attachments yet. Drag and drop files anywhere to upload.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* CHECKLIST SECTION (MVP Mock) */}
                    {isEditMode && (
                        <div className="mt-8 pt-6 border-t border-border" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <span className="material-icons text-[16px] text-muted-foreground">checklist</span>
                                    Sub-tasks
                                </h3>
                                <span className="text-xs text-muted-foreground">0 / 0</span>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="w-full bg-white rounded-full h-1 mb-4 overflow-hidden">
                                <div className="bg-[#0391F2] h-1 rounded-full transition-all" style={{ width: '0%' }}></div>
                            </div>

                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Add an item..." 
                                    className="flex-1 bg-background border border-border rounded-sm px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-ring transition-colors"
                                />
                                <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-sm text-xs transition-colors">Add</button>
                            </div>
                        </div>
                    )}

                    {/* COMMENTS SECTION */}
                    {isEditMode && (
                        <div className="mt-10 pt-6 border-t border-border">
                            <h3 className="text-sm font-semibold text-foreground mb-4">Activity & Comments</h3>
                            
                            <div className="space-y-4 mb-6">
                                {comments.map((comment, idx) => {
                                    const isAI = comment.user?.name === 'AI Agent';
                                    return (
                                        <div key={idx} className="flex gap-3 relative">
                                            {/* Timeline Line */}
                                            {idx !== comments.length - 1 && (
                                                <div className="absolute left-3 top-8 bottom-[-16px] w-[1px] bg-border"></div>
                                            )}
                                            
                                            <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-medium flex-shrink-0 z-10 border border-border">
                                                {comment.user?.name ? comment.user.name.substring(0, 2).toUpperCase() : 'U'}
                                            </div>
                                            
                                            <div className={`flex-1 flex flex-col pt-0.5 ${isAI ? 'bg-[#0391F2]/10 px-3 py-2 rounded-sm border border-[#0391F2]/30' : ''}`}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-medium text-foreground flex items-center gap-1">
                                                        {comment.user?.name}
                                                        {isAI && <span className="material-icons text-[10px] text-[#0391F2]">smart_toy</span>}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {new Date(comment.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                                                    {comment.content}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {comments.length === 0 && (
                                    <div className="text-xs text-muted-foreground italic">No comments yet.</div>
                                )}
                            </div>

                            {canEdit && (
                                <div className="flex gap-3">
                                    <textarea
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                        placeholder="Add a comment or update..."
                                        className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring transition-colors min-h-[60px]"
                                    />
                                    <button 
                                        type="button"
                                        onClick={handlePostComment}
                                        disabled={!newComment.trim() || isPostingComment}
                                        className="self-end bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4 py-2 rounded-sm transition-colors disabled:opacity-50 whitespace-nowrap"
                                    >
                                        {isPostingComment ? 'Posting...' : 'Post'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
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
        id: board.id.toString(),
        data: {
            type: 'Board',
            board
        },
        disabled: !canEdit
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
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

const DraggableTask = ({ task, onClick }: { task: Task; onClick: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: task.id.toString(),
      data: {
          type: 'Task',
          task
      }
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
  
const DroppableColumn = ({ column, user_permissions, canEdit, onRename, onDelete, children }: { column: ColumnProps; user_permissions: any; canEdit: boolean; onRename: (id: number, title: string) => void; onDelete: (id: number) => void; children: React.ReactNode }) => {
    const { isOver, setNodeRef: setDroppableRef } = useDroppable({
      id: column.id,
      data: {
          type: 'Column',
          column
      }
    });

    const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({
        id: column.id,
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
      opacity: isDragging ? 0.5 : 1,
    };
  
    return (
      <div 
          ref={(node) => {
              setSortableRef(node);
              setDroppableRef(node);
          }} 
          style={style}
          className={`flex-1 min-w-[280px] max-w-[320px] flex flex-col gap-4 rounded-lg p-2 transition-colors ${isOver ? 'bg-accent/50' : ''} ${column.id === 'done' && !user_permissions.can_move_to_done ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center justify-between px-1 group/header">
            <div className="flex items-center gap-2 flex-1">
                {canEdit && (
                    <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5">
                        <span className="material-icons text-[16px]">drag_indicator</span>
                    </div>
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
                        onDoubleClick={() => canEdit && setIsEditing(true)}
                        className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 cursor-text"
                    >
                      {column.title}
                      {column.title.toLowerCase().includes('done') && !user_permissions.can_move_to_done && (
                          <span className="material-icons text-[12px]" title="Restricted Access">lock</span>
                      )}
                    </h3>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">{column.tasks.length}</span>
                {canEdit && !isEditing && (
                    <button 
                        onClick={() => onDelete(column.db_id)}
                        className="opacity-0 group-hover/header:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    >
                        <span className="material-icons text-[14px]">delete_outline</span>
                    </button>
                )}
            </div>
        </div>
        
        <div className="flex flex-col gap-2 overflow-y-auto pb-8 scrollbar-hide min-h-[150px]">
          {children}
        </div>
      </div>
    );
};

export default KanbanBoard;