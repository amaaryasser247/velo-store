import type { AuthAction, AuthState } from "../types/auth";
import { assertNever } from "../utils/guards";

export const ANONYMOUS: AuthState = { status: "anonymous" };

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SIGN_IN":
      // Same account (e.g. a re-check on focus): keep the existing object.
      if (state.status === "authenticated" && state.user.id === action.payload.id) {
        return state;
      }
      return { status: "authenticated", user: action.payload };

    case "SIGN_OUT":
      return state.status === "anonymous" ? state : ANONYMOUS;

    default:
      return assertNever(action);
  }
}
