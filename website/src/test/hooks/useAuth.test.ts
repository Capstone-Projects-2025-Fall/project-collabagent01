/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act } from "@testing-library/react";
import { waitFor } from "@testing-library/react";
import { useAuth } from "../../hooks/useAuth";
import {
  User,
  Session,
  AuthChangeEvent,
  Subscription,
} from "@supabase/supabase-js";
import { useLocation, useNavigate } from "react-router-dom";

// Mock Supabase client
jest.mock("../../supabaseClient", () => {
  return {
    supabase: {
      auth: {
        getSession: jest.fn(),
        onAuthStateChange: jest.fn(),
      },
    },
  };
});

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
}));

import { supabase } from "../../supabaseClient";
const mockSupabaseAuth = supabase.auth as jest.Mocked<typeof supabase.auth>;
const mockUseNavigate = useNavigate as jest.Mock;
const mockUseLocation = useLocation as jest.Mock;

describe("useAuth", () => {
  const mockUser: User = {
    id: "123",
    email: "test@example.com",
    user_metadata: {},
    app_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;

  const mockSession = {
    user: mockUser,
    access_token: "access",
    refresh_token: "refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
  } as unknown as Session;

  const mockSubscription: Subscription = {
    id: "sub-1",
    callback: jest.fn(),
    unsubscribe: jest.fn(),
  };

  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigate.mockReturnValue(jest.fn());
    mockUseLocation.mockReturnValue({ pathname: "/" });

    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    mockSupabaseAuth.onAuthStateChange.mockImplementation(
      (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
        callback("SIGNED_IN", mockSession);
        return {
          data: {
            subscription: mockSubscription,
          },
        };
      }
    );
  });

  it("should return authenticated user when session exists", async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("should return null when no session exists", async () => {
    mockSupabaseAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockSupabaseAuth.onAuthStateChange.mockImplementation(() => {
      return {
        data: {
          subscription: mockSubscription,
        },
      };
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("should handle auth state changes", async () => {
    let capturedCallback: (
      event: AuthChangeEvent,
      session: Session | null
    ) => void;

    mockSupabaseAuth.onAuthStateChange.mockImplementation((cb) => {
      capturedCallback = cb;
      return {
        data: {
          subscription: mockSubscription,
        },
      };
    });

    const { result } = renderHook(() => useAuth());

    act(() => {
      capturedCallback("SIGNED_IN", mockSession);
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  it("should unsubscribe on unmount", () => {
    const unsubscribeMock = jest.fn();
    const customSubscription: Subscription = {
      id: "sub-2",
      callback: jest.fn(),
      unsubscribe: unsubscribeMock,
    };

    mockSupabaseAuth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: customSubscription,
      },
    });

    const { unmount } = renderHook(() => useAuth());
    unmount();

    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it("should handle null session from auth state change", async () => {
    let capturedCallback: (
      event: AuthChangeEvent,
      session: Session | null
    ) => void;

    mockSupabaseAuth.onAuthStateChange.mockImplementation((cb) => {
      capturedCallback = cb;
      return {
        data: {
          subscription: mockSubscription,
        },
      };
    });

    const { result } = renderHook(() => useAuth());

    act(() => {
      capturedCallback("SIGNED_OUT", null);
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  it("should handle unexpected getSession error gracefully", async () => {
    mockSupabaseAuth.getSession.mockRejectedValue(
      new Error("Failed to fetch session")
    );

    mockSupabaseAuth.onAuthStateChange.mockImplementation(() => ({
      data: { subscription: mockSubscription },
    }));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
