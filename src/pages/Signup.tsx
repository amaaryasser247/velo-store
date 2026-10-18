import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { isEmailRegistered } from "../api/auth";
import PasswordFeedback from "../components/auth/PasswordFeedback";
import Button from "../components/common/Button";
import Container from "../components/common/Container";
import FormErrorSummary from "../components/common/FormErrorSummary";
import TextField from "../components/common/TextField";
import { useAuth } from "../hooks/useAuth";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { sanitizeReturnTo } from "../utils/auth";
import {
  INITIAL_SIGNUP_FORM,
  SIGNUP_FIELD_ORDER,
  isAuthErrorKey,
  type AuthErrorKey,
  type AuthValidationMessage,
  type SignupField,
  type SignupFormData,
} from "../types/auth";
import { validateSignupField, validateSignupForm } from "../utils/authValidation";

const TEXT_FIELDS = ["name", "email", "password", "confirmPassword"] as const;
type SignupTextField = (typeof TEXT_FIELDS)[number];

/** Short field names for the error summary items. */
const SIGNUP_LABEL_KEYS = {
  name: "auth.name",
  email: "auth.email",
  password: "auth.password",
  confirmPassword: "auth.confirmPassword",
  acceptTerms: "common.terms",
} as const satisfies Record<SignupField, string>;

function isSignupTextField(name: string): name is SignupTextField {
  return (TEXT_FIELDS as readonly string[]).includes(name);
}

function isSignupField(name: string): name is SignupField {
  return (SIGNUP_FIELD_ORDER as readonly string[]).includes(name);
}

export default function Signup() {
  const { t } = useTranslation();
  useDocumentTitle(t("meta.signup"));
  const navigate = useNavigate();
  const { isAuthenticated, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const returnTo = useMemo(() => sanitizeReturnTo(searchParams.get("returnTo")), [searchParams]);
  const rulesId = useId();

  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<SignupFormData>(INITIAL_SIGNUP_FORM);
  const [errors, setErrors] = useState<Partial<Record<SignupField, AuthValidationMessage>>>({});
  const [apiError, setApiError] = useState<AuthErrorKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryFocusRequest, setSummaryFocusRequest] = useState(0);

  // Signed-in visitors skip the form entirely.
  if (isAuthenticated) {
    return <Navigate to={returnTo ?? "/account"} replace />;
  }

  /** Uniqueness is checked live against the stored accounts, then re-checked by the API. */
  function validationOptions(): { emailRegistered: boolean } {
    return { emailRegistered: isEmailRegistered(form.email) };
  }

  function setFieldError(field: SignupField, message: AuthValidationMessage | undefined): void {
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
    if (!isSignupTextField(name)) return;
    setForm((previous) => ({ ...previous, [name]: value }));
    setFieldError(name, undefined);
  }

  function handleTermsChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { checked } = event.target;
    setForm((previous) => ({ ...previous, acceptTerms: checked }));
    setFieldError("acceptTerms", undefined);
  }

  function handleRememberChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { checked } = event.target;
    setForm((previous) => ({ ...previous, remember: checked }));
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>): void {
    const { name } = event.target;
    if (!isSignupField(name)) return;
    setFieldError(name, validateSignupField(name, form, validationOptions()));
  }

  function focusField(field: SignupField): void {
    const element = formRef.current?.elements.namedItem(field);
    if (element instanceof HTMLElement) element.focus();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validateSignupForm(form, validationOptions());
    setErrors(nextErrors);
    setApiError(null);

    const firstInvalid = SIGNUP_FIELD_ORDER.find((field) => nextErrors[field] !== undefined);
    if (firstInvalid !== undefined) {
      setSummaryVisible(true);
      setSummaryFocusRequest((request) => request + 1);
      return;
    }

    setSubmitting(true);
    const result = await signUp({
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
    });
    setSubmitting(false);
    // Passwords are never needed again after an attempt; drop them from state.
    setForm((previous) => ({ ...previous, password: "", confirmPassword: "" }));

    if (!result.ok) {
      if (result.error === "authError.emailTaken") {
        // Race-safe backstop for the live uniqueness check.
        setFieldError("email", "validation.emailTaken");
        setSummaryVisible(true);
        setSummaryFocusRequest((request) => request + 1);
      } else {
        setApiError(isAuthErrorKey(result.error) ? result.error : "authError.unknown");
      }
      return;
    }

    navigate(returnTo ?? "/account", { replace: true });
  }

  const loginHref = returnTo === null ? "/login" : `/login?returnTo=${encodeURIComponent(returnTo)}`;

  const summaryItems = SIGNUP_FIELD_ORDER.flatMap((field) => {
    const message = errors[field];
    return message === undefined
      ? []
      : [{ field, label: t(SIGNUP_LABEL_KEYS[field]), message: t(message) }];
  });

  return (
    <Container className="py-8 sm:py-12">
      <h1 className="type-display text-[clamp(2.25rem,7vw,4.5rem)]">{t("auth.signupTitle")}</h1>

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
            label={t("auth.name")}
            name="name"
            autoComplete="name"
            maxLength={50}
            value={form.name}
            onChange={handleTextChange}
            onBlur={handleBlur}
            error={errors.name ? t(errors.name) : undefined}
          />

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
              autoComplete="new-password"
              dir="ltr"
              maxLength={64}
              value={form.password}
              onChange={handleTextChange}
              onBlur={handleBlur}
              error={errors.password ? t(errors.password) : undefined}
              describedBy={rulesId}
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
            <PasswordFeedback id={rulesId} value={form.password} email={form.email} />
          </div>

          <div>
            <TextField
              label={t("auth.confirmPassword")}
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              dir="ltr"
              maxLength={64}
              value={form.confirmPassword}
              onChange={handleTextChange}
              onBlur={handleBlur}
              error={errors.confirmPassword ? t(errors.confirmPassword) : undefined}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowConfirm((visible) => !visible)}
                  aria-pressed={showConfirm}
                  aria-label={showConfirm ? t("auth.hidePassword") : t("auth.showPassword")}
                  className="grid size-10 place-items-center rounded-full text-graphite hover:bg-chalk hover:text-ink"
                >
                  {showConfirm ? (
                    <EyeOff className="size-5" aria-hidden="true" />
                  ) : (
                    <Eye className="size-5" aria-hidden="true" />
                  )}
                </button>
              }
            />
          </div>

          <div>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={form.acceptTerms}
                onChange={handleTermsChange}
                aria-invalid={errors.acceptTerms ? true : undefined}
                aria-describedby={errors.acceptTerms ? "signup-terms-error" : undefined}
                className="checkbox mt-0.5 size-5 shrink-0 scroll-mt-28"
              />
              <span>{t("auth.terms")}</span>
            </label>
            {errors.acceptTerms ? (
              <p
                id="signup-terms-error"
                className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-danger"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {t(errors.acceptTerms)}
              </p>
            ) : null}
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

          {apiError !== null ? (
            <p
              role="alert"
              className="border border-danger bg-surface px-4 py-3 text-sm font-semibold text-danger"
            >
              {t(apiError)}
            </p>
          ) : null}

          <Button type="submit" size="lg" fullWidth disabled={submitting} aria-busy={submitting}>
            {submitting ? t("auth.creatingAccount") : t("auth.createAccount")}
          </Button>
        </form>

        <p className="mt-6 text-sm">
          <Link
            to={loginHref}
            className="font-semibold underline-offset-4 decoration-ring decoration-2 hover:underline"
          >
            {t("auth.haveAccount")}
          </Link>
        </p>
      </div>
    </Container>
  );
}
