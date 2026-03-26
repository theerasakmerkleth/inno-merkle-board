import React, { FormEvent } from 'react';
import { useForm, usePage, Head } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { toast } from 'sonner';

export default function Edit() {
    const { user } = usePage<any>().props;
    
    const { data, setData, put, errors, processing, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword = (e: FormEvent) => {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                toast.success('Security credentials updated successfully.');
            },
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                }
                if (errors.current_password) {
                    reset('current_password');
                }
            },
        });
    };

    const breadcrumbs = (
        <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
            <span className="material-icons text-[14px]">person</span>
            <span className="text-zinc-900">My Profile</span>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Profile" />
            
            <div className="flex-1 overflow-y-auto bg-[#F9FAFB] p-8">
                <div className="max-w-3xl mx-auto space-y-8">
                    
                    {/* Header */}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Profile Settings</h1>
                        <p className="text-sm text-zinc-500 mt-1">Manage your account security and personal information.</p>
                    </div>

                    {/* Account Overview Card */}
                    <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm">
                        <div className="flex items-center gap-6">
                            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary border-4 border-white shadow-lg">
                                <span className="material-icons text-[40px]">person</span>
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-xl font-bold text-zinc-900">{user.name}</h2>
                                <p className="text-sm text-zinc-500 font-medium">{user.email}</p>
                                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 mt-2">
                                    Active Account
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security Card */}
                    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-zinc-100 bg-white">
                            <h3 className="text-lg font-bold text-zinc-900">Security Credentials</h3>
                            <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1">Rotate your password</p>
                        </div>
                        
                        <form onSubmit={updatePassword} className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Current Password</label>
                                    <input
                                        type="password"
                                        value={data.current_password}
                                        onChange={e => setData('current_password', e.target.value)}
                                        className="w-full bg-white border border-zinc-200 rounded-xl px-5 py-3.5 text-sm text-zinc-900 focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all outline-none font-bold"
                                        placeholder="••••••••"
                                        required
                                    />
                                    {errors.current_password && <p className="text-xs text-red-500 font-bold">{errors.current_password}</p>}
                                </div>

                                <div className="hidden md:block"></div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">New Password</label>
                                    <input
                                        type="password"
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        className="w-full bg-white border border-zinc-200 rounded-xl px-5 py-3.5 text-sm text-zinc-900 focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all outline-none font-bold"
                                        placeholder="Min. 8 characters"
                                        required
                                    />
                                    {errors.password && <p className="text-xs text-red-500 font-bold">{errors.password}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={data.password_confirmation}
                                        onChange={e => setData('password_confirmation', e.target.value)}
                                        className="w-full bg-white border border-zinc-200 rounded-xl px-5 py-3.5 text-sm text-zinc-900 focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all outline-none font-bold"
                                        placeholder="Repeat new password"
                                        required
                                    />
                                    {errors.password_confirmation && <p className="text-xs text-red-500 font-bold">{errors.password_confirmation}</p>}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-black uppercase tracking-[0.2em] px-10 py-4 rounded-xl transition-all shadow-xl shadow-zinc-200 disabled:opacity-50 flex items-center gap-3"
                                >
                                    {processing ? 'Updating...' : 'Update Security'}
                                    <span className="material-icons text-[18px]">verified_user</span>
                                </button>
                            </div>
                        </form>
                    </div>

                </div>
            </div>
        </AppLayout>
    );
}

// Global route helper for TypeScript
declare function route(name: string): string;
