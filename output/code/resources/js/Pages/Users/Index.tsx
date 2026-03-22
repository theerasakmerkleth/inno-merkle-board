import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  role: string;
}

interface Project {
  id: number;
  key: string;
  name: string;
}

interface PageProps {
  users: User[];
  roles: string[];
  available_projects?: Project[];
}

export default function UserManagement({ users, roles, available_projects }: PageProps) {
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  const handleRoleChange = (userId: number, newRole: string) => {
    router.patch(`/users/${userId}/role`, { role: newRole }, { preserveScroll: true });
    setMenuOpen(null);
  };

  const handleToggleActive = (userId: number) => {
    router.patch(`/users/${userId}/toggle`, {}, { preserveScroll: true });
    setMenuOpen(null);
  };

  return (
    <AppLayout breadcrumbs={<span>User Management</span>} available_projects={available_projects}>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background flex flex-col">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">User Management</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage workspace members, roles, and access controls.</p>
            </div>
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-sm text-sm transition-colors shadow-sm flex items-center gap-1.5">
                <span className="material-icons text-[16px]">person_add</span>
                Invite User
            </button>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden w-full">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Global Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-accent transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium">
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{user.name}</div>
                          <div className="text-muted-foreground text-[11px] font-mono mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground">{user.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-muted-foreground'}`}></span>
                        <span className={`text-[11px] ${user.is_active ? 'text-emerald-500/80' : 'text-muted-foreground'}`}>
                          {user.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right relative">
                      <button 
                        onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                        className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="material-icons text-sm">more_horiz</span>
                      </button>

                      {/* Minimal Context Menu */}
                      {menuOpen === user.id && (
                        <div className="absolute right-8 top-8 w-48 bg-card border border-border rounded-sm shadow-xl z-10 py-1 text-left">
                          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Change Role</div>
                          {roles.map(r => (
                             <button key={r} onClick={() => handleRoleChange(user.id, r)} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${user.role === r ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                               {r}
                             </button>
                          ))}
                          <div className="h-px bg-border my-1"></div>
                          <button onClick={() => handleToggleActive(user.id)} className="w-full text-left px-3 py-1.5 text-xs text-destructive hover:bg-accent hover:text-destructive transition-colors">
                            {user.is_active ? 'Revoke Access' : 'Enable Access'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}