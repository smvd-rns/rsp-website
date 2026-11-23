"use client";

/**
 * Role sync disabled - all access rules are handled directly by PostgreSQL RLS/queries.
 */
export const useRoleSync = () => {
  return {
    isSuccess: true,
    isPending: false,
    isFetching: false,
    hasRole: false,
    isSyncingOrPendingAuth: false,
    error: null,
    refetch: async () => {},
  };
};
