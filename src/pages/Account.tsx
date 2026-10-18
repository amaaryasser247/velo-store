import { useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import Container from "../components/common/Container";
import { useAuth } from "../hooks/useAuth";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useFormat } from "../i18n/format";
import { isAuthErrorKey, type AuthErrorKey } from "../types/auth";

export default function Account() {
  const { t } = useTranslation();
  const { date } = useFormat();
  useDocumentTitle(t("meta.account"));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logOut, deleteAccount } = useAuth();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteError, setDeleteError] = useState<AuthErrorKey | null>(null);

  // Anonymous visitors sign in first, then come straight back here.
  if (!isAuthenticated || user === null) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  function openDeleteDialog(): void {
    setDeleteError(null);
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (typeof dialog.showModal === "function") {
      // Native modal: focus trap, Escape-to-cancel and focus restore included.
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>("[data-dialog-initial]")?.focus();
    } else {
      dialog.show();
    }
  }

  function closeDeleteDialog(): void {
    dialogRef.current?.close();
  }

  /**
   * Keeps Tab inside the dialog. The native modal trap lets focus fall through
   * to the document body once per cycle in some browsers, so the wrap is made
   * explicit: Shift+Tab on the first control wraps to the last and Tab on the
   * last wraps to the first.
   */
  function handleDialogKeyDown(event: KeyboardEvent<HTMLDialogElement>): void {
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (dialog === null) return;
    const controls = Array.from(
      dialog.querySelectorAll<HTMLButtonElement>("button:not([disabled])"),
    );
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (first === undefined || last === undefined) return;
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || active === document.body)) {
      event.preventDefault();
      first.focus();
    }
  }

  async function confirmDelete(): Promise<void> {
    setDeleting(true);
    const result = await deleteAccount();
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(isAuthErrorKey(result.error) ? result.error : "authError.unknown");
      return;
    }
    dialogRef.current?.close();
    navigate("/login", { replace: true, state: { notice: "accountDeleted" } });
  }

  async function handleLogOut(): Promise<void> {
    setLoggingOut(true);
    await logOut();
    navigate("/", { replace: true });
  }

  return (
    <Container className="py-8 sm:py-12">
      <h1 className="type-display text-[clamp(3rem,9vw,6.5rem)]">{t("auth.accountTitle")}</h1>

      <div className="mt-10 w-full max-w-xl border border-line bg-surface p-6 sm:p-8">
        <h2 className="type-title text-2xl sm:text-3xl">
          {t("auth.greeting", { name: user.name })}
        </h2>

        <dl className="mt-6 space-y-4 text-sm">
          <div className="flex flex-wrap gap-x-4">
            <dt className="font-semibold">{t("auth.name")}</dt>
            <dd className="text-graphite">{user.name}</dd>
          </div>
          <div className="flex flex-wrap gap-x-4">
            <dt className="font-semibold">{t("auth.email")}</dt>
            <dd className="text-graphite" dir="ltr">
              <bdi>{user.email}</bdi>
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-4">
            <dt className="font-semibold">{t("auth.memberSince")}</dt>
            <dd className="text-graphite">{date(user.createdAt)}</dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={handleLogOut} disabled={loggingOut}>
            {t("auth.logOut")}
          </Button>
          <Button variant="danger" onClick={openDeleteDialog}>
            {t("auth.deleteAccount")}
          </Button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-account-title"
        onKeyDown={handleDialogKeyDown}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] border border-line bg-surface p-6 text-ink"
      >
        <h2 id="delete-account-title" className="type-title text-xl">
          {t("auth.deleteTitle")}
        </h2>
        <p className="mt-3 text-sm text-graphite">{t("auth.deleteText")}</p>

        {deleteError !== null ? (
          <p
            role="alert"
            className="mt-4 border border-danger bg-surface px-3 py-2 text-sm font-semibold text-danger"
          >
            {t(deleteError)}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" data-dialog-initial onClick={closeDeleteDialog} disabled={deleting}>
            {t("auth.cancel")}
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting} aria-busy={deleting}>
            {deleting ? t("auth.deleting") : t("auth.deleteConfirm")}
          </Button>
        </div>
      </dialog>
    </Container>
  );
}
