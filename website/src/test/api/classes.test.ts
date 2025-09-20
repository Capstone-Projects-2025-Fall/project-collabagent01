/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createClass,
  getClassesByInstructor,
  registerUserToClass,
  getClassActivityByClassId,
  updateStudentEnrollmentStatus,
} from "../../api/classes";
import { EnrollmentStatus } from "../../types";

// Mock fetch and supabase
const originalFetch = global.fetch;
jest.mock("../../api/endpoints", () => ({
  CLASS_ENDPOINT: "http://mock-api/class",
  LOG_ENDPOINT: "http://mock-api/logs",
}));

jest.mock("../../supabaseClient", () => {
  return {
    supabase: {
      from: jest.fn(() => ({
        update: jest.fn(() => ({
          eq: jest.fn().mockReturnThis(),
        })),
      })),
    },
  };
});

describe("class-api", () => {
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("successfully creates a class", async () => {
    const mockClass = {
      classTitle: "Test",
      classCode: "123",
      instructorId: "abc",
    };
    const mockResponse = {
      ok: true,
      json: async () => ({ data: { id: "class-id" } }),
    };

    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse as Response);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createClass(mockClass as any);

    expect(result.data?.id).toBe("class-id");
  });

  it("fetches classes by instructor", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        data: [
          {
            id: "1",
            class_title: "Class 1",
            class_code: "C1",
            instructor_id: "instructor-1",
            class_hex_color: "#fff",
            class_image_cover: "img.jpg",
            created_at: "now",
            class_description: "desc",
          },
        ],
      }),
    };

    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse as Response);
    const result = await getClassesByInstructor("instructor-1");

    expect(result.data?.[0].classTitle).toBe("Class 1");
  });

  it("registers a user to a class", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ data: { id: "reg-id" } }),
    };

    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse as Response);
    const result = await registerUserToClass("student-1", "class-1");

    expect(result.data?.id).toBe("reg-id");
  });

  it("fetches class activity logs", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        data: [
          {
            id: "log-1",
            event: "EVENT_A",
            timestamp: "now",
            time_lapse: 3,
            metadata: {
              user_id: "user1",
              has_bug: false,
              suggestion_id: "s1",
              user_section_id: "sec1",
              user_class_id: "class1",
            },
          },
        ],
      }),
    };

    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse as Response);
    const result = await getClassActivityByClassId("class-1");

    expect(result.data?.[0].event).toBe("EVENT_A");
  });

  it("updates student enrollment status", async () => {
    const result = await updateStudentEnrollmentStatus(
      "class-1",
      "student-1",
      "ENROLLED" as EnrollmentStatus
    );

    expect(result.success).toBe(true);
  });

  it("handles createClass network error", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("Network error"));

    const result = await createClass({} as any);
    expect(result.error).toBe("Network error");
  });

  it("handles createClass with non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ message: "Create failed" }),
    } as Response);

    const result = await createClass({} as any);
    expect(result.error).toBe("Create failed");
  });

  it("handles createClass with missing id", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: {} }),
    } as Response);

    const result = await createClass({} as any);
    expect(result.error).toBe("Invalid response: expected class ID");
  });

  it("handles getClassesByInstructor fetch error", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("Timeout"));

    const result = await getClassesByInstructor("timeout");
    expect(result.error).toBe("Timeout");
  });

  it("handles getClassesByInstructor missing data", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    const result = await getClassesByInstructor("instructor-id");
    expect(result.error).toBe("Invalid response: expected list of classes");
  });

  it("handles registerUserToClass fetch error", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("Failed"));

    const result = await registerUserToClass("s1", "c1");
    expect(result.error).toBe("Failed");
  });

  it("handles registerUserToClass non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      statusText: "Conflict",
      json: async () => ({ message: "Already registered" }),
    } as Response);

    const result = await registerUserToClass("s1", "c1");
    expect(result.error).toBe("Already registered");
  });

  it("handles getClassActivityByClassId fetch error", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("Timeout"));

    const result = await getClassActivityByClassId("class-1");
    expect(result.error).toBe("Timeout");
  });

  it("handles getClassActivityByClassId non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ message: "Logs not found" }),
    } as Response);

    const result = await getClassActivityByClassId("class-id");
    expect(result.error).toBe("Logs not found");
  });

  it("handles getClassActivityByClassId with invalid array", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: "not-an-array" }),
    } as Response);

    const result = await getClassActivityByClassId("class-id");
    expect(result.error).toBe(
      "Invalid response: expected an array of activity logs"
    );
  });

  it("handles updateStudentEnrollmentStatus with supabase error", async () => {
    const eqMock = jest.fn();
    const errorResult = { error: { message: "DB error" } };

    eqMock.mockReturnValueOnce(errorResult); // for .eq("student_id", ...)

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../../supabaseClient").supabase.from = jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn().mockReturnValue({
          eq: eqMock,
        }),
      })),
    }));

    const result = await updateStudentEnrollmentStatus(
      "c1",
      "s1",
      EnrollmentStatus.ENROLLED
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });
});
