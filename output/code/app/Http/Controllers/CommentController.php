<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CommentController extends Controller
{
    public function index(Task $task)
    {
        return $task->comments()->with('user:id,name')->orderBy('created_at', 'asc')->get();
    }

    public function store(Request $request, Task $task)
    {
        Gate::authorize('create', [Comment::class, $task]);

        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $comment = $task->comments()->create([
            'content' => $validated['content'],
            'user_id' => auth()->id(),
        ]);

        return response()->json($comment->load('user:id,name'), 201);
    }
}
