import { UserRole, UserSettings } from "../../api/types/user";
import {
  saveUserSettings,
  getUserData,
  getUserActivity,
  getUserClasses,
  getAllUsers,
  deleteUser,
  updateUser,
} from "../../api/user";

const originalFetch = global.fetch;

jest.mock("../../api/endpoints", () => ({
  USER_ENDPOINT: "http://mock-api/users",
  LOG_ENDPOINT: "http://mock-api/logs",
}));

describe("user-api", () => {
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("successfully saves user settings", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true } as Response);

    const result = await saveUserSettings({
      user_id: "user-1",
      settings: {
        bug_percentage: 10,
        show_notifications: true,
        give_suggestions: true,
        enable_quiz: true,
        active_threshold: 3,
        suspend_threshold: 2,
        pass_rate: 80,
        suspend_rate: 40,
      },
    });

    expect(result).toBe(true);
  });

  it("fails to save user settings when response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      text: async () => "Failed",
    } as Response);

    const result = await saveUserSettings({
      user_id: "user-1",
      settings: {} as UserSettings,
    });

    expect(result).toBe(false);
  });

  it("gets user data successfully", async () => {
    const mockUser = {
      data: {
        id: "1",
        created_at: "now",
        first_name: "Jane",
        last_name: "Doe",
        email: "jane@example.com",
        status: "ACTIVE",
        role: UserRole.STUDENT,
        settings: {
          bug_percentage: 10,
          show_notifications: true,
          give_suggestions: true,
          enable_quiz: false,
          active_threshold: 3,
          suspend_threshold: 2,
          pass_rate: 80,
          suspend_rate: 40,
        },
        last_updated_at: "now",
        auth_created_at: "now",
        last_sign_in: "now",
        source: "email",
        avatar_url: "pic.png",
      },
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    } as Response);

    const result = await getUserData("1");
    expect(result.data?.email).toBe("jane@example.com");
  });

  it("handles getUserData when response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
      json: async () => ({ message: "Oops" }),
    } as Response);

    const result = await getUserData("bad-id");
    expect(result.error).toBe("Oops");
  });

  it("handles getUserData when data is missing", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    const result = await getUserData("no-data");
    expect(result.error).toBe("Invalid response: expected user data");
  });

  it("gets user activity", async () => {
    const mockLogs = {
      data: [
        {
          id: "log1",
          event: "USER_ACCEPT",
          timestamp: "now",
          time_lapse: 2,
          metadata: {
            has_bug: true,
            suggestion_id: "s1",
            user_section_id: "sec1",
            user_class_id: "class1",
          },
        },
      ],
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockLogs,
    } as Response);

    const result = await getUserActivity("user-1");
    expect(result.data?.length).toBe(1);
  });

  it("handles getUserActivity with bad data shape", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: "not-an-array" }),
    } as Response);

    const result = await getUserActivity("bad");
    expect(result.error).toBe(
      "Invalid response: expected an array of activity logs"
    );
  });

  it("gets user classes", async () => {
    const mockData = {
      data: [
        {
          userClass: {
            id: "c1",
            class_title: "Math",
            class_code: "MATH101",
            instructor_id: "inst1",
            class_hex_color: "#fff",
            class_image_cover: "img.jpg",
            created_at: "now",
            class_description: "Algebra",
          },
          studentStatus: "ENROLLED",
        },
      ],
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as Response);

    const result = await getUserClasses("user-1");
    expect(result.data?.[0].userClass.classTitle).toBe("Math");
  });

  it("handles getUserClasses with 404", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      status: 404,
      ok: false,
      json: async () => ({}),
    } as Response);

    const result = await getUserClasses("missing-user");
    expect(result.data).toEqual([]);
  });

  it("gets all users", async () => {
    const mockUsers = {
      data: [
        {
          id: "u1",
          created_at: "now",
          first_name: "John",
          last_name: "Smith",
          email: "john@example.com",
          status: "ACTIVE",
          role: UserRole.STUDENT,
          settings: {
            bug_percentage: 5,
            show_notifications: false,
            give_suggestions: true,
            enable_quiz: true,
            active_threshold: 3,
            suspend_threshold: 1,
            pass_rate: 75,
            suspend_rate: 50,
          },
        },
      ],
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUsers,
    } as Response);

    const result = await getAllUsers();
    expect(result?.data?.[0].email).toBe("john@example.com");
  });

  it("handles getAllUsers with bad shape", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: "oops" }),
    } as Response);

    const result = await getAllUsers();
    expect(result?.error).toBe("Invalid response: expected an array of users");
  });

  it("deletes a user successfully", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true } as Response);

    const result = await deleteUser("u1");
    expect(result.success).toBe(true);
  });

  it("fails to delete user on server error", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ message: "Failed to delete" }),
    } as Response);

    const result = await deleteUser("bad");
    expect(result.error).toBe("Failed to delete");
  });

  it("updates a user successfully", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: true } as Response);

    const result = await updateUser("u1", {
      id: "u1",
      createdAt: "now",
      firstName: "New",
      lastName: "Name",
      email: "new@example.com",
      role: UserRole.STUDENT,
      settings: {
        bug_percentage: 10,
        show_notifications: true,
        give_suggestions: true,
        enable_quiz: true,
        active_threshold: 3,
        suspend_threshold: 2,
        pass_rate: 80,
        suspend_rate: 40,
      },
      status: "ACTIVE",
      last_updated_at: "now",
      auth_created_at: "now",
      last_sign_in: "now",
      source: "email",
      avatar_url: "avatar.png",
    });

    expect(result.success).toBe(true);
  });

  it("fails to update user", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Error",
      json: async () => ({ message: "Update failed" }),
    } as Response);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await updateUser("u1", {} as any);
    expect(result.error).toBe("Update failed");
  });

  it("handles saveUserSettings network error", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("Network error"));

    const result = await saveUserSettings({
      user_id: "user-1",
      settings: {} as UserSettings,
    });

    expect(result).toBe(false);
  });

  it("handles getUserData network error", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("Oops"));

    const result = await getUserData("any-id");
    expect(result.error).toBe("Oops");
  });

  it("handles getUserActivity when response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: async () => ({ message: "Access denied" }),
    } as Response);

    const result = await getUserActivity("u1");
    expect(result.error).toBe("Access denied");
  });

  it("handles getUserActivity network error", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("Network error"));

    const result = await getUserActivity("u1");
    expect(result.error).toBe("Network error");
  });

  it("handles getUserClasses with unknown error format", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      status: 500,
      ok: false,
      json: async () => ({}), // no `message`
    } as Response);

    const result = await getUserClasses("user-1");
    expect(result.error).toMatch(/Failed to get user classes/);
  });

  it("handles getUserClasses network error", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("Timeout"));

    const result = await getUserClasses("u1");
    expect(result.error).toBe("Timeout");
  });

  it("handles getAllUsers when response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({ message: "Fetch failed" }),
    } as Response);

    const result = await getAllUsers();
    expect(result?.error).toBe("Fetch failed");
  });

  it("handles getUserClasses network error", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("Timeout"));

    const result = await getUserClasses("u1");
    expect(result.error).toBe("Timeout");
  });

  it("handles getAllUsers network error", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("Fetch error"));

    const result = await getAllUsers();
    expect(result?.error).toBe("Fetch error");
  });

  it("handles deleteUser network error", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error("Network failure"));

    const result = await deleteUser("u1");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Network failure");
  });

  it("handles updateUser with unknown server error", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: async () => ({}), // no message
    } as Response);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await updateUser("u1", {} as any);
    expect(result.error).toMatch(/Failed to update user/);
  });

  it("handles updateUser network error", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error("Server unreachable"));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await updateUser("u1", {} as any);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Server unreachable");
  });
});
