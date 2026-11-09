import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const passwordRules = [
  { label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { label: 'Uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { label: 'Lowercase letter', test: (value) => /[a-z]/.test(value) },
  { label: 'Number', test: (value) => /[0-9]/.test(value) },
  { label: 'Symbol', test: (value) => /[^A-Za-z0-9]/.test(value) },
];

export default function PasswordChangeDialog({ open = false, mandatory = false, onClose, onSuccess }) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [visibility, setVisibility] = useState({ current: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const completedRules = useMemo(
    () => passwordRules.filter((rule) => rule.test(newPassword)).length,
    [newPassword],
  );
  const isOpen = mandatory || open;

  if (!isOpen) return null;

  const toggleVisibility = (field) => {
    setVisibility((current) => ({ ...current, [field]: !current[field] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Enter your current password.');
      return;
    }
    if (completedRules !== passwordRules.length) {
      setError('Choose a password that meets all the security requirements.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Your new password must be different from your current password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await changePassword(newPassword, currentPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password updated successfully.');
      onSuccess?.();
      if (!mandatory) {
        window.setTimeout(() => onClose?.(), 1200);
      }
    } catch (submitError) {
      setError(submitError.message || 'The password could not be changed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordInput = (field, label, value, setValue, autoComplete) => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">{label}</span>
      <span className="relative block">
        <input
          required
          type={visibility[field] ? 'text' : 'password'}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-11 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="button"
          onClick={() => toggleVisibility(field)}
          aria-label={`${visibility[field] ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700"
        >
          {visibility[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="change-password-title" className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-5 shadow-2xl sm:p-7">
        {!mandatory && (
          <button onClick={onClose} aria-label="Close" className="float-right rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 id="change-password-title" className="text-lg font-extrabold text-slate-900">
              {mandatory ? 'Set a new password' : 'Change password'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {mandatory ? 'Update your temporary password to continue.' : 'Verify your current password first.'}
            </p>
          </div>
        </div>

        {error && <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
        {success && <p role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {passwordInput('current', 'Current password', currentPassword, setCurrentPassword, 'current-password')}
          {passwordInput('next', 'New password', newPassword, setNewPassword, 'new-password')}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Password strength</span>
              <span className={`text-xs font-bold ${completedRules === 5 ? 'text-emerald-700' : completedRules >= 3 ? 'text-amber-700' : 'text-slate-400'}`}>
                {completedRules === 5 ? 'Strong' : completedRules >= 3 ? 'Getting stronger' : 'Weak'}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {passwordRules.map((rule, index) => (
                <span key={rule.label} className={`h-1.5 rounded-full ${index < completedRules ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              ))}
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-500">
              {passwordRules.map((rule) => (
                <li key={rule.label} className={rule.test(newPassword) ? 'font-semibold text-emerald-700' : ''}>
                  {rule.test(newPassword) ? '✓ ' : '• '}{rule.label}
                </li>
              ))}
            </ul>
          </div>
          {passwordInput('confirm', 'Confirm new password', confirmPassword, setConfirmPassword, 'new-password')}
          <div className="flex justify-end gap-2 pt-1">
            {!mandatory && (
              <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
            )}
            <button disabled={loading} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Save password
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
