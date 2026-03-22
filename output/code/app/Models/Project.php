<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['key', 'name', 'status', 'task_sequence'])]
class Project extends Model
{
    public function users()
    {
        return $this->belongsToMany(User::class)
            ->withPivot('project_role')
            ->withTimestamps();
    }

    public function boards()
    {
        return $this->hasMany(Board::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }
}
