import React, { useState, FormEvent, useEffect } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";

interface User {
  id: number;
  name: string;
  email: string;
}

interface CreateProjectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateProjectSheet({ open, onOpenChange }: CreateProjectSheetProps) {
  const { props } = usePage<any>();
  const { users = [], auth } = props;
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const { data, setData, post, processing, errors, reset } = useForm({
    name: '',
    key: '',
    business_domain: 'Engineering',
    visibility: 'public',
    member_ids: [] as number[],
    auto_provision: true,
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    post('/projects', {
      preserveScroll: true,
      onSuccess: () => {
        onOpenChange(false);
        reset();
        setStep(1);
      },
    });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      setData('name', name);
      if (!data.key || data.key === name.substring(0, data.key.length).toUpperCase()) {
          const generatedKey = name.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase();
          setData('key', generatedKey);
      }
  };

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  useEffect(() => {
    if (!open) {
      setStep(1);
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="p-0 sm:max-w-[540px] border-l border-border h-full flex flex-col bg-background font-sans">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-zinc-100 z-50">
                <div 
                    className="h-full bg-primary transition-all duration-500 ease-out" 
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                />
            </div>

            <SheetHeader className="px-8 py-8 border-b border-zinc-50 flex flex-row items-center justify-between space-y-0 bg-white z-10">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
                        <span className="material-icons text-primary text-[28px]">
                            {step === 1 ? 'identity' : step === 2 ? 'group_add' : 'rocket_launch'}
                        </span>
                    </div>
                    <div>
                        <SheetTitle className="text-xl font-bold tracking-tight text-zinc-900 leading-tight">
                            {step === 1 ? 'Identity & Mission' : step === 2 ? 'Access & Governance' : 'Review & Launch'}
                        </SheetTitle>
                        <SheetDescription className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mt-1">
                            Step {step} of {totalSteps} — {step === 1 ? 'Core Branding' : step === 2 ? 'Security & Team' : 'Final Provisioning'}
                        </SheetDescription>
                    </div>
                </div>
            </SheetHeader>
            
            <div className="p-8 flex-1 overflow-y-auto bg-[#F9FAFB] relative">
                <form id="create-project-form" onSubmit={handleCreate} className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    
                    {step === 1 && (
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label htmlFor="name" className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Project Name</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={handleNameChange}
                                    className="w-full bg-white border border-zinc-200 rounded-xl px-5 py-4 text-base text-zinc-900 focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all outline-none font-bold shadow-sm"
                                    placeholder="e.g. Apollo Lunar Base"
                                    autoFocus
                                    required
                                />
                                {errors.name && <div className="text-xs text-red-500 font-bold">{errors.name}</div>}
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label htmlFor="key" className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Project Key</label>
                                    <div className="relative">
                                        <input
                                            id="key"
                                            type="text"
                                            value={data.key}
                                            onChange={e => setData('key', e.target.value.toUpperCase())}
                                            className="w-full bg-white border border-zinc-200 rounded-xl px-5 py-4 text-base text-zinc-900 font-mono focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all outline-none font-black uppercase tracking-widest shadow-sm"
                                            placeholder="APO"
                                            required
                                            maxLength={5}
                                            minLength={2}
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-zinc-100 px-2 py-1 rounded text-zinc-400 border border-zinc-200">
                                            {data.key || '???'}-101
                                        </div>
                                    </div>
                                    {errors.key && <div className="text-xs text-red-500 font-bold">{errors.key}</div>}
                                </div>

                                <div className="space-y-3">
                                    <label htmlFor="domain" className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Business Domain</label>
                                    <select
                                        id="domain"
                                        value={data.business_domain}
                                        onChange={e => setData('business_domain', e.target.value)}
                                        className="w-full bg-white border border-zinc-200 rounded-xl px-5 py-4 text-sm text-zinc-900 focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all outline-none font-bold shadow-sm appearance-none"
                                    >
                                        <option value="Engineering">Engineering</option>
                                        <option value="Product">Product</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="Operations">Operations</option>
                                        <option value="HR">HR / People</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8">
                             <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Project Visibility</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setData('visibility', 'public')}
                                        className={`p-4 rounded-xl border-2 transition-all text-left flex items-start gap-3 ${data.visibility === 'public' ? 'border-primary bg-primary/5' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}
                                    >
                                        <span className={`material-icons ${data.visibility === 'public' ? 'text-primary' : 'text-zinc-300'}`}>public</span>
                                        <div>
                                            <div className="text-sm font-bold text-zinc-900">Workspace Public</div>
                                            <div className="text-[10px] text-zinc-400 font-medium">Anyone in Merkle can join.</div>
                                        </div>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setData('visibility', 'private')}
                                        className={`p-4 rounded-xl border-2 transition-all text-left flex items-start gap-3 ${data.visibility === 'private' ? 'border-primary bg-primary/5' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}
                                    >
                                        <span className={`material-icons ${data.visibility === 'private' ? 'text-primary' : 'text-zinc-300'}`}>lock</span>
                                        <div>
                                            <div className="text-sm font-bold text-zinc-900">Private Hub</div>
                                            <div className="text-[10px] text-zinc-400 font-medium">Invite-only access.</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Initial Team Members</label>
                                <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="max-h-[240px] overflow-y-auto">
                                        {users.filter((u: User) => u.id !== auth.user.id).map((user: User) => (
                                            <label key={user.id} className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-50 cursor-pointer transition-colors border-b border-zinc-50 last:border-0">
                                                <input 
                                                    type="checkbox" 
                                                    checked={data.member_ids.includes(user.id)}
                                                    onChange={(e) => {
                                                        const ids = e.target.checked 
                                                            ? [...data.member_ids, user.id]
                                                            : data.member_ids.filter(id => id !== user.id);
                                                        setData('member_ids', ids);
                                                    }}
                                                    className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                                                />
                                                <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-500 border border-zinc-200">
                                                    {user.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-xs font-bold text-zinc-900">{user.name}</div>
                                                    <div className="text-[10px] text-zinc-400">{user.email}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8">
                             <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center text-xl font-black">
                                            {data.key || '??'}
                                        </div>
                                        <div>
                                            <div className="text-lg font-bold text-zinc-900 leading-tight">{data.name || 'Untitled Project'}</div>
                                            <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">{data.business_domain}</div>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1 rounded-full bg-zinc-100 text-[10px] font-black uppercase text-zinc-500">
                                        {data.visibility}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-50">
                                    <div className="space-y-1">
                                        <div className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Manager</div>
                                        <div className="text-xs font-bold text-zinc-700">{auth.user.name}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Members</div>
                                        <div className="text-xs font-bold text-zinc-700">{data.member_ids.length + 1} Talents</div>
                                    </div>
                                </div>
                             </div>

                             <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4">
                                <span className="material-icons text-amber-500">auto_awesome</span>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={data.auto_provision}
                                            onChange={e => setData('auto_provision', e.target.checked)}
                                            className="h-4 w-4 rounded border-amber-300 text-amber-500 focus:ring-amber-500"
                                        />
                                        <span className="text-sm font-bold text-amber-900">Auto-provision Standard Boards</span>
                                    </label>
                                    <p className="text-[11px] text-amber-700/70 font-medium leading-relaxed">
                                        We'll automatically create "Backlog", "Sprint Board", and "Bug Triage" boards to get you started immediately.
                                    </p>
                                </div>
                             </div>
                        </div>
                    )}
                </form>
            </div>

            <SheetFooter className="p-8 border-t border-zinc-50 bg-white flex flex-row items-center justify-between flex-shrink-0">
                <button 
                    type="button" 
                    onClick={prevStep}
                    disabled={step === 1}
                    className="px-6 py-3 text-[11px] font-black text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-[0.2em] disabled:opacity-0"
                >
                    Back
                </button>
                
                <div className="flex gap-4">
                    {step < totalSteps ? (
                        <button 
                            type="button"
                            onClick={nextStep}
                            disabled={!data.name || !data.key}
                            className="bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-black uppercase tracking-[0.2em] px-10 py-4 rounded-xl transition-all shadow-xl shadow-zinc-200 disabled:opacity-50"
                        >
                            Next Step
                        </button>
                    ) : (
                        <button 
                            type="submit" 
                            form="create-project-form"
                            disabled={processing}
                            className="bg-primary hover:bg-primary/90 text-white text-[11px] font-black uppercase tracking-[0.2em] px-12 py-4 rounded-xl transition-all shadow-2xl shadow-primary/20 disabled:opacity-50 flex items-center gap-3"
                        >
                            {processing ? 'Provisioning...' : 'Launch Project Hub'}
                            <span className="material-icons text-[18px]">rocket</span>
                        </button>
                    )}
                </div>
            </SheetFooter>
        </SheetContent>
    </Sheet>
  );
}
