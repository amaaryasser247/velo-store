import { createContext } from "react";
import type { ApiResult } from "../types/api";
import type { AuthUser, LoginFormData, SignupFormData } from "../types/auth";

export interface AuthContextValue {
  /** The signed-in user, or `null` while anonymous. */
  user: AuthUser | null;
  isAuthenticated: boolean;
  signUp: (data: SignupFormData) => Promise<ApiResult<AuthUser>>;
  logIn: (data: LoginFormData) => Promise<ApiResult<AuthUser>>;
  logOut: () => Promise<void>;
  /** Removes the account and the session only; bag and wishlist are kept. */
  deleteAccount: () => Promise<ApiResult<null>>;
}

/** `null` means "no provider": useAuth() turns that into a clear error. */
export const AuthContext = createContext<AuthContextValue | null>(null);
