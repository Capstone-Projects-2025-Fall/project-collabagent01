/**
 * Tests for user-api.ts
 */

import {
  updateLockUserInDatabase,
  getUserStatus,
  updateUserStatus,
  getUserByID,
  getUserSection,
  updateUserSection,
  getUserClasses
} from "../../api/user-api";

import { USER_ENDPOINT } from "../../api/types/endpoints";
import { UserStatus, UserSectionStatus } from "../../api/types/user";

// mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe("user-api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ------------------------------------------------------------
  // updateLockUserInDatabase
  // ------------------------------------------------------------
  describe("updateLockUserInDatabase", () => {
    test("successfully updates lock state", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "ok" })
      });

      const result = await updateLockUserInDatabase("123", true);
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        `${USER_ENDPOINT}/123/lock`,
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: "123", is_locked: true })
        })
      );
    });

    test("returns error when backend responds with error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad",
        json: async () => ({ message: "Lock failed" })
      });

      const result = await updateLockUserInDatabase("123", true);
      expect(result.error).toBe("Lock failed");
    });

    test("handles network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("network fail"));
      const result = await updateLockUserInDatabase("123", false);
      expect(result.error).toBe("network fail");
    });
  });

  // ------------------------------------------------------------
  // getUserStatus
  // ------------------------------------------------------------
  describe("getUserStatus", () => {
    test("returns ACTIVE when classId not provided", async () => {
      const result = await getUserStatus("u1");
      expect(result.data).toBe(UserStatus.ACTIVE);
    });

    test("returns user class status when backend succeeds", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            user_class_status: { user_class_status: UserStatus.SUSPENDED }
          }
        })
      });

      const result = await getUserStatus("u1", "class1");
      expect(result.data).toBe(UserStatus.SUSPENDED);
    });

    test("returns error on missing status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      const result = await getUserStatus("u1", "class1");
      expect(result.error).toBe("Invalid response: Missing user status");
    });

    test("handles API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "NF",
        json: async () => ({ message: "Not found" })
      });

      const result = await getUserStatus("u1", "class1");
      expect(result.error).toBe("Not found");
    });

    test("handles network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("boom"));
      const result = await getUserStatus("u1", "class1");
      expect(result.error).toBe("boom");
    });
  });

  // ------------------------------------------------------------
  // updateUserStatus
  // ------------------------------------------------------------
  describe("updateUserStatus", () => {
    test("updates user status successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      const result = await updateUserStatus("123", UserStatus.ACTIVE);
      expect(result.success).toBe(true);
    });

    test("returns error when backend fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad",
        json: async () => ({ message: "fail" })
      });

      const result = await updateUserStatus("123", UserStatus.ACTIVE);
      expect(result.error).toBe("fail");
    });

    test("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("netfail"));
      const result = await updateUserStatus("123", UserStatus.ACTIVE);
      expect(result.error).toBe("netfail");
    });
  });

  // ------------------------------------------------------------
  // getUserByID
  // ------------------------------------------------------------
  describe("getUserByID", () => {
    test("successfully returns user", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: "u1",
            email: "test@test.com",
            first_name: "First",
            last_name: "Last",
            is_locked: false,
            code_context_id: "ctx",
            status: "ACTIVE",
            role: "student",
            settings: {}
          }
        })
      });

      const result = await getUserByID("u1");
      expect(result.user?.id).toBe("u1");
      expect(result.user?.email).toBe("test@test.com");
      expect(result.error).toBeUndefined();
    });

    test("returns error when response not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Err",
        json: async () => ({ message: "Server fail" })
      });

      const result = await getUserByID("u1");
      expect(result.error).toBe("Server fail");
    });

    test("returns error when data missing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      const result = await getUserByID("u1");
      expect(result.error).toBe("Invalid response: Missing user data");
    });

    test("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("boom"));
      const result = await getUserByID("u1");
      expect(result.error).toBe("boom");
    });
  });

  // ------------------------------------------------------------
  // getUserSection
  // ------------------------------------------------------------
  describe("getUserSection", () => {
    test("successfully returns user section ID", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { user_section_id: "sec123" }
        })
      });

      const result = await getUserSection("u1", "class1");
      expect(result.userSectionId).toBe("sec123");
    });

    test("returns error for missing section id", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      const result = await getUserSection("u1", "class1");
      expect(result.error).toBe("Invalid response: Missing user_section_id");
    });

    test("returns backend error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad",
        json: async () => ({ error: "Section fail" })
      });

      const result = await getUserSection("u1", "class1");
      expect(result.error).toBe("Section fail");
    });

    test("handles network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("oops"));
      const result = await getUserSection("u1");
      expect(result.error).toBe("oops");
    });
  });

  // ------------------------------------------------------------
  // updateUserSection
  // ------------------------------------------------------------
  describe("updateUserSection", () => {
    test("successfully updates user section", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      const result = await updateUserSection(
        "u1",
        UserSectionStatus.COMPLETE,
        "section1"
      );
      expect(result.error).toBeUndefined();
    });

    test("returns error on backend failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad",
        json: async () => ({ error: "Update fail" })
      });

      const result = await updateUserSection("u1", UserSectionStatus.ACTIVE);
      expect(result.error).toBe("Update fail");
    });

    test("handles network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("netfail"));
      const result = await updateUserSection("u1", UserSectionStatus.ACTIVE);
      expect(result.error).toBe("netfail");
    });
  });

  // ------------------------------------------------------------
  // getUserClasses
  // ------------------------------------------------------------
  describe("getUserClasses", () => {
    test("successfully returns user classes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              userClass: {
                id: "c1",
                class_title: "Math",
                class_code: "MTH101",
                instructor_id: "i1",
                class_hex_color: "#fff",
                class_image_cover: "img.png",
                created_at: "now"
              }
            }
          ]
        })
      });

      const result = await getUserClasses("u1");
      expect(result.data?.[0].id).toBe("c1");
      expect(result.error).toBeUndefined();
    });

    test("returns error when array is missing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      const result = await getUserClasses("u1");
      expect(result.error).toBe("Invalid response: expected an array of classes");
    });

    test("returns backend error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "NF",
        json: async () => ({ message: "Classes not found" })
      });

      const result = await getUserClasses("u1");
      expect(result.error).toBe("Classes not found");
    });

    test("handles network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("down"));
      const result = await getUserClasses("u1");
      expect(result.error).toBe("down");
    });
  });
});
