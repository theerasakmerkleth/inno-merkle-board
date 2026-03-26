import React, { useState, useEffect, ReactNode } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import { Command } from 'cmdk';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Toaster } from 'sonner';
import { NotificationInbox } from '@/components/NotificationInbox';
import CreateProjectSheet from '@/components/CreateProjectSheet';

interface AppLayoutProps {
  children: ReactNode;
  breadcrumbs?: ReactNode;
  available_projects?: any[];
  appName?: string;
}

export default function AppLayout({ children, breadcrumbs, available_projects: explicitProjects, appName = 'MerkleBoard' }: AppLayoutProps) {
  const { url, props } = usePage<any>();
  const { auth, available_projects: sharedProjects = [] } = props;
  const available_projects = explicitProjects || sharedProjects;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const canCreateProject = auth.user.role === 'Admin' || auth.user.role === 'Project Manager';

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
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
    { name: 'Activity Log', href: '/activity', icon: 'history', active: url.startsWith('/activity') },
    { name: 'User Management', href: '/users', icon: 'manage_accounts', active: url.startsWith('/users') },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      
      {/* MOBILE TRIGGER */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                  <button className="h-12 w-12 rounded-full bg-primary text-white shadow-xl flex items-center justify-center">
                      <span className="material-icons">menu</span>
                  </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-sidebar border-r-sidebar-border">
                  <SheetHeader className="px-6 py-4 border-b border-sidebar-border bg-sidebar">
                      <SheetTitle className="text-sm font-bold text-sidebar-foreground">Menu Navigation</SheetTitle>
                      <SheetDescription className="sr-only">Primary workspace navigation and project list.</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto p-4">
                      {/* Sidebar Content Clone */}
                      <nav className="space-y-1">
                          {navLinks.map((link) => (
                              <Link key={link.name} href={link.href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all ${link.active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70'}`}>
                                  <span className="material-icons text-[18px]">{link.icon}</span>
                                  {link.name}
                              </Link>
                          ))}
                      </nav>
                  </div>
              </SheetContent>
          </Sheet>
      </div>

      {/* LEFT SIDEBAR (Desktop) */}
      <aside className="w-64 border-r border-sidebar-border flex flex-col flex-shrink-0 bg-sidebar hidden md:flex">
        <div className="p-4 border-b border-sidebar-border">
            <Link href="/" className="mb-6 flex items-center gap-2 px-1">
                <img src="/images/merkle-logo.png" alt="Merkle" className="h-6" />
                <span className="font-bold text-sidebar-foreground text-sm tracking-tight">{appName}</span>
            </Link>
            <nav className="space-y-1">
                {navLinks.map((link) => (
                    <Link key={link.name} href={link.href} className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all duration-200 group ${link.active ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm font-semibold' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'}`}>
                        <span className={`material-icons text-[18px] transition-colors ${link.active ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/40 group-hover:text-sidebar-primary'}`}>{link.icon}</span>
                        {link.name}
                    </Link>
                ))}
            </nav>
        </div>

        <div className="p-4 border-b border-sidebar-border flex-1 overflow-y-auto">
            <div className="flex justify-between items-center mb-2 px-3 group/header">
                <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-bold">Projects</span>
                {canCreateProject && (
                    <button 
                        onClick={() => setIsCreatingProject(true)}
                        className="h-5 w-5 rounded bg-sidebar-accent text-sidebar-foreground/40 hover:text-sidebar-primary hover:bg-sidebar-primary/10 transition-all opacity-0 group-hover/header:opacity-100 flex items-center justify-center"
                        title="New Project"
                    >
                        <span className="material-icons text-[14px]">add</span>
                    </button>
                )}
            </div>
            <nav className="space-y-1 mt-3">
                {available_projects.map(p => (
                    <Link key={p.id} href={`/projects/${p.key}/boards`} className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors rounded-sm ${url.includes(`/projects/${p.key}`) ? 'bg-sidebar-primary/5 text-sidebar-primary font-medium' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}>
                        <span className="font-mono text-[10px] opacity-40">[{p.key}]</span>
                        <span className="truncate flex-1">{p.name}</span>
                    </Link>
                ))}
            </nav>
        </div>

        <div className="mt-auto p-4 border-t border-sidebar-border flex items-center justify-between">
             <div className="flex items-center gap-3 truncate">
                  <div className="h-8 w-8 rounded-full bg-sidebar-accent border border-sidebar-border text-sidebar-foreground/60 flex items-center justify-center text-xs font-medium shrink-0">{auth.user.name.substring(0, 2).toUpperCase()}</div>
                  <div className="truncate">
                    <div className="text-sm font-medium text-sidebar-foreground truncate leading-tight">{auth.user.name}</div>
                    <div className="text-[10px] text-sidebar-foreground/50 truncate">{(auth?.user as any)?.role || 'Member'}</div>
                  </div>
             </div>
             <button onClick={handleLogout} className="text-sidebar-foreground/40 hover:text-red-500 transition-colors"><span className="material-icons text-[18px]">logout</span></button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-8 flex-shrink-0 z-40">
            <div className="flex items-center gap-4">{breadcrumbs}</div>
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSearchOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/30 text-muted-foreground hover:border-primary/30 transition-all group">
                    <span className="material-icons text-[18px] group-hover:text-primary">search</span>
                    <span className="text-xs font-medium pr-8">Search...</span>
                    <kbd className="text-[10px] font-mono border border-border px-1.5 rounded bg-white">⌘K</kbd>
                </button>
                <div className="w-px h-6 bg-border mx-2"></div>
                <NotificationInbox />
                <div className="w-px h-6 bg-border mx-2"></div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 hover:bg-primary/20 transition-all outline-none">
                            <span className="material-icons text-[20px]">person</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 mt-1 p-1 bg-white border border-border shadow-xl rounded-xl z-[100]">
                        <div className="px-3 py-2 border-b border-zinc-50 mb-1">
                            <p className="text-xs font-bold text-zinc-900 truncate">{auth.user.name}</p>
                            <p className="text-[10px] text-zinc-400 font-medium truncate">{auth.user.email}</p>
                        </div>
                        <DropdownMenuItem asChild className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md focus:bg-primary/5 focus:text-primary transition-colors outline-none">
                            <Link href="/profile" className="flex items-center gap-3 w-full">
                                <span className="material-icons text-[18px]">account_circle</span>
                                <span className="text-xs font-bold text-zinc-900">My Profile</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md focus:bg-red-50 focus:text-red-600 transition-colors outline-none">
                            <span className="material-icons text-[18px]">logout</span>
                            <span className="text-xs font-bold">Logout</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col relative">{children}</div>
      </main>

      {/* SEARCH OVERLAY */}
      {isSearchOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsSearchOpen(false)}>
              <div className="w-full max-w-2xl bg-background rounded-xl shadow-2xl overflow-hidden border border-border animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                  <Command className="flex flex-col">
                      <div className="flex items-center border-b border-border px-4 py-3">
                          <span className="material-icons text-muted-foreground mr-3">search</span>
                          <Command.Input autoFocus placeholder="Find tasks or commands..." className="flex-1 bg-transparent border-none focus:ring-0 text-sm outline-none" />
                      </div>
                      <Command.List className="max-h-[350px] overflow-y-auto p-2 scrollbar-hide">
                          <Command.Empty className="py-12 text-center text-sm text-muted-foreground font-medium">No results found.</Command.Empty>
                          <Command.Group heading="Navigation" className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest px-3 py-2">
                              {navLinks.map(link => (
                                  <Command.Item key={link.name} onSelect={() => { router.visit(link.href); setIsSearchOpen(false); }} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-primary/5 aria-selected:bg-primary/5 transition-colors">
                                      <span className="material-icons text-[18px] text-muted-foreground">{link.icon}</span>
                                      {link.name}
                                  </Command.Item>
                              ))}
                          </Command.Group>
                      </Command.List>
                  </Command>
              </div>
          </div>
      )}
      <CreateProjectSheet open={isCreatingProject} onOpenChange={setIsCreatingProject} />
      <Toaster position="top-right" expand={false} richColors />
    </div>
  );
}
