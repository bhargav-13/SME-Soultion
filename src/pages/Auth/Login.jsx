import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/form-field';
import logo from '@/assets/logo.png';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // Get the page they were trying to access
  const from = location.state?.from?.pathname || '/';

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username or email is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const success = await login(formData.username, formData.password);

    if (success) {
      // Redirect to the page they were trying to access, or home
      navigate(from, { replace: true });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* The brand panel. Hidden below `lg` — on a phone it would push the form off the fold, and
          the one thing this screen exists to do is take two fields. */}
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -right-28 size-[26rem] rounded-full bg-white/8"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-24 size-[30rem] rounded-full bg-brass/15"
        />

        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-white/12 backdrop-blur">
            <img src={logo} alt="" className="h-7 w-auto object-contain brightness-0 invert" />
          </span>
          <span className="grid leading-tight">
            <span className="font-heading text-[17px] font-semibold">ISHITA</span>
            <span className="text-[11px] tracking-[0.14em] text-white/60 uppercase">ERP console</span>
          </span>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-heading text-[30px] leading-[1.2] font-semibold tracking-[-0.02em]">
            Every order, plating job and packing list in one place.
          </h2>
          <p className="mt-4 text-[14px] leading-[1.65] text-white/70">
            From the party master through job work and gres to the export invoice — the whole floor,
            tracked stage by stage.
          </p>
        </div>

        <p className="relative text-[12px] text-white/50">© 2026 ISHITA Industries. All rights reserved.</p>
      </aside>

      <main className="flex items-center justify-center bg-paper px-4 py-10 sm:px-8">
        <div className="w-full max-w-[24rem]">
          <div className="mb-8 text-center lg:text-left">
            <span className="mb-5 inline-grid size-12 place-items-center rounded-xl bg-primary-soft text-primary lg:hidden">
              <img src={logo} alt="" className="h-7 w-auto object-contain" />
            </span>
            <h1 className="font-heading text-[24px] font-semibold tracking-[-0.02em] text-ink">Welcome back</h1>
            <p className="mt-1.5 text-[13px] text-ink-3">Sign in to continue to the console.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Username or email" htmlFor="username" error={errors.username}>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  id="username"
                  name="username"
                  autoComplete="username"
                  value={formData.username}
                  onChange={handleChange}
                  aria-invalid={!!errors.username}
                  className="h-10 bg-surface pl-9"
                  placeholder="you@example.com"
                  disabled={loading}
                />
              </div>
            </Field>

            <Field label="Password" htmlFor="password" error={errors.password}>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3"
                  aria-hidden="true"
                />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  aria-invalid={!!errors.password}
                  className="h-10 bg-surface pr-10 pl-9"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded-md text-ink-3 transition-colors hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="size-4" />
                  Sign in
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-[11.5px] text-ink-3 lg:text-left">
            Secure login powered by JWT authentication.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
