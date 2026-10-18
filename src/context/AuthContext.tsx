import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from "react";
import {
  deleteAccount as deleteAccountApi,
  logIn as logInApi,
  logOut as logOutApi,
  readSessionSync,
  restoreSession,
  signUp as signUpApi,
} from "../api/auth";
import type { AuthState, LoginFormData, SignupFormData } from "../types/auth";
import type { ApiResult } from "../types/api";
import { STORAGE_KEYS } from "../utils/storage";
import { AuthContext, type AuthContextValue } from "./authContextValue";
import { authReducer } from "./authReducer";

/**
 * Seeds the first render from storage synchronously, so a signed-in reload
 * never flashes the anonymous header or bounces /account to /login.
 */
function initAuthState(): AuthState {
  const user = readSessionSync();
  return user === null ? { status: "anonymous" } : { status: "authenticated", user };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, undefined, initAuthState);

  // Re-check on mount and whenever the tab regains focus: sessions expire,
  // and another tab may have signed out or deleted the account in between.
  useEffect(() => {
    let cancelled = false;
    const refresh = (): void => {
      void restoreSession().then((result) => {
        if (cancelled || !result.ok) return;
        const user = result.data;
        if (user === null) dispatch({ type: "SIGN_OUT" });
        else dispatch({ type: "SIGN_IN", payload: user });
      });
    };
    const onVisibilityChange = (): void => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // Cross-tab sync: storage events fire only in the OTHER tabs, so logging
  // out (or deleting the account) in one tab signs the rest out, and a login
  // in another tab is picked up here.
  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (
        event.key !== null &&
        event.key !== STORAGE_KEYS.session &&
        event.key !== STORAGE_KEYS.users
      ) {
        return;
      }
      const user = readSessionSync();
      if (user === null) dispatch({ type: "SIGN_OUT" });
      else dispatch({ type: "SIGN_IN", payload: user });
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const signUp = useCallback(async (data: SignupFormData) => {
    const result = await signUpApi(data);
    if (result.ok) dispatch({ type: "SIGN_IN", payload: result.data });
    return result;
  }, []);

  const logIn = useCallback(async (data: LoginFormData) => {
    const result = await logInApi(data);
    if (result.ok) dispatch({ type: "SIGN_IN", payload: result.data });
    return result;
  }, []);

  const logOut = useCallback(async (): Promise<void> => {
    await logOutApi();
    dispatch({ type: "SIGN_OUT" });
  }, []);

  const deleteAccount = useCallback(async (): Promise<ApiResult<null>> => {
    if (state.status !== "authenticated") return { ok: true, data: null };
    const result = await deleteAccountApi(state.user.id);
    if (result.ok) dispatch({ type: "SIGN_OUT" });
    return result;
  }, [state]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.status === "authenticated" ? state.user : null,
      isAuthenticated: state.status === "authenticated",
      signUp,
      logIn,
      logOut,
      deleteAccount,
    }),
    [state, signUp, logIn, logOut, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
