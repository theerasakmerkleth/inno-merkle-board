<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['project_id', 'board_id', 'board_column_id', 'project_task_number', 'title', 'description', 'start_date', 'due_date', 'status', 'priority', 'assignee_id', 'reporter_id', 'story_points', 'labels', 'is_ai_assigned', 'requires_human_review'])]
class Task extends Model
{
    use HasFactory;

    protected $casts = [
        'start_date' => 'date',
        'due_date' => 'date',
        'is_ai_assigned' => 'boolean',
        'requires_human_review' => 'boolean',
        'labels' => 'array',
        'story_points' => 'float',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function board()
    {
        return $this->belongsTo(Board::class);
    }

    public function column()
    {
        return $this->belongsTo(BoardColumn::class, 'board_column_id');
    }

    public function dependencies()
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'task_id', 'blocked_by_id')
            ->withPivot('dependency_type')
            ->withTimestamps();
    }

    public function blockedTasks()
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'blocked_by_id', 'task_id')
            ->withPivot('dependency_type')
            ->withTimestamps();
    }

    public function attachments()
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function checklists()
    {
        return $this->hasMany(Checklist::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function aiAgentSubmissions()
    {
        return $this->hasMany(AiAgentSubmission::class);
    }

    public function getFormattedIdAttribute()
    {
        if ($this->project && $this->project_task_number) {
            return "{$this->project->key}-{$this->project_task_number}";
        }

        return "#{$this->id}";
    }
}
