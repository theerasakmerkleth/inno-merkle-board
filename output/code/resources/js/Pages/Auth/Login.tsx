import React, { FormEvent } from 'react';
import { useForm, usePage } from '@inertiajs/react';

export default function Login() {
  const { appName } = usePage<{ appName: string }>().props;
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    post('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 font-sans text-foreground">
      <div className="w-full max-w-sm space-y-8 bg-card p-8 rounded-lg shadow-sm border border-border">
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex flex-col items-center justify-center gap-3">
              <img src="/images/merkle-logo.png" alt="Merkle" className="h-8" />
              <span>{appName}</span>
          </h1>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-1">
            <input
              id="email"
              type="email"
              className="w-full bg-transparent border-0 border-b border-border px-0 py-2 text-sm text-foreground focus:ring-0 focus:border-ring placeholder:text-muted-foreground transition-colors"
              placeholder="Email address"
              required
              autoFocus
              value={data.email}
              onChange={e => setData('email', e.target.value)}
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
          
          <div className="space-y-1">
            <input
              id="password"
              type="password"
              className="w-full bg-transparent border-0 border-b border-border px-0 py-2 text-sm text-foreground focus:ring-0 focus:border-ring placeholder:text-muted-foreground transition-colors"
              placeholder="Password"
              required
              value={data.password}
              onChange={e => setData('password', e.target.value)}
            />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium py-2 px-4 rounded-sm transition-colors disabled:opacity-50"
          >
            {processing ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="pt-8 border-t border-border text-center">
           <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Test Accounts</div>
           <div className="flex justify-center gap-4 text-xs font-mono text-muted-foreground">
              <span>admin@merkle.com</span>
              <span>pm@merkle.com</span>
              <span>dev@merkle.com</span>
           </div>
           <div className="text-xs font-mono text-muted-foreground mt-2">password: password</div>
        </div>

      </div>
    </div>
  );
}