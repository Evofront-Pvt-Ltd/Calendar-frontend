"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { hasSession, saveSession } from "@/lib/session";
import type { AuthResponse } from "@/types";

const fallbackTimezone = "Asia/Kolkata";

function normalizeTimezone(timezone: string) {
  return timezone === "Asia/Calcutta" || timezone === "Calcutta" ? "Asia/Kolkata" : timezone;
}

export default function AuthPage({ initialMode }: { initialMode: "login" | "signup" }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [step, setStep] = useState<"email" | "password" | "verify">(initialMode === "login" ? "email" : "password");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    timezone: ""
  });
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [registeredEmailMessage, setRegisteredEmailMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    // Google OAuth callback error handling is parked for future reactivation.
    // const params = new URLSearchParams(window.location.search);
    // const oauthError = params.get("oauth_error");
    // if (oauthError) {
    //   setError(oauthError);
    //   window.history.replaceState({}, "", window.location.pathname);
    // }

    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTimezone) {
      setForm((current) =>
        current.timezone === "" ? { ...current, timezone: normalizeTimezone(browserTimezone) } : current
      );
    }
    if (hasSession()) {
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    if (step !== "verify" || resendSeconds <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds, step]);

  function startSession(response: AuthResponse) {
    saveSession(response);
    router.push("/dashboard");
  }

  function continueWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (mode === "login" && step === "email") {
      setStep("password");
      return;
    }
    if (mode === "signup" && step === "verify") {
      verifySignup();
      return;
    }
    submit();
  }

  async function submit() {
    setLoading(true);
    setError("");
    setRegisteredEmailMessage("");
    try {
      const response =
        mode === "signup"
          ? await startSignup()
          : await api.login({
              email: form.email,
              password: form.password
            });
      if (!response) {
        return;
      }
      startSession(response);
    } catch (caught) {
      if (mode === "signup" && caught instanceof ApiError && caught.code === "EMAIL_ALREADY_REGISTERED") {
        setRegisteredEmailMessage(caught.message);
        setNotice("");
        setStep("password");
        return;
      }
      if (mode === "login" && caught instanceof ApiError && caught.status === 404) {
        setNotice(caught.message);
        setError("");
        return;
      }
      setError(caught instanceof Error ? caught.message : "Unable to continue");
    } finally {
      setLoading(false);
    }
  }

  async function startSignup(): Promise<AuthResponse | null> {
    const response = await api.startRegistration({
      ...form,
      timezone: normalizeTimezone(form.timezone || fallbackTimezone)
    });
    setOtp("");
    setStep("verify");
    setResendSeconds(response.resend_available_in_seconds);
    setNotice(response.message);
    return null;
  }

  async function verifySignup() {
    setLoading(true);
    setError("");
    try {
      const response = await api.verifyRegistration({
        email: form.email,
        otp
      });
      startSession(response);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to verify OTP");
    } finally {
      setLoading(false);
    }
  }

  async function resendSignupCode() {
    setError("");
    setNotice("");
    setRegisteredEmailMessage("");
    setResendLoading(true);
    try {
      const response = await api.resendRegistration({ email: form.email });
      setOtp("");
      setResendSeconds(response.resend_available_in_seconds);
      setNotice(response.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to resend verification code");
    } finally {
      setResendLoading(false);
    }
  }

  // Google OAuth sign-in is parked for future reactivation.
  // async function startGoogleSignIn() {
  //   setError("");
  //   setNotice("");
  //   setLoading(true);
  //   try {
  //     const config = await api.googleConfig();
  //     if (!config.enabled) {
  //       setNotice(
  //         `Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the backend environment. Redirect URI: ${config.redirect_uri}`
  //       );
  //       return;
  //     }
  //     window.location.href = `${API_URL}/api/auth/google/start`;
  //   } catch (caught) {
  //     setError(caught instanceof Error ? caught.message : "Unable to start Google sign-in");
  //   } finally {
  //     setLoading(false);
  //   }
  // }
  //
  // function showProviderNotice(provider: string) {
  //   setNotice(`${provider} OAuth is not configured yet.`);
  // }

  function switchMode(nextMode: "login" | "signup") {
    setMode(nextMode);
    setStep(nextMode === "login" ? "email" : "password");
    setForm((current) => ({
      name: "",
      email: "",
      password: "",
      timezone: current.timezone || fallbackTimezone
    }));
    setOtp("");
    setShowPassword(false);
    setResendSeconds(0);
    setError("");
    setNotice("");
    setRegisteredEmailMessage("");
  }

  function goToLoginForRegisteredEmail() {
    setMode("login");
    setStep("password");
    setOtp("");
    setPasswordForLogin();
    setError("");
    setNotice("");
    setRegisteredEmailMessage("");
  }

  function setPasswordForLogin() {
    setForm((current) => ({ ...current, password: "" }));
  }

  function useAnotherSignupEmail() {
    setStep("password");
    setForm((current) => ({ ...current, email: "", password: "" }));
    setOtp("");
    setError("");
    setNotice("");
    setRegisteredEmailMessage("");
  }

  return (
    <main className="login-shell">
      <header className="login-nav">
        <a className="marketing-brand" href="/" aria-label="Calendar Booking home">
          <span className="brand-orbit">
            <CalendarDays size={24} />
          </span>
          Calendar Booking
        </a>
        <nav aria-label="Login navigation">
          <a href="/">Product</a>
          <a href="/">Solutions</a>
          <a href="/">Resources</a>
          <a href="/">Pricing</a>
        </nav>
        <a className="blue-action" href="/signup">Get started for free</a>
      </header>

      <section className="login-stage">
        <h1>{mode === "login" ? "Log in to your account" : "Create your account"}</h1>

        <form className="login-card" onSubmit={continueWithEmail} autoComplete="off">
          <div className="auth-switch" aria-label="Authentication mode">
            <button className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")} type="button">
              Log in
            </button>
            <button className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")} type="button">
              Sign up
            </button>
          </div>

          {mode === "signup" && step !== "verify" && (
            <input
              aria-label="Name"
              autoComplete="off"
              name="signup-display-name"
              placeholder="Enter your name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              minLength={2}
              required
            />
          )}

          {mode === "login" && step === "password" && (
            <button className="back-email" onClick={() => setStep("email")} type="button">
              <ChevronLeft size={17} />
              {form.email}
            </button>
          )}

          {mode === "signup" && step === "verify" && (
            <button className="back-email" onClick={() => setStep("password")} type="button">
              <ChevronLeft size={17} />
              {form.email}
            </button>
          )}

          {(mode === "signup" && step !== "verify") || step === "email" ? (
            <input
              aria-label="Email"
              autoComplete="off"
              name={mode === "signup" ? "signup-contact-address" : "login-contact-address"}
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(event) => {
                setRegisteredEmailMessage("");
                setForm((current) => ({ ...current, email: event.target.value }));
              }}
              required
            />
          ) : null}

          {(mode === "signup" && step !== "verify") || step === "password" ? (
            <div className="password-field">
              <input
                aria-label="Password"
                autoComplete="new-password"
                name={mode === "signup" ? "signup-private-key" : "login-private-key"}
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
              value={form.password}
              onChange={(event) => {
                setRegisteredEmailMessage("");
                setForm((current) => ({ ...current, password: event.target.value }));
              }}
              minLength={mode === "signup" ? 8 : 1}
              required
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
          ) : null}

          {mode === "signup" && step === "verify" && (
            <input
              aria-label="OTP"
              autoComplete="one-time-code"
              name="email-verification-code"
              inputMode="numeric"
              maxLength={6}
              minLength={6}
              placeholder="Enter email verification code"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
          )}

          {mode === "signup" && step === "verify" && (
            <div className="resend-row">
              <span>Didn't receive the email?</span>
              <button
                disabled={resendLoading || resendSeconds > 0}
                onClick={resendSignupCode}
                type="button"
              >
                {resendLoading
                  ? "Sending..."
                  : resendSeconds > 0
                    ? `Resend in ${resendSeconds}s`
                    : "Resend code"}
              </button>
            </div>
          )}

          {mode === "signup" && registeredEmailMessage && (
            <div className="auth-info-state" role="status" aria-live="polite">
              <strong>Email already registered</strong>
              <p>This email address has already been verified. Please log in to continue.</p>
              <div>
                <button className="blue-action full" onClick={goToLoginForRegisteredEmail} type="button">
                  Go to Login
                </button>
                <button className="secondary-auth-action" onClick={useAnotherSignupEmail} type="button">
                  Use Another Email
                </button>
              </div>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-notice">{notice}</p>}

          {!registeredEmailMessage && (
            <button className="blue-action full" disabled={loading} type="submit">
              {loading ? <Loader2 className="spin" size={18} /> : null}
              {mode === "login" && step === "email"
                ? "Continue"
                : mode === "login"
                  ? "Log in"
                  : step === "verify"
                    ? "Verify and create account"
                    : "Create account"}
            </button>
          )}

          {/*
          Google/Microsoft OAuth buttons are parked for future reactivation.

          <div className="divider">
            <span>OR</span>
          </div>

          <button className="provider-button" disabled={loading} onClick={startGoogleSignIn} type="button">
            {loading ? <Loader2 className="spin" size={18} /> : <span className="google-mark">G</span>}
            {loading ? "Authenticating..." : "Continue with Google"}
          </button>
          <button className="provider-button" disabled={loading} onClick={() => showProviderNotice("Microsoft")} type="button">
            <span className="microsoft-mark">
              <i />
              <i />
              <i />
              <i />
            </span>
            Continue with Microsoft
          </button>
          */}
        </form>
      </section>
    </main>
  );
}
