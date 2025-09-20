/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  UserClassInfo,
  useUserClasses,
  useUserClassStatus,
} from "../../hooks/useUserClasses";
import { getUserClasses } from "../../api/user";
import { StudentStatus } from "../../api/types/user";

// Mocks
jest.mock("../../api/user", () => ({
  getUserClasses: jest.fn(),
}));

jest.mock("../../hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockUseAuth = require("../../hooks/useAuth").useAuth as jest.Mock;
const mockGetUserClasses = getUserClasses as jest.MockedFunction<
  typeof getUserClasses
>;
const mockFrom = require("../../supabaseClient").supabase.from as jest.Mock;

const mockClassInfo: UserClassInfo = {
  userClass: {
    id: "class-1",
    classTitle: "Physics",
    classCode: "PHY101",
    instructorId: "instructor-1",
    classHexColor: "#abc123",
    classImageCover: null,
    classDescription: "Intro to Physics",
    createdAt: "2024-01-01T00:00:00Z",
  },
  studentStatus: StudentStatus.ACTIVE,
};

describe("useUserClasses", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "student-1" } });
  });

  it("fetches user classes and includes special options", async () => {
    mockGetUserClasses.mockResolvedValue({
      data: [mockClassInfo],
      error: undefined,
    });

    const { result } = renderHook(() => useUserClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.originalClasses).toHaveLength(1);
    expect(result.current.classes.length).toBe(3); // all + 1 + non-class
    expect(result.current.classes[0].id).toBe("all");
    expect(result.current.classes[1].id).toBe("class-1");
    expect(result.current.classes[2].id).toBe("non-class");
  });

  it("handles missing user ID", async () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useUserClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.originalClasses).toEqual([]);
    expect(result.current.classes.length).toBe(2); // just all + non-class
  });

  it("selects a class correctly", async () => {
    mockGetUserClasses.mockResolvedValue({
      data: [mockClassInfo],
      error: undefined,
    });

    const { result } = renderHook(() => useUserClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleClassSelect({ id: "class-1", type: "class" });
    });

    expect(result.current.selectedClassId).toBe("class-1");
    expect(result.current.selectedClassType).toBe("class");
    expect(result.current.selectedClass?.userClass.classTitle).toBe("Physics");
  });

  it("handles API error", async () => {
    mockGetUserClasses.mockResolvedValue({
      data: undefined,
      error: "Failed to load",
    });

    const { result } = renderHook(() => useUserClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Failed to load");
    expect(result.current.originalClasses).toEqual([]);
  });
});

describe("useUserClassStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches user class status", async () => {
    const selectMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockReturnThis();
    const singleMock = jest.fn().mockResolvedValue({
      data: { user_class_status: StudentStatus.SUSPENDED },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: selectMock,
      eq: eqMock,
      single: singleMock,
    });

    const { result } = renderHook(() =>
      useUserClassStatus("student-1", "class-1")
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.studentStatus).toBe(StudentStatus.SUSPENDED);
    expect(result.current.error).toBeNull();
  });

  it("handles missing studentId or classId", async () => {
    const { result } = renderHook(() => useUserClassStatus(null, "class-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("handles Supabase error", async () => {
    const selectMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockReturnThis();
    const singleMock = jest.fn().mockResolvedValue({
      data: null,
      error: { code: "OTHER", message: "DB error" },
    });

    mockFrom.mockReturnValue({
      select: selectMock,
      eq: eqMock,
      single: singleMock,
    });

    const { result } = renderHook(() =>
      useUserClassStatus("student-1", "class-1")
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("DB error");
    expect(result.current.studentStatus).toBeNull();
  });

  it("ignores PGRST116 (no row) error", async () => {
    const selectMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockReturnThis();
    const singleMock = jest.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No row found" },
    });

    mockFrom.mockReturnValue({
      select: selectMock,
      eq: eqMock,
      single: singleMock,
    });

    const { result } = renderHook(() =>
      useUserClassStatus("student-1", "class-1")
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.studentStatus).toBeNull();
  });

  it("handles selection of 'all' and 'non-class' options", async () => {
    mockGetUserClasses.mockResolvedValue({
      data: [mockClassInfo],
      error: undefined,
    });

    const { result } = renderHook(() => useUserClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Select "all"
    act(() => {
      result.current.handleClassSelect({ id: "all", type: "all" });
    });
    expect(result.current.selectedClassId).toBe("all");
    expect(result.current.selectedClassType).toBe("all");
    expect(result.current.selectedClass?.userClass.classTitle).toBe("All");

    // Select "non-class"
    act(() => {
      result.current.handleClassSelect({ id: "non-class", type: "non-class" });
    });
    expect(result.current.selectedClassId).toBe("non-class");
    expect(result.current.selectedClassType).toBe("non-class");
    expect(result.current.selectedClass?.userClass.classTitle).toBe(
      "Non-class Activities"
    );
  });

  it("getSelectedClass returns null if selected class not found", async () => {
    mockGetUserClasses.mockResolvedValue({
      data: [],
      error: undefined,
    });

    const { result } = renderHook(() => useUserClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleClassSelect({ id: "missing-id", type: "class" });
    });

    expect(result.current.selectedClass).toBe(null);
  });
});
