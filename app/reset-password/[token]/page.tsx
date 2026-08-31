"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

type ResetCheck = {
  valid: boolean;
  email: string;
  expires_in_minutes: number;
  message: string;
};

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [check, setCheck] = useState<ResetCheck | null>(null);
  const [checkError, setCheckError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    api
      .checkResetToken(params.token)
      .then(setCheck)
      .catch((caught) => setCheckError(caught instanceof Error ? caught.message : "This reset link is not usable"))
      .finally(() => setChecking(false));
  }, [params.token]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Both passwords must match.");
      return;
    }
    setSaving(true);
    try {
      await api.resetPassword({ token: params.token, password });
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update password");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <main className="public-action-shell">
        <section className="public-action-card" aria-live="polite">
          <Loader2 className="spin" size={28} aria-hidden="true" />
          <h1>Checking reset link</h1>
          <p>One moment…</p>
        </section>
      </main>
    );
  }

  if (!check) {
    return (
      <main className="public-action-shell">
        <section className="public-action-card" aria-live="polite">
          <KeyRound size={28} aria-hidden="true" />
          <h1>Reset link unusable</h1>
          <p>{checkError || "This reset link is invalid or has already been used."}</p>
          <button className="blue-action full" onClick={() => router.push("/login")} type="button">
            Back to login
          </button>
        </section>
      </main>
    );
  }

  if (done) {
    return (
      <main className="public-action-shell">
        <section className="public-action-card" aria-live="polite">
          <Check size={28} aria-hidden="true" />
          <h1>Password updated</h1>
          <p>You have been signed out everywhere else. Sign in with your new password to continue.</p>
          <button className="blue-action full" onClick={() => router.push("/login")} type="button">
            Go to login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="public-action-shell">
      <section className="public-action-card">
        <KeyRound size={28} aria-hidden="true" />
        <h1>Choose a new password</h1>
        <p>
          Resetting the password for <strong>{check.email}</strong>. This link expires in{" "}
          {check.expires_in_minutes} minute{check.expires_in_minutes === 1 ? "" : "s"}.
        </p>

        <form className="reset-password-form" onSubmit={submit} autoComplete="off">
          <div className="password-field">
            <input
              aria-label="New password"
              autoComplete="new-password"
              type={showPassword ? "text" : "password"}
              placeholder="New password (at least 8 characters)"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              autoFocus
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>

          <input
            aria-label="Confirm new password"
            autoComplete="new-password"
            type={showPassword ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button className="blue-action full" disabled={saving} type="submit">
            {saving ? <Loader2 className="spin" size={18} aria-hidden="true" /> : null}
            {saving ? "Updating password" : "Update password"}
          </button>
        </form>
      </section>
    </main>
  );
}
