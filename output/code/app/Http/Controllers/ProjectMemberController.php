<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectMemberController extends Controller
{
    use AuthorizesRequests;

    public function store(Request $request, Project $project)
    {
        $this->authorize('update', $project); // Requires Manager role

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => ['required', Rule::in(['Manager', 'Contributor', 'Viewer'])],
        ]);

        if (! $project->users->contains($validated['user_id'])) {
            $project->users()->attach($validated['user_id'], ['project_role' => $validated['role']]);
        }

        return redirect()->back()->with('success', 'Member added successfully.');
    }

    public function update(Request $request, Project $project, User $user)
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'role' => ['required', Rule::in(['Manager', 'Contributor', 'Viewer'])],
        ]);

        // Prevent removing the last Manager
        if ($validated['role'] !== 'Manager' && $project->users()->wherePivot('project_role', 'Manager')->count() === 1 && $project->users()->wherePivot('project_role', 'Manager')->first()->id === $user->id) {
            return redirect()->back()->withErrors(['role' => 'Cannot change the role of the last Manager.']);
        }

        $project->users()->updateExistingPivot($user->id, ['project_role' => $validated['role']]);

        return redirect()->back()->with('success', 'Member role updated successfully.');
    }

    public function destroy(Project $project, User $user)
    {
        $this->authorize('update', $project);

        // Prevent removing the last Manager
        if ($project->users()->wherePivot('project_role', 'Manager')->count() === 1 && $project->users()->wherePivot('project_role', 'Manager')->first()->id === $user->id) {
            return redirect()->back()->withErrors(['user' => 'Cannot remove the last Manager.']);
        }

        $project->users()->detach($user->id);

        return redirect()->back()->with('success', 'Member removed successfully.');
    }
}
