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
            'users' => User::all(['id', 'name', 'email']),
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
            'business_domain' => 'nullable|string|max:255',
            'visibility' => ['required', Rule::in(['public', 'private'])],
            'member_ids' => 'nullable|array',
            'member_ids.*' => 'exists:users,id',
            'auto_provision' => 'boolean',
        ]);

        $project = DB::transaction(function () use ($validated, $request) {
            $project = Project::create([
                'name' => $validated['name'],
                'key' => $validated['key'],
                'status' => 'active',
                'visibility' => $validated['visibility'],
                'business_domain' => $validated['business_domain'] ?? null,
                'ai_model' => 'gemini-1.5-flash', // Default for new projects
            ]);

            // Add creator as Manager
            $project->users()->attach($request->user()->id, ['project_role' => 'Manager']);

            // Add initial members if provided
            if (!empty($validated['member_ids'])) {
                $members = array_unique($validated['member_ids']);
                // Ensure creator is not added again
                $members = array_diff($members, [$request->user()->id]);
                foreach ($members as $userId) {
                    $project->users()->attach($userId, ['project_role' => 'Contributor']);
                }
            }

            // Provision Boards
            if ($validated['auto_provision'] ?? false) {
                $standardBoards = ['Backlog', 'Sprint Board', 'Bug Triage'];
                foreach ($standardBoards as $index => $boardName) {
                    Board::create([
                        'project_id' => $project->id,
                        'name' => $boardName,
                        'is_default' => $index === 0,
                    ]);
                }
            } else {
                // Create default Main Board
                Board::create([
                    'project_id' => $project->id,
                    'name' => 'Main Board',
                    'is_default' => true,
                ]);
            }

            return $project;
        });

        return redirect()->route('projects.board', ['project_key' => $project->key])->with('success', 'Project provisioned successfully.');
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
            'business_domain' => 'nullable|string|max:255',
            'ai_instructions' => 'nullable|string',
            'ai_model' => ['required', Rule::in(['gemini-3.1-pro-preview', 'gemini-1.5-pro', 'gemini-1.5-flash'])],
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

    public function structure(Project $project)
    {
        // Allow if user is part of the project or admin
        if (! $project->users->contains(auth()->id()) && ! auth()->user()->hasRole('Admin')) {
            abort(403);
        }

        $project->load(['boards.columns' => function ($query) {
            $query->orderBy('order');
        }]);

        return response()->json([
            'boards' => $project->boards->map(function ($board) {
                return [
                    'id' => $board->id,
                    'name' => $board->name,
                    'columns' => $board->columns->map(function ($col) {
                        return [
                            'id' => $col->id,
                            'title' => $col->title
                        ];
                    })
                ];
            })
        ]);
    }
}
