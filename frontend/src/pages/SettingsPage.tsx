import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { usersService } from '@/services/users.service';
import { authService } from '@/services/auth.service';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [totpSetup, setTotpSetup] = useState<{ qrDataUrl: string; secret: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'account' | 'security'>('account');

  const emailForm = useForm({ defaultValues: { email: user?.email ?? '', password: '' } });
  const passwordForm = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });
  const totpForm = useForm({ defaultValues: { code: '' } });

  useEffect(() => {
    if (user) emailForm.reset({ email: user.email, password: '' });
  }, [user]);

  const handleEmailUpdate = async (values: { email: string; password: string }) => {
    try {
      const updated = await usersService.updateEmail(values);
      setUser({ ...user!, ...updated });
      toast.success('Email updated');
      emailForm.resetField('password');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to update email');
    }
  };

  const handlePasswordUpdate = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await usersService.updatePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      toast.success('Password updated');
      passwordForm.reset();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to update password');
    }
  };

  const handleSetupTotp = async () => {
    try {
      const data = await authService.setupTotp();
      setTotpSetup(data);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to set up 2FA');
    }
  };

  const handleEnableTotp = async (values: { code: string }) => {
    try {
      await authService.enableTotp(values.code);
      setUser({ ...user!, totpEnabled: true });
      setTotpSetup(null);
      toast.success('2FA enabled');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Invalid code');
    }
  };

  const handleDisableTotp = async (values: { code: string }) => {
    try {
      await authService.disableTotp(values.code);
      setUser({ ...user!, totpEnabled: false });
      toast.success('2FA disabled');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Invalid code');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(['account', 'security'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'account' && (
        <div className="space-y-6">
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Update Email</h3>
            <form onSubmit={emailForm.handleSubmit(handleEmailUpdate)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Email</label>
                <input
                  {...emailForm.register('email', { required: true })}
                  type="email"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                <input
                  {...emailForm.register('password', { required: true })}
                  type="password"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button type="submit" disabled={emailForm.formState.isSubmitting}
                className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50">
                Update email
              </button>
            </form>
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Change Password</h3>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordUpdate)} className="space-y-4">
              {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <input
                    {...passwordForm.register(field as any, { required: true })}
                    type="password"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
              <button type="submit" disabled={passwordForm.formState.isSubmitting}
                className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50">
                Update password
              </button>
            </form>
          </section>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">Two-Factor Authentication</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {user?.totpEnabled ? '2FA is currently enabled.' : '2FA is currently disabled.'}
            </p>

            {!user?.totpEnabled && !totpSetup && (
              <button onClick={handleSetupTotp}
                className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
                Set up 2FA
              </button>
            )}

            {totpSetup && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Scan this QR code with your authenticator app:</p>
                <img src={totpSetup.qrDataUrl} alt="TOTP QR Code" className="w-48 h-48 rounded-lg border border-gray-200 dark:border-gray-700" />
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">Manual key: {totpSetup.secret}</p>
                <form onSubmit={totpForm.handleSubmit(handleEnableTotp)} className="flex gap-2">
                  <input
                    {...totpForm.register('code', { required: true })}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-40 tracking-widest"
                  />
                  <button type="submit" disabled={totpForm.formState.isSubmitting}
                    className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50">
                    Enable
                  </button>
                </form>
              </div>
            )}

            {user?.totpEnabled && (
              <form onSubmit={totpForm.handleSubmit(handleDisableTotp)} className="flex gap-2">
                <input
                  {...totpForm.register('code', { required: true })}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter code to disable"
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-44 tracking-widest"
                />
                <button type="submit" disabled={totpForm.formState.isSubmitting}
                  className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50">
                  Disable 2FA
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
