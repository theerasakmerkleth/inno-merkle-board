<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;

class ChecklistController extends Controller
{
    public function store(Request $request, Task $task)
    {
        if (! $task->project->users->contains(auth()->id()) && ! auth()->user()->hasRole('Admin')) {
            abort(403);
        }

        $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $checklist = $task->checklists()->create($request->only('title'));

        return response()->json($checklist->load('items'), 201);
    }
}
