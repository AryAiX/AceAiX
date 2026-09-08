import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function ResetPasswordPage() {
  const { session, loading: authLoading, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    setError("");
    const result = await updatePassword(password);
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setDone(true);
  }

  async function returnToLogin() {
    await signOut();
    navigate("/auth/login", { replace: true });
  }

  return (
    <main className="min-h-screen bg-page px-4 py-12 flex items-center justify-center">
      <div className="card-glass w-full max-w-md p-7">
        {authLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-azure" />
          </div>
        ) : done ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-4 text-emerald" size={36} />
            <h1 className="text-2xl font-bold text-white">Password updated</h1>
            <p className="mt-3 text-sm text-white/55">
              You can now sign in with your new password.
            </p>
            <button
              type="button"
              onClick={returnToLogin}
              className="btn-primary mt-6 w-full justify-center"
            >
              Back to sign in
            </button>
          </div>
        ) : !session ? (
          <div className="text-center">
            <LockKeyhole className="mx-auto mb-4 text-coral" size={34} />
            <h1 className="text-2xl font-bold text-white">
              Reset link expired
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/55">
              This reset link is missing, invalid, or has expired.
            </p>
            <Link
              to="/auth/forgot-password"
              className="btn-primary mt-6 w-full justify-center"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-azure/10 text-azure">
              <LockKeyhole size={19} />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Set a new password
            </h1>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1.5 block text-xs font-semibold text-white/55"
                >
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-xs font-semibold text-white/55"
                >
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="input-field"
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-coral">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full justify-center disabled:opacity-60"
              >
                {saving && <Loader2 size={15} className="animate-spin" />}
                {saving ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
