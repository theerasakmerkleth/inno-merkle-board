<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // create permissions
        Permission::create(['name' => 'manage_users']);
        Permission::create(['name' => 'create_projects']);
        Permission::create(['name' => 'view_all_projects']);

        // create roles and assign created permissions
        $roleAdmin = Role::create(['name' => 'Admin']);
        $roleAdmin->givePermissionTo(Permission::all());

        $rolePM = Role::create(['name' => 'Project Manager']);
        $rolePM->givePermissionTo(['create_projects']);

        $roleDev = Role::create(['name' => 'Developer']);
        $roleQA = Role::create(['name' => 'QA']);
        $roleAgent = Role::create(['name' => 'AI Agent']);
    }
}
