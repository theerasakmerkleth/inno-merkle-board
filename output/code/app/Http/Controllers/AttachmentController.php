<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AttachmentController extends Controller
{
    public function store(Request $request, Task $task)
    {
        // Simple auth check for MVP
        if (! $task->project->users->contains(auth()->id()) && ! auth()->user()->hasRole('Admin')) {
            abort(403);
        }

        $request->validate([
            'file' => 'required|file|max:10240|mimes:jpg,jpeg,png,pdf,doc,docx,csv', // 10MB
        ]);

        $file = $request->file('file');
        $path = $file->store('attachments', 'public'); // Using public disk for MVP

        $attachment = $task->attachments()->create([
            'user_id' => auth()->id(),
            'filename' => $file->getClientOriginalName(),
            'path' => $path,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);

        return response()->json($attachment, 201);
    }

    public function destroy(Attachment $attachment)
    {
        if ($attachment->user_id !== auth()->id() && ! auth()->user()->hasRole('Admin')) {
            abort(403);
        }

        Storage::disk('public')->delete($attachment->path);
        $attachment->delete();

        return response()->noContent();
    }
}
