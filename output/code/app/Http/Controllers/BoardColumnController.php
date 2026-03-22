<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\BoardColumn;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BoardColumnController extends Controller
{
    public function store(Request $request, Board $board)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $maxOrder = $board->columns()->max('order') ?? -1;

        $board->columns()->create([
            'title' => $validated['title'],
            'order' => $maxOrder + 1,
        ]);

        return redirect()->back();
    }

    public function update(Request $request, BoardColumn $column)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $column->update(['title' => $validated['title']]);

        return redirect()->back();
    }

    public function destroy(BoardColumn $column)
    {
        $board = $column->board;

        if ($board->columns()->count() <= 1) {
            return redirect()->back()->withErrors(['column' => 'A board must have at least one column.']);
        }

        DB::transaction(function () use ($column, $board) {
            // Move tasks to the first available column
            $fallbackColumn = $board->columns()->where('id', '!=', $column->id)->orderBy('order')->first();
            
            $column->tasks()->update(['board_column_id' => $fallbackColumn->id]);
            
            $column->delete();
        });

        return redirect()->back();
    }

    public function reorder(Request $request, Board $board)
    {
        $request->validate([
            'column_ids' => 'required|array',
            'column_ids.*' => 'required|integer|exists:board_columns,id',
        ]);

        $columnIds = $request->column_ids;

        DB::transaction(function () use ($columnIds) {
            foreach ($columnIds as $index => $id) {
                BoardColumn::where('id', $id)->update(['order' => $index]);
            }
        });

        return redirect()->back();
    }
}
