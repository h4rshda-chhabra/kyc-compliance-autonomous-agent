// Placeholder auth hook. Returns static mock data until real auth (task-tracked
// separately) is wired up to POST /api/v1/auth/login and GET /api/v1/auth/me.

export interface AuthState {
  isAuthenticated: boolean;
  user: { id: string; email: string; role: string } | null;
}

export function useAuth(): AuthState {
  return {
    isAuthenticated: false,
    user: null,
  };
}
