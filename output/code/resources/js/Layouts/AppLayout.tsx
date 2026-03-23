import React, { useState, useEffect, ReactNode } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import { Command } from 'cmdk';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Toaster } from '@/components/ui/sonner';

interface Project {
  id: number;
  key: string;
  name: string;
}

interface AppLayoutProps {
  children: ReactNode;
  breadcrumbs?: ReactNode;
  available_projects?: Project[];
}

export default function AppLayout({ children, breadcrumbs }: AppLayoutProps) {
  const { auth, available_projects = [], appName } = usePage<{ auth: { user: { name: string } }, available_projects?: Project[], appName: string }>().props;
  const { url } = usePage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleLogout = () => {
    router.post('/logout');
  };

  const navLinks = [
    { name: 'My Tasks', href: '/', icon: 'inbox', active: url === '/' },
    { name: 'Dashboard', href: '/analytics', icon: 'bar_chart', active: url.startsWith('/analytics') },
    { name: 'User Management', href: '/users', icon: 'manage_accounts', active: url.startsWith('/users') },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* LEFT SIDEBAR */}
      <aside className={`w-64 border-r border-border flex flex-col flex-shrink-0 absolute inset-y-0 left-0 z-50 bg-card transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-200 ease-in-out`}>
        
        {/* Top Area: Brand & Workspace */}
        <div className="p-4 border-b border-border">
            <Link href="/" className="mb-6 flex items-center gap-2 px-1">
                <img src="/images/merkle-logo.png" alt="Merkle" className="h-6" />
                <span className="font-bold text-foreground text-sm tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{appName}</span>
            </Link>
            <nav className="space-y-1">
                {navLinks.map((link) => (
                    <Link 
                        key={link.name}
                        href={link.href} 
                        className={`flex items-center gap-3 px-3 py-2 text-sm rounded-sm transition-colors group ${
                            link.active 
                            ? 'bg-primary/10 text-primary font-medium' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                    >
                        <span className={`material-icons text-[16px] transition-colors ${link.active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                            {link.icon}
                        </span>
                        {link.name}
                    </Link>
                ))}
            </nav>
        </div>

        {/* Projects Section */}
        <div className="p-4 border-b border-border flex-1 overflow-y-auto">
            <div className="flex justify-between items-center mb-2 px-3">
                <Link href="/projects" className={`text-[10px] uppercase tracking-wider transition-colors font-medium ${url.startsWith('/projects') && !available_projects.some(p => url.includes(`/projects/${p.key}`)) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                    Projects
                </Link>
                {((auth?.user as any)?.role === 'Admin' || (auth?.user as any)?.role === 'Project Manager') && (
                    <Link href="/projects" className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center p-0.5 rounded-sm hover:bg-primary/10">
                        <span className="material-icons text-[14px]">add</span>
                    </Link>
                )}
            </div>
            {available_projects && available_projects.length > 0 && (
                <nav className="space-y-1 mt-3">
                    {available_projects.map(p => {
                        const isProjectActive = url.includes(`/projects/${p.key}`);
                        const userRole = (auth?.user as any)?.role;
                        const canManage = userRole === 'Admin' || userRole === 'Project Manager';
                        
                        return (
                            <Link 
                                key={p.id} 
                                href={`/projects/${p.key}/boards`}
                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors rounded-sm group ${
                                    isProjectActive 
                                    ? 'bg-primary/5 text-primary font-medium' 
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                <span className={`font-mono text-[10px] ${isProjectActive ? 'text-primary/70' : 'text-muted-foreground/70 group-hover:text-foreground/70'}`}>
                                    [{p.key}]
                                </span>
                                <span className="truncate flex-1">{p.name}</span>
                                {!canManage && <span className="material-icons text-[12px] opacity-40 group-hover:opacity-70">lock</span>}
                            </Link>
                        );
                    })}
                </nav>
            )}
        </div>

        {/* Bottom Area: User Profile */}
        <div className="mt-auto p-4 border-t border-border flex items-center justify-between bg-card hover:bg-muted/50 transition-colors">
             <div className="flex items-center gap-3 truncate">
                  <div className="h-8 w-8 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {auth.user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="text-sm font-medium text-foreground truncate leading-tight">{auth.user.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{(auth?.user as any)?.role || 'User'}</div>
                  </div>
             </div>
             <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive p-1.5 rounded-sm hover:bg-destructive/10 transition-colors flex-shrink-0 ml-2" title="Sign out">
                 <span className="material-icons text-[16px]">logout</span>
             </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Top App Bar */}
          <header className="h-14 px-4 md:px-8 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm z-10 flex-shrink-0">
              <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSidebarOpen(true)} 
                    className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
                  >
                      <span className="material-icons">menu</span>
                  </button>
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      {breadcrumbs || <span>Workspace</span>}
                  </div>
              </div>

              <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setCommandOpen(true)}
                    className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-muted border border-border rounded-md hover:bg-accent hover:text-foreground transition-colors w-64"
                  >
                      <span className="material-icons text-[14px]">search</span>
                      <span>Search or jump to...</span>
                      <kbd className="ml-auto font-sans text-[10px] bg-background border border-border text-muted-foreground px-1.5 py-0.5 rounded">⌘K</kbd>
                  </button>
                  <button 
                    onClick={() => setCommandOpen(true)}
                    className="md:hidden text-muted-foreground hover:text-foreground"
                  >
                      <span className="material-icons">search</span>
                  </button>
              </div>
          </header>
          
          {/* Content Body */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
              {children}
          </div>
      </main>

      {/* Command Palette */}
      {commandOpen && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[20vh] px-4" onClick={() => setCommandOpen(false)}>
              <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                  <Command className="w-full">
                      <div className="flex items-center px-4 border-b border-border">
                        <span className="material-icons text-muted-foreground mr-2">search</span>
                        <Command.Input 
                            placeholder="Type a command or search..." 
                            className="w-full bg-transparent border-0 py-4 text-sm text-foreground focus:outline-none placeholder:text-muted-foreground/70"
                            autoFocus
                        />
                      </div>
                      <Command.List className="max-h-[300px] overflow-y-auto p-2">
                          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No results found.</Command.Empty>
                          
                          <Command.Group heading="Navigation" className="text-xs font-medium text-muted-foreground px-2 py-1">
                              <Command.Item onSelect={() => { router.get('/'); setCommandOpen(false); }} className="flex items-center gap-2 px-2 py-2 text-sm text-foreground hover:bg-muted rounded-sm cursor-pointer aria-selected:bg-muted aria-selected:text-foreground">
                                  <span className="material-icons text-[16px] text-muted-foreground">inbox</span> My Tasks
                              </Command.Item>
                              <Command.Item onSelect={() => { router.get('/analytics'); setCommandOpen(false); }} className="flex items-center gap-2 px-2 py-2 text-sm text-foreground hover:bg-muted rounded-sm cursor-pointer aria-selected:bg-muted aria-selected:text-foreground">
                                  <span className="material-icons text-[16px] text-muted-foreground">bar_chart</span> Analytics Dashboard
                              </Command.Item>
                          </Command.Group>

                          {available_projects && available_projects.length > 0 && (
                              <Command.Group heading="Projects" className="text-xs font-medium text-muted-foreground px-2 py-1 mt-2">
                                  {available_projects.map(p => (
                                      <Command.Item key={p.id} onSelect={() => { router.get(`/projects/${p.key}/boards`); setCommandOpen(false); }} className="flex items-center gap-2 px-2 py-2 text-sm text-foreground hover:bg-muted rounded-sm cursor-pointer aria-selected:bg-muted aria-selected:text-foreground">
                                          <span className="font-mono text-[10px] text-muted-foreground">[{p.key}]</span> {p.name}
                                      </Command.Item>
                                  ))}
                              </Command.Group>
                          )}
                      </Command.List>
                  </Command>
              </div>
          </div>
      )}
      <Toaster />
    </div>
  );
}