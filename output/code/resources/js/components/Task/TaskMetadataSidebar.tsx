import React from 'react';
import Select from 'react-select';

interface User {
    id: number;
    name: string;
    email: string;
}

interface ColumnProps {
    id: string;
    db_id: number;
    title: string;
}

interface Props {
    data: any;
    setData: (key: string, value: any) => void;
    columns: ColumnProps[];
    project_members: User[];
    canEdit: boolean;
    errors: any;
}

const labelOptions = [
    { value: 'bug', label: 'Bug' },
    { value: 'feature', label: 'Feature' },
    { value: 'enhancement', label: 'Enhancement' },
    { value: 'backend', label: 'Backend' },
    { value: 'frontend', label: 'Frontend' },
    { value: 'design', label: 'Design' },
    { value: 'urgent', label: 'Urgent' },
];

const TaskMetadataSidebar = ({ data, setData, columns, project_members, canEdit, errors }: Props) => {
    
    const customStyles = {
        control: (base: any, state: any) => ({
            ...base,
            backgroundColor: 'hsl(var(--background))',
            borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--border))',
            fontSize: '0.75rem',
            minHeight: '32px',
            borderRadius: '0.125rem',
            boxShadow: 'none',
            '&:hover': {
                borderColor: 'hsl(var(--ring))',
            },
        }),
        menu: (base: any) => ({
            ...base,
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            fontSize: '0.75rem',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            zIndex: 9999,
        }),
        menuList: (base: any) => ({
            ...base,
            padding: '4px',
        }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isSelected 
                ? 'hsl(var(--primary))' 
                : state.isFocused 
                    ? 'hsl(var(--accent))' 
                    : 'transparent',
            color: state.isSelected 
                ? 'hsl(var(--primary-foreground))' 
                : state.isFocused 
                    ? 'hsl(var(--accent-foreground))' 
                    : 'hsl(var(--foreground))',
            borderRadius: '0.125rem',
            cursor: 'pointer',
            padding: '6px 10px',
            fontSize: '0.75rem',
            '&:active': {
                backgroundColor: 'hsl(var(--accent))',
            },
        }),
        multiValue: (base: any) => ({
            ...base,
            backgroundColor: 'hsl(var(--accent))',
            borderRadius: '9999px',
            paddingLeft: '4px',
        }),
        multiValueLabel: (base: any) => ({
            ...base,
            color: 'hsl(var(--accent-foreground))',
            fontSize: '10px',
            fontWeight: '600',
            padding: '1px 6px',
        }),
        multiValueRemove: (base: any) => ({
            ...base,
            color: 'hsl(var(--accent-foreground))',
            cursor: 'pointer',
            '&:hover': {
                backgroundColor: 'transparent',
                color: 'hsl(var(--destructive))',
            },
        }),
        placeholder: (base: any) => ({
            ...base,
            color: 'hsl(var(--muted-foreground))',
        }),
        input: (base: any) => ({
            ...base,
            color: 'hsl(var(--foreground))',
        }),
        singleValue: (base: any) => ({
            ...base,
            color: 'hsl(var(--foreground))',
        }),
        menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
    };

    return (
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

                <div className="grid grid-cols-3 items-start gap-4">
                    <label htmlFor="task-labels" className="text-xs text-muted-foreground col-span-1 pt-2">Labels</label>
                    <div className="col-span-2">
                        <Select
                            inputId="task-labels"
                            isMulti
                            styles={customStyles}
                            options={labelOptions}
                            value={labelOptions.filter(opt => data.labels?.includes(opt.value))}
                            onChange={(selected) => setData('labels', selected ? selected.map(s => s.value) : [])}
                            isDisabled={!canEdit}
                            placeholder="Add labels..."
                            className="text-xs"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            menuPosition="fixed"
                            classNamePrefix="react-select"
                        />
                    </div>
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
                        value={data.story_points || ''}
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
                        value={data.start_date || ''}
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
                        value={data.due_date || ''}
                        onChange={e => setData('due_date', e.target.value)}
                        disabled={!canEdit}
                        className="col-span-2 w-full bg-background border border-border rounded-sm px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring transition-colors disabled:opacity-50"
                    />
                </div>
            </div>
        </div>
    );
};

export default TaskMetadataSidebar;
