import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="min-h-screen bg-page px-4 py-12 flex items-center justify-center">
      <div className="card-glass w-full max-w-md p-7">
        {sent ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-4 text-emerald" size={36} />
            <h1 className="text-2xl font-bold text-white">Check your email</h1>
            <p className="mt-3 text-sm leading-6 text-white/55">
              If an account exists for that address, a password reset link is on
              its way.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-azure/10 text-azure">
              <Mail size={19} />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Reset your password
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/55">
              Enter your account email and we’ll send you a secure reset link.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="reset-email"
                  className="mb-1.5 block text-xs font-semibold text-white/55"
                >
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  autoFocus
                  className="input-field"
                  placeholder="you@example.com"
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-coral">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center disabled:opacity-60"
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}
        <Link
          to="/auth/login"
          className="mt-6 flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white"
        >
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </main>
  );
}
