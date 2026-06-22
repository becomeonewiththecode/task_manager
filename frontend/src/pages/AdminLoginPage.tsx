import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth.service';
import { usersService } from '@/services/users.service';
import { useAuthStore } from '@/store/authStore';

interface FormValues {
  email: string;
  password: string;
  totpCode: string;
}

export function AdminLoginPage() {
  const [needsTotp, setNeedsTotp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<FormValues>();

  const onSubmit = async (values: FormValues) => {
    try {
      const tokens = await authService.adminLogin({
        email: values.email,
        password: values.password,
        totpCode: values.totpCode || undefined,
      });
      useAuthStore.setState({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      const user = await usersService.getProfile();
      setUser(user);
      navigate('/admin');
    } catch (err: any) {
      if (err.response?.status === 400 && err.response.data?.error?.includes('TOTP')) {
        setNeedsTotp(true);
      } else {
        toast.error(err.response?.data?.error ?? 'Admin login failed');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-4">
            <span className="text-xl font-bold text-primary-600 dark:text-primary-400">A</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Admin Login</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Sign in with an admin account</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                {...register('email', { required: 'Email is required' })}
                type="email"
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {needsTotp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Authenticator Code
                </label>
                <input
                  {...register('totpCode', { required: needsTotp })}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 tracking-widest text-center"
                  placeholder="000000"
                  autoFocus
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in as Admin'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Not an admin?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              User login
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
