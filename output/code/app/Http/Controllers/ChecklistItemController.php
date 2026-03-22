<?php

namespace App\Http\Controllers;

use App\Models\Checklist;
use App\Models\ChecklistItem;
use Illuminate\Http\Request;

class ChecklistItemController extends Controller
{
    public function store(Request $request, Checklist $checklist)
    {
        // Add basic auth check
        if (! $checklist->task->project->users->contains(auth()->id()) && ! auth()->user()->hasRole('Admin')) {
            abort(403);
        }

        $request->validate([
            'content' => 'required|string|max:255',
        ]);

        $position = $checklist->items()->max('position') + 1;

        $item = $checklist->items()->create([
            'content' => $request->content,
            'position' => $position,
        ]);

        return response()->json($item, 201);
    }

    public function update(Request $request, ChecklistItem $item)
    {
        if (! $item->checklist->task->project->users->contains(auth()->id()) && ! auth()->user()->hasRole('Admin')) {
            abort(403);
        }

        $request->validate([
            'is_completed' => 'required|boolean',
        ]);

        $item->update(['is_completed' => $request->is_completed]);

        return response()->json($item);
    }

    public function destroy(ChecklistItem $item)
    {
        if (! $item->checklist->task->project->users->contains(auth()->id()) && ! auth()->user()->hasRole('Admin')) {
            abort(403);
        }

        $item->delete();

        return response()->noContent();
    }
}
