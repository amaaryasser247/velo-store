import { Eye, EyeOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getLoginLockStatus } from "../api/auth";
import Button from "../components/common/Button";
import Container from "../components/common/Container";
import FormErrorSummary from "../components/common/FormErrorSummary";
import TextField from "../components/common/TextField";
import { useAuth } from "../hooks/useAuth";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { sanitizeReturnTo } from "../utils/auth";
import {
  INITIAL_LOGIN_FORM,
  LOGIN_FIELD_ORDER,
  isAuthErrorKey,
  type AuthErrorKey,
  type AuthValidationMessage,
  type LoginField,
  type LoginFormData,
} from "../types/auth";
import { validateLoginField, validateLoginForm } from "../utils/authValidation";

/** Short field names for the error summary items. */
const LOGIN_LABEL_KEYS = {
  email: "auth.email",
  password: "auth.password",
} as const satisfies Record<LoginField, string>;

/** Reads the "account deleted" notice passed through router state, safely. */
function readLocationNotice(state: unknown): "accountDeleted" | null {
  if (typeof state !== "object" || state === null) return null;
  const notice = (state as Record<string, unknown>)["notice"];
  return notice === "accountDeleted" ? "accountDeleted" : null;
}

export default function Login() {
  const { t } = useTranslation();
  useDocumentTitle(t("meta.login"));
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logIn } = useAuth();
  const [searchParams] = useSearchParams();
  const returnTo = useMemo(() => sanitizeReturnTo(searchParams.get("returnTo")), [searchParams]);
  const notice = readLocationNotice(location.state);

  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<LoginFormData>(INITIAL_LOGIN_FORM);
  const [errors, setErrors] = useState<Partial<Record<LoginField, AuthValidationMessage>>>({});
  const [apiError, setApiError] = useState<AuthErrorKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryFocusRequest, setSummaryFocusRequest] = useState(0);
  const [lockedUntilMs, setLockedUntilMs] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const remainingSeconds = Math.max(0, Math.ceil((lockedUntilMs - now) / 1000));
  const locked = remainingSeconds > 0;

  // One tick per second while locked, then stop; aria-live announces the
  // countdown politely.
  useEffect(() => {
    const until = lockedUntilMs;
    if (until <= Date.now()) return undefined;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= until) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockedUntilMs]);

  function refreshLock(): void {
    const status = getLoginLockStatus(form.email);
    // Keep the countdown clock in sync with the deadline it will be measured against.
    setNow(Date.now());
    setLockedUntilMs(status.lockedUntilMs);
  }

  // Signed-in visitors (or a successful sign-in above) go straight on.
  if (isAuthenticated) {
    return <Navigate to={returnTo ?? "/account"} replace />;
  }

  function setFieldError(field: LoginField, message: AuthValidationMessage | undefined): void {
    setErrors((previous) => {
      if (previous[field] === message) return previous;
      const next = { ...previous };
      if (message === undefined) delete next[field];
      else next[field] = message;
      return next;
    });
  }

  function handleTextChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;
    if (name !== "email" && name !== "password") return;
    setForm((previous) => ({ ...previous, [name]: value }));
    setFieldError(name, undefined);
  }

  function handleRememberChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { checked } = event.target;
    setForm((previous) => ({ ...previous, remember: checked }));
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>): void {
    const { name } = event.target;
    if (name !== "email" && name !== "password") return;
    setFieldError(name, validateLoginField(name, form));
    if (name === "email") refreshLock();
  }

  function focusField(field: LoginField): void {
    const element = formRef.current?.elements.namedItem(field);
    if (element instanceof HTMLElement) element.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting || locked) return;

    const nextErrors = validateLoginForm(form);
    setErrors(nextErrors);
    setApiError(null);

    const firstInvalid = LOGIN_FIELD_ORDER.find((field) => nextErrors[field] !== undefined);
    if (firstInvalid !== undefined) {
      setSummaryVisible(true);
      setSummaryFocusRequest((request) => request + 1);
      return;
    }

    setSubmitting(true);
    const result = await logIn({
      email: form.email.trim(),
      password: form.password,
      remember: form.remember,
    });
    setSubmitting(false);
    // The password is never needed again after an attempt; drop it from state.
    setForm((previous) => ({ ...previous, password: "" }));

    if (!result.ok) {
      setApiError(isAuthErrorKey(result.error) ? result.error : "authError.unknown");
      refreshLock();
      return;
    }

    navigate(returnTo ?? "/account", { replace: true });
  }

  const signupHref = returnTo === null ? "/signup" : `/signup?returnTo=${encodeURIComponent(returnTo)}`;

  const summaryItems = LOGIN_FIELD_ORDER.flatMap((field) => {
    const message = errors[field];
    return message === undefined
      ? []
      : [{ field, label: t(LOGIN_LABEL_KEYS[field]), message: t(message) }];
  });

  return (
    <Container className="py-8 sm:py-12">
      <h1 className="type-display text-[clamp(3rem,9vw,6.5rem)]">{t("auth.loginTitle")}</h1>

      {notice === "accountDeleted" ? (
        <p role="status" className="mt-4 border border-line bg-surface px-4 py-3 text-sm sm:max-w-lg">
          {t("auth.accountDeleted")}
        </p>
      ) : null}

      <div className="mt-8 w-full max-w-md">
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
          {summaryVisible ? (
            <FormErrorSummary
              title={t("auth.fixErrors")}
              items={summaryItems}
              focusRequest={summaryFocusRequest}
              onSelect={focusField}
            />
          ) : null}

          <TextField
            label={t("auth.email")}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            dir="ltr"
            maxLength={254}
            value={form.email}
            onChange={handleTextChange}
            onBlur={handleBlur}
            error={errors.email ? t(errors.email) : undefined}
          />

          <div>
            <TextField
              label={t("auth.password")}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              dir="ltr"
              maxLength={64}
              value={form.password}
              onChange={handleTextChange}
              onBlur={handleBlur}
              error={errors.password ? t(errors.password) : undefined}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  className="grid size-10 place-items-center rounded-full text-graphite hover:bg-chalk hover:text-ink"
                >
                  {showPassword ? (
                    <EyeOff className="size-5" aria-hidden="true" />
                  ) : (
                    <Eye className="size-5" aria-hidden="true" />
                  )}
                </button>
              }
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="remember"
              checked={form.remember}
              onChange={handleRememberChange}
              className="checkbox mt-0.5 size-5 shrink-0"
            />
            <span>{t("auth.remember")}</span>
          </label>

          {locked ? (
            <p
              role="status"
              aria-live="polite"
              className="border border-line bg-surface px-4 py-3 text-sm"
            >
              {t("auth.tooManyAttempts", { seconds: remainingSeconds })}
            </p>
          ) : null}

          {apiError !== null ? (
            <p
              role="alert"
              className="border border-danger bg-surface px-4 py-3 text-sm font-semibold text-danger"
            >
              {t(apiError)}
            </p>
          ) : null}

          <Button type="submit" size="lg" fullWidth disabled={submitting || locked} aria-busy={submitting}>
            {submitting ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
        </form>

        <p className="mt-6 text-sm">
          <Link
            to={signupHref}
            className="font-semibold underline-offset-4 decoration-ring decoration-2 hover:underline"
          >
            {t("auth.newToVelo")}
          </Link>
        </p>
      </div>
    </Container>
  );
}
