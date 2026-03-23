import React, { useState } from 'react';
import { router } from '@inertiajs/react';

interface ChecklistItem {
    id: number;
    content: string;
    is_completed: boolean;
}

interface Checklist {
    id: number;
    title: string;
    items: ChecklistItem[];
}

interface Props {
    taskId: number;
    checklists: Checklist[];
    canEdit: boolean;
}

const TaskChecklist = ({ taskId, checklists, canEdit }: Props) => {
    const [newChecklistItem, setNewChecklistItem] = useState('');
    
    const activeChecklist = checklists && checklists.length > 0 ? checklists[0] : null;

    const handleAddChecklistItem = () => {
        if (!newChecklistItem.trim() || !activeChecklist) return;
        router.post(`/checklists/${activeChecklist.id}/items`, {
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
        router.post(`/tasks/${taskId}/checklists`, {
            title: 'Sub-tasks'
        }, { preserveScroll: true });
    };

    return (
        <div className="pt-6 border-t border-border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="material-icons text-[16px] text-muted-foreground">checklist</span>
                    Sub-tasks
                </h3>
                {!activeChecklist ? (
                    canEdit && (
                        <button 
                            type="button"
                            onClick={handleCreateChecklist}
                            className="text-[10px] uppercase font-bold text-primary hover:underline"
                        >
                            + Add Checklist
                        </button>
                    )
                ) : (
                    <span className="text-xs text-muted-foreground">
                        {activeChecklist.items.filter(i => i.is_completed).length} / {activeChecklist.items.length}
                    </span>
                )}
            </div>
            
            {activeChecklist && (
                <>
                    {/* Progress bar */}
                    <div className="w-full bg-muted rounded-full h-1 mb-6 overflow-hidden">
                        <div 
                            className="bg-primary h-1 rounded-full transition-all duration-500" 
                            style={{ 
                                width: `${activeChecklist.items.length > 0 
                                    ? (activeChecklist.items.filter(i => i.is_completed).length / activeChecklist.items.length) * 100 
                                    : 0}%` 
                            }}
                        ></div>
                    </div>

                    <div className="space-y-3 mb-6">
                        {activeChecklist.items.map(item => (
                            <div key={item.id} className="flex items-center gap-3 group/item">
                                <button 
                                    type="button"
                                    onClick={() => handleToggleChecklistItem(item.id, item.is_completed)}
                                    disabled={!canEdit}
                                    className={`h-4 w-4 rounded-sm border flex items-center justify-center transition-colors ${item.is_completed ? 'bg-primary border-primary text-white' : 'border-border hover:border-primary'} ${!canEdit ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                    {item.is_completed && <span className="material-icons text-[12px]">check</span>}
                                </button>
                                <span className={`text-sm flex-1 ${item.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                    {item.content}
                                </span>
                                {canEdit && (
                                    <button 
                                        type="button"
                                        onClick={() => handleDeleteChecklistItem(item.id)}
                                        className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                                    >
                                        <span className="material-icons text-[14px]">delete_outline</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {canEdit && (
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newChecklistItem}
                                onChange={e => setNewChecklistItem(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                                placeholder="Add a sub-task..." 
                                className="flex-1 bg-background border border-border rounded-sm px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-ring transition-colors"
                            />
                            <button 
                                type="button"
                                onClick={handleAddChecklistItem}
                                disabled={!newChecklistItem.trim()}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-sm text-xs font-bold transition-colors disabled:opacity-50"
                            >
                                Add
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TaskChecklist;
