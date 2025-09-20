import { renderHook } from "@testing-library/react";
import { waitFor } from "@testing-library/react";
import { useAllUsers } from "../../hooks/useAllUsers";
import { getAllUsers } from "../../api/user";
import { UserData, UserRole } from "../../api/types/user";

jest.mock("../../api/user");
const mockGetAllUsers = getAllUsers as jest.Mock;

jest.mock("../../api/endpoints", () => ({
  USER_ENDPOINT: "http://test-endpoint/users",
}));

describe("useAllUsers", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUsers: UserData[] = [
    {
      id: "1",
      createdAt: "2025-01-01T00:00:00Z",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane.doe@example.com",
      role: UserRole.STUDENT,
      settings: {
        bug_percentage: 5,
        show_notifications: true,
        give_suggestions: true,
        enable_quiz: true,
        active_threshold: 5,
        suspend_threshold: 10,
        pass_rate: 80,
        suspend_rate: 30,
      },
    },
  ];

  it("should fetch and return users on success", async () => {
    mockGetAllUsers.mockResolvedValue({ data: mockUsers, error: null });

    const { result } = renderHook(() => useAllUsers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toEqual(mockUsers);
    expect(result.current.error).toBeNull();
  });

  it("should return error if fetch fails", async () => {
    mockGetAllUsers.mockResolvedValue({
      data: undefined,
      error: "Failed to fetch users",
    });

    const { result } = renderHook(() => useAllUsers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toEqual([]);
    expect(result.current.error).toBe("Failed to fetch users");
  });

  it("should handle undefined result gracefully", async () => {
    mockGetAllUsers.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAllUsers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
