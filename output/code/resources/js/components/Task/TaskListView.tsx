import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface User {
    id: number;
    name: string;
    avatar_url?: string;
}

interface Task {
    id: number;
    formatted_id: string;
    title: string;
    status: string;
    priority: string;
    assignee: User | null;
    due_date: string | null;
    story_points: number;
}

interface Column {
    id: string;
    db_id: number;
    title: string;
    tasks: Task[];
}

interface Props {
    columns: Column[];
    onTaskClick: (task: Task) => void;
}

export function TaskListView({ columns, onTaskClick }: Props) {
    const allTasks = columns.flatMap(col => col.tasks.map(task => ({
        ...task,
        columnTitle: col.title
    })));

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'highest': return { icon: 'keyboard_double_arrow_up', color: 'text-red-600' };
            case 'high': return { icon: 'keyboard_arrow_up', color: 'text-red-500' };
            case 'low': return { icon: 'keyboard_arrow_down', color: 'text-blue-400' };
            case 'lowest': return { icon: 'keyboard_double_arrow_down', color: 'text-blue-300' };
            default: return { icon: 'drag_handle', color: 'text-zinc-300' };
        }
    };

    if (allTasks.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-40">
                <span className="material-icons text-[48px] mb-4">view_list</span>
                <p className="text-sm font-bold uppercase tracking-widest">No tasks found in this board</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto bg-background px-8 py-4">
            <div className="max-w-7xl mx-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-zinc-100">
                            <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 w-24">Key</th>
                            <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Subject</th>
                            <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 w-32">Status</th>
                            <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 w-20 text-center">Pri</th>
                            <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 w-40">Assignee</th>
                            <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 w-32">Due Date</th>
                            <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 w-16">Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allTasks.map(task => {
                            const prio = getPriorityIcon(task.priority);
                            return (
                                <tr 
                                    key={task.id} 
                                    onClick={() => onTaskClick(task)}
                                    className="group border-b border-zinc-50 hover:bg-primary/[0.02] transition-colors cursor-pointer"
                                >
                                    <td className="py-3 px-4">
                                        <span className="font-mono text-[10px] text-zinc-400 font-bold group-hover:text-primary transition-colors">
                                            {task.formatted_id}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="text-sm font-semibold text-zinc-900 group-hover:text-primary transition-colors leading-tight">
                                            {task.title}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                                            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-tighter">
                                                {task.columnTitle}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`material-icons text-[18px] ${prio.color}`} title={task.priority}>
                                            {prio.icon}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2.5">
                                            <Avatar className="h-5 w-5 border border-zinc-100">
                                                {task.assignee?.avatar_url ? (
                                                    <AvatarImage src={task.assignee.avatar_url} />
                                                ) : (
                                                    <AvatarFallback className="bg-zinc-50 text-zinc-400 text-[8px] font-black">
                                                        {task.assignee?.name?.substring(0, 2).toUpperCase() || '--'}
                                                    </AvatarFallback>
                                                )}
                                            </Avatar>
                                            <span className="text-xs font-medium text-zinc-600 truncate max-w-[100px]">
                                                {task.assignee?.name || 'Unassigned'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`text-[11px] font-mono ${task.due_date ? 'text-zinc-500' : 'text-zinc-300 italic'}`}>
                                            {task.due_date || 'No date'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <span className="text-[11px] font-mono font-bold text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded">
                                            {task.story_points || '0'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
