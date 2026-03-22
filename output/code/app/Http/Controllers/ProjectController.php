<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProjectController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $user = $request->user();
        
        $projects = $user->hasRole('Admin') 
            ? Project::withCount('users')->orderBy('order')->get() 
            : $user->projects()->withCount('users')->orderBy('order')->get();

        return Inertia::render('Projects/Index', [
            'projects' => $projects,
        ]);
    }

    public function reorder(Request $request)
    {
        $request->validate([
            'project_ids' => 'required|array',
            'project_ids.*' => 'required|integer|exists:projects,id',
        ]);

        $projectIds = $request->project_ids;

        DB::transaction(function () use ($projectIds) {
            foreach ($projectIds as $index => $id) {
                Project::where('id', $id)->update(['order' => $index]);
            }
        });

        return redirect()->back();
    }

    public function store(Request $request)
    {
        $this->authorize('create', Project::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'key' => 'required|string|min:2|max:5|uppercase|unique:projects,key',
        ]);

        $project = DB::transaction(function () use ($validated, $request) {
            $project = Project::create([
                'name' => $validated['name'],
                'key' => $validated['key'],
                'status' => 'active',
            ]);

            // Add creator as Manager
            $project->users()->attach($request->user()->id, ['project_role' => 'Manager']);

            // Create default Main Board
            Board::create([
                'project_id' => $project->id,
                'name' => 'Main Board',
                'is_default' => true,
            ]);

            return $project;
        });

        return redirect()->route('projects.board', ['project_key' => $project->key])->with('success', 'Project created successfully.');
    }

    public function edit(Request $request, $project_key)
    {
        $project = Project::where('key', $project_key)->firstOrFail();
        $this->authorize('update', $project);

        $members = $project->users()->select('users.id', 'users.name', 'users.email', 'project_user.project_role')->get();
        // Get all workspace users who are NOT in the project yet
        $availableUsers = User::whereNotIn('id', $members->pluck('id'))->select('id', 'name', 'email')->get();

        return Inertia::render('Projects/Settings', [
            'project' => $project,
            'members' => $members,
            'available_users' => $availableUsers,
            'auth' => ['user' => $request->user()],
        ]);
    }

    public function update(Request $request, Project $project)
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'status' => ['required', Rule::in(['active', 'archived'])],
        ]);

        $project->update($validated);

        return redirect()->back()->with('success', 'Project updated successfully.');
    }

    public function destroy(Project $project)
    {
        $this->authorize('delete', $project);

        $project->delete(); // Cascades to boards and tasks

        return redirect('/')->with('success', 'Project deleted successfully.');
    }
}
