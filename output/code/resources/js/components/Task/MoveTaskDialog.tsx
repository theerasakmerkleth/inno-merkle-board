import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';

interface Project {
    id: number;
    name: string;
    key: string;
}

interface Board {
    id: number;
    name: string;
}

interface ColumnProps {
    id: string;
    db_id: number;
    title: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    taskId: number;
    currentProject: Project;
    currentBoard: Board;
    currentColumnId: number | string;
    availableProjects: Project[];
}

const MoveTaskDialog = ({ isOpen, onClose, taskId, currentProject, currentBoard, currentColumnId, availableProjects }: Props) => {
    const [selectedProjectId, setSelectedProjectId] = useState<number | string>(currentProject.id);
    const [selectedBoardId, setSelectedBoardId] = useState<number | string>(currentBoard.id);
    const [selectedColumnId, setSelectedColumnId] = useState<number | string>(currentColumnId);

    const [dynamicBoards, setDynamicBoards] = useState<any[]>([]);
    const [dynamicColumns, setDynamicColumns] = useState<ColumnProps[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isMoving, setIsMoving] = useState(false);

    // Fetch structure when project changes
    useEffect(() => {
        if (isOpen && selectedProjectId) {
            setIsLoading(true);
            const projectKey = availableProjects.find((p: any) => p.id == selectedProjectId)?.key;
            if (!projectKey) return;

            fetch(`/api/projects/${projectKey}/structure`)
                .then(res => res.json())
                .then(result => {
                    setDynamicBoards(result.boards);
                    if (result.boards.length > 0) {
                        // Keep current board selected if moving within same project, else pick first
                        const targetBoard = (selectedProjectId == currentProject.id) 
                            ? result.boards.find((b: any) => b.id == currentBoard.id) || result.boards[0]
                            : result.boards[0];
                        
                        setSelectedBoardId(targetBoard.id);
                        setDynamicColumns(targetBoard.columns);
                        
                        setSelectedColumnId(prevColId => {
                            if (targetBoard.columns.find((c: any) => c.id == prevColId)) {
                                return prevColId;
                            }
                            return targetBoard.columns[0]?.id || '';
                        });
                    } else {
                        setSelectedBoardId('');
                        setSelectedColumnId('');
                        setDynamicColumns([]);
                    }
                })
                .catch(err => {
                    console.error(err);
                    toast.error('Failed to load project structure.');
                })
                .finally(() => setIsLoading(false));
        }
    }, [selectedProjectId, isOpen]);

    // Update columns when board changes
    useEffect(() => {
        if (isOpen && selectedBoardId && dynamicBoards.length > 0) {
            const board = dynamicBoards.find(b => b.id == selectedBoardId);
            if (board) {
                setDynamicColumns(board.columns);
                setSelectedColumnId(prevColId => {
                    if (board.columns.find((c: any) => c.id == prevColId)) {
                        return prevColId;
                    }
                    if (board.columns.find((c: any) => c.id == currentColumnId)) {
                        return currentColumnId;
                    }
                    return board.columns[0]?.id || '';
                });
            }
        }
    }, [selectedBoardId, dynamicBoards, isOpen, currentColumnId]);

    const handleConfirm = () => {
        if (!selectedProjectId || !selectedBoardId || !selectedColumnId) {
            toast.error('Please select a complete destination.');
            return;
        }

        setIsMoving(true);
        const toastId = toast.loading('Moving task...');

        // Perform move using standard Inertia patch, but we might want to stay on the page if it's a cross-project move
        router.patch(`/tasks/${taskId}`, {
            project_id: selectedProjectId,
            board_id: selectedBoardId,
            board_column_id: selectedColumnId
        }, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Task moved successfully!', { id: toastId });
                onClose();
            },
            onError: () => {
                toast.error('Failed to move task. Check permissions.', { id: toastId });
                setIsMoving(false);
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative bg-card border border-border shadow-2xl w-full max-w-md rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <header className="px-6 py-4 border-b border-border bg-muted/10">
                    <h2 className="text-lg font-semibold text-foreground">Move Task</h2>
                    <p className="text-xs text-muted-foreground mt-1">Select a new destination for this task.</p>
                </header>

                <div className="p-6 space-y-4 relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                            <span className="material-icons animate-spin text-primary">autorenew</span>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Project</label>
                        <select 
                            value={selectedProjectId}
                            onChange={e => setSelectedProjectId(e.target.value)}
                            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring transition-colors"
                        >
                            {availableProjects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Board</label>
                        <select 
                            value={selectedBoardId}
                            onChange={e => setSelectedBoardId(e.target.value)}
                            disabled={dynamicBoards.length === 0}
                            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring transition-colors disabled:opacity-50"
                        >
                            {dynamicBoards.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Column (Status)</label>
                        <select 
                            value={selectedColumnId}
                            onChange={e => setSelectedColumnId(e.target.value)}
                            disabled={dynamicColumns.length === 0}
                            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring transition-colors disabled:opacity-50"
                        >
                            {dynamicColumns.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <footer className="px-6 py-4 border-t border-border bg-muted/10 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        disabled={isMoving}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground px-4 py-2 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={isMoving || isLoading || !selectedProjectId || !selectedBoardId || !selectedColumnId}
                        className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-6 py-2 rounded-sm transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                    >
                        {isMoving ? (
                            <>
                                <span className="material-icons animate-spin text-[14px]">autorenew</span>
                                Moving...
                            </>
                        ) : 'Confirm Move'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default MoveTaskDialog;
