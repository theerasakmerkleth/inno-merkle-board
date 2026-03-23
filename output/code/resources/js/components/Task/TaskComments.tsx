import React, { useState, useEffect } from 'react';

interface User {
    id: number;
    name: string;
}

interface Comment {
    id: number;
    content: string;
    created_at: string;
    user: User;
}

interface Props {
    taskId: number;
    initialComments: Comment[];
    authUser: any;
}

const TaskComments = ({ taskId, initialComments, authUser }: Props) => {
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [newComment, setNewComment] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (taskId) {
            fetch(`/tasks/${taskId}/comments`)
                .then(res => {
                    if (!res.ok) throw new Error('Failed to fetch comments');
                    return res.json();
                })
                .then(data => setComments(data))
                .catch(err => console.error(err));
        }
    }, [taskId]);

    const handlePostComment = () => {
        if (!newComment.trim() || !taskId) return;
        
        setIsPostingComment(true);
        setError(null);

        fetch(`/tasks/${taskId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
            },
            body: JSON.stringify({ content: newComment })
        })
        .then(async res => {
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to post comment');
            }
            return data;
        })
        .then(data => {
            setComments([...comments, data]);
            setNewComment('');
        })
        .catch(err => {
            setError(err.message);
            alert(`Error: ${err.message}`);
        })
        .finally(() => setIsPostingComment(false));
    };

    return (
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
                    {authUser?.user?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 space-y-2">
                    <textarea 
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Add a comment or update..." 
                        className={`w-full bg-background border ${error ? 'border-destructive' : 'border-border'} rounded-sm px-3 py-2 text-sm text-foreground focus:outline-none focus:border-ring transition-colors min-h-[60px]`}
                    />
                    {error && <p className="text-[10px] text-destructive">{error}</p>}
                </div>
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
    );
};

export default TaskComments;
