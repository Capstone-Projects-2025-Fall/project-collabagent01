import {
  updateLockUserInDatabase,
  getUserStatus,
  updateUserStatus,
  getUserByID,
  getUserSection,
  updateUserSection,
  getUserClasses,
} from "../../api/user-api";
import { UserStatus, UserSectionStatus } from "../../api/types/user";
import { USER_ENDPOINT } from "../../api/types/endpoints";

global.fetch = jest.fn() as jest.Mock;

describe("User API", () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
  const consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("updateLockUserInDatabase", () => {
    it("should lock a user successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      const result = await updateLockUserInDatabase("user-123", true);
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(`${USER_ENDPOINT}/user-123/lock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "user-123",
          is_locked: true,
        }),
      });
    });

    it("should handle lock failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: () => Promise.resolve({ message: "Permission denied" }),
      } as Response);

      const result = await updateLockUserInDatabase("user-123", true);
      expect(result.error).toBe("Permission denied");
    });
  });

  describe("getUserStatus", () => {
    it("should return ACTIVE when no classId provided", async () => {
      const result = await getUserStatus("user-123");
      expect(result.data).toBe(UserStatus.ACTIVE);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should fetch user status for a class", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              user_class_status: { user_class_status: UserStatus.ACTIVE },
            },
          }),
      } as Response);

      const result = await getUserStatus("user-123", "class-456");
      expect(result.data).toBe(UserStatus.ACTIVE);
      expect(mockFetch).toHaveBeenCalledWith(
        `${USER_ENDPOINT}/user-123/class-status?class_id=class-456`,
        expect.any(Object)
      );
    });

    it("should handle missing status in response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      } as Response);

      const result = await getUserStatus("user-123", "class-456");
      expect(result.error).toBe("Invalid response: Missing user status");
    });
  });

  describe("updateUserStatus", () => {
    it("should update user status successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      const result = await updateUserStatus("user-123", UserStatus.ACTIVE);
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `${USER_ENDPOINT}/user-123/status`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            status: UserStatus.ACTIVE,
            userClassId: undefined,
          }),
        })
      );
    });

    it("should handle update failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
        json: () =>
          Promise.resolve({
            message: "Failed to update user status: 500 Server Error",
          }),
      } as Response);

      const result = await updateUserStatus("user-123", UserStatus.ACTIVE);
      expect(result.error).toBe(
        "Failed to update user status: 500 Server Error"
      );
    });
  });

  describe("getUserByID", () => {
    const mockUserData = {
      id: "user-123",
      email: "test@example.com",
      first_name: "John",
      last_name: "Doe",
      is_locked: false,
      code_context_id: "context-456",
      status: UserStatus.ACTIVE,
      role: "student",
      settings: { theme: "dark" },
    };

    it("should fetch user data successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockUserData }),
      } as Response);

      const result = await getUserByID("user-123");
      expect(result.user).toEqual({
        id: "user-123",
        email: "test@example.com",
        first_name: "John",
        last_name: "Doe",
        isLocked: false,
        code_context_id: "context-456",
        isAuthenticated: true,
        userStatus: UserStatus.ACTIVE,
        role: "student",
        settings: { theme: "dark" },
      });
    });

    it("should handle missing user data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      const result = await getUserByID("user-123");
      expect(result.error).toBe("Invalid response: Missing user data");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network failed"));
      const result = await getUserByID("user-123");
      expect(result.error).toBe("Network failed");
    });
  });

  describe("getUserSection", () => {
    it("should fetch user section successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ data: { user_section_id: "section-789" } }),
      } as Response);

      const result = await getUserSection("user-123", "class-456");
      expect(result.userSectionId).toBe("section-789");
      expect(mockFetch).toHaveBeenCalledWith(
        `${USER_ENDPOINT}/user-123/sections?class_id=class-456`,
        expect.any(Object)
      );
    });

    it("should handle missing section ID", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      } as Response);

      const result = await getUserSection("user-123", "class-456");
      expect(result.error).toBe("Invalid response: Missing user_section_id");
    });
  });

  describe("updateUserSection", () => {
    it("should update user section successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ data: { new_user_section_id: "section-789" } }),
      } as Response);

      const result = await updateUserSection(
        "user-123",
        UserSectionStatus.COMPLETE,
        "section-456"
      );
      expect(result.newUserSectionID).toBeUndefined(); // Note: Your implementation doesn't return this value
      expect(mockFetch).toHaveBeenCalledWith(
        `${USER_ENDPOINT}/user-123/sections`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            status: UserSectionStatus.COMPLETE,
            userSectionId: "section-456",
          }),
        })
      );
    });

    it("should succeed when the API returns no data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "Content-Type": "application/json" }),
        json: () => Promise.resolve({ data: {} }),
      } as Response);

      const result = await updateUserSection(
        "user-123",
        UserSectionStatus.COMPLETE,
        "section-456"
      );
      expect(result).toEqual({});
    });
  });

  describe("getUserClasses", () => {
    const mockClassesResponse = {
      data: [
        {
          userClass: {
            id: "class-1",
            class_title: "Math 101",
            class_code: "MATH101",
            instructor_id: "teacher-1",
            class_hex_color: "#FF0000",
            class_image_cover: "math.jpg",
            created_at: "2023-01-01",
          },
        },
      ],
    };

    it("should fetch user classes successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockClassesResponse),
      } as Response);

      const result = await getUserClasses("user-123");
      expect(result.data).toEqual([
        {
          id: "class-1",
          classTitle: "Math 101",
          classCode: "MATH101",
          instructorId: "teacher-1",
          classHexColor: "#FF0000",
          classImageCover: "math.jpg",
          createdAt: "2023-01-01",
        },
      ]);
    });

    it("should handle non-array response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      } as Response);

      const result = await getUserClasses("user-123");
      expect(result.error).toBe(
        "Invalid response: expected an array of classes"
      );
    });
  });
});
