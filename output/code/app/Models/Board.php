<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['project_id', 'name', 'is_default', 'order'])]
class Board extends Model
{
    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function columns()
    {
        return $this->hasMany(BoardColumn::class)->orderBy('order');
    }
}
