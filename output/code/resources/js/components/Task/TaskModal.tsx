import React, { FormEvent, useCallback, useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { useDropzone } from 'react-dropzone';
import TaskDescriptionEditor from './TaskDescriptionEditor';
import TaskMetadataSidebar from './TaskMetadataSidebar';
import TaskChecklist from './TaskChecklist';
import TaskComments from './TaskComments';
import MoveTaskDialog from './MoveTaskDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface User {
    id: number;
    name: string;
    email: string;
}

interface Project {
    id: number;
    name: string;
    key: string;
}

interface Board {
    id: number;
    name: string;
}

interface Task {
    id: number;
    formatted_id: string;
    title: string;
    description: string;
    priority: string;
    assignee_id: number | string;
    start_date: string;
    due_date: string;
    story_points: number;
    labels: string[];
    checklists: any[];
    comments: any[];
}

interface ColumnProps {
    id: string;
    db_id: number;
    title: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    initialColumnIdForCreate?: number | null;
    current_project: Project;
    active_board: Board;
    columns: ColumnProps[];
    project_members: User[];
    canEdit: boolean;
    canDelete: boolean;
}

const TaskModal = ({ 
    isOpen, 
    onClose, 
    task, 
    initialColumnIdForCreate, 
    current_project, 
    active_board, 
    columns, 
    project_members, 
    canEdit, 
    canDelete 
}: Props) => {
    const { auth, available_projects = [] } = usePage<any>().props;
    const isEditMode = !!task;
    
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

    const taskColId = task ? columns.find(c => (c as any).tasks?.some((t: any) => t.id === task.id))?.db_id : null;
    const finalInitialColId = taskColId || initialColumnIdForCreate || columns[0]?.db_id || '';

    const { data, setData, post, patch, delete: destroy, processing, errors } = useForm({
        title: task?.title || '',
        description: task?.description || '',
        priority: task?.priority || 'medium',
        assignee_id: task?.assignee_id || '',
        project_id: task?.project_id || current_project.id,
        board_id: task?.board_id || active_board.id,
        board_column_id: finalInitialColId,
        start_date: formatDate(task?.start_date),
        due_date: formatDate(task?.due_date),
        story_points: task?.story_points || 0,
        labels: task?.labels || [],
    });

    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        alert(`File upload simulation: ${acceptedFiles[0].name}. (Backend endpoint ready in AttachmentController)`);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            <div className="relative bg-white border-l border-border shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] w-full sm:w-[800px] md:w-[900px] h-full flex flex-col overflow-hidden animate-in slide-in-from-right">
                <header className="px-8 py-5 border-b border-border flex justify-between items-center bg-white">
                    <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-3 flex-1">
                        {isEditMode ? (
                            <>
                                <span className="text-primary bg-primary/5 px-2 py-0.5 rounded text-xs font-mono">{task.formatted_id}</span>
                                <input
                                    type="text"
                                    value={data.title}
                                    onChange={e => setData('title', e.target.value)}
                                    disabled={!canEdit}
                                    className="bg-transparent border-none focus:ring-0 text-xl font-bold text-foreground w-full p-0 tracking-tight"
                                    placeholder="Task Title"
                                />
                            </>
                        ) : 'Create New Task'}
                    </h2>
                    <div className="flex items-center gap-2">
                        {isEditMode && canEdit && (
                            <button 
                                type="button"
                                onClick={() => setIsMoveModalOpen(true)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-sm hover:bg-muted flex items-center gap-1 text-xs font-medium"
                                title="Move Task"
                            >
                                <span className="material-icons text-[14px]">shortcut</span>
                                <span className="hidden sm:inline">Move</span>
                            </button>
                        )}
                        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-sm hover:bg-muted" title="Close">
                            <span className="material-icons">close</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden">
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

                            <TaskDescriptionEditor 
                                content={data.description}
                                onChange={(html) => setData('description', html)}
                                canEdit={canEdit}
                            />

                            {/* ATTACHMENTS PREVIEW */}
                            <div className="space-y-1.5">
                                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                                    <span className="material-icons text-[16px] text-muted-foreground">attach_file</span>
                                    Attachments
                                </h3>
                                <div 
                                    {...getRootProps()} 
                                    className={`border-2 border-dashed border-border rounded-lg bg-muted/10 p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${isDragActive ? 'bg-primary/5 border-primary' : 'hover:bg-muted/20 hover:border-primary/50'}`}
                                >
                                    <input {...getInputProps()} />
                                    <span className="material-icons text-[24px] text-muted-foreground mb-2">cloud_upload</span>
                                    <span className="text-sm text-muted-foreground">Drag & drop files or click to browse</span>
                                </div>
                            </div>

                            {isEditMode && task && (
                                <>
                                    <TaskChecklist 
                                        taskId={task.id}
                                        checklists={task.checklists || []}
                                        canEdit={canEdit}
                                    />
                                    
                                    <div className="mt-8 pt-6 border-t border-border">
                                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                                            <span className="material-icons text-[16px] text-muted-foreground">forum</span>
                                            Communication
                                        </h3>
                                        <TaskComments 
                                            taskId={task.id}
                                            initialComments={task.comments || []}
                                            authUser={auth}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* METADATA SIDEBAR */}
                        <TaskMetadataSidebar 
                            data={data}
                            setData={setData}
                            columns={columns}
                            project_members={project_members}
                            canEdit={canEdit}
                            errors={errors}
                        />
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
            
            {isEditMode && task && (
                <MoveTaskDialog 
                    isOpen={isMoveModalOpen}
                    onClose={() => setIsMoveModalOpen(false)}
                    taskId={task.id}
                    currentProject={current_project}
                    currentBoard={active_board}
                    currentColumnId={finalInitialColId}
                    availableProjects={available_projects}
                />
            )}
        </div>
    );
};

export default TaskModal;
