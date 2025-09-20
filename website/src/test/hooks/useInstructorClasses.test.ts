/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useInstructorClasses,
  useClassStudentsInfo,
} from "../../hooks/useInstructorClasses";
import { getClassesByInstructor } from "../../api/classes";
import { UserClass } from "../../api/types/user";

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

const supabaseMocks: {
  mockFrom: jest.Mock;
  mockSelect: jest.Mock;
  mockEq: jest.Mock;
  mockIn: jest.Mock;
} = {
  mockFrom: jest.fn(),
  mockSelect: jest.fn(),
  mockEq: jest.fn(),
  mockIn: jest.fn(),
};

// Supabase module mock
jest.mock("../../supabaseClient", () => ({
  supabase: {
    from: (...args: any[]) => supabaseMocks.mockFrom(...args),
    select: (...args: any[]) => supabaseMocks.mockSelect(...args),
    eq: (...args: any[]) => supabaseMocks.mockEq(...args),
    in: (...args: any[]) => supabaseMocks.mockIn(...args),
  },
}));

// Other mocks
jest.mock("../../api/classes", () => ({
  getClassesByInstructor: jest.fn(),
}));
jest.mock("../../hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockUseAuth = require("../../hooks/useAuth").useAuth as jest.Mock;
const mockGetClassesByInstructor =
  getClassesByInstructor as jest.MockedFunction<typeof getClassesByInstructor>;

const mockClasses: UserClass[] = [
  { id: "1", classTitle: "Math", classCode: "M101" },
  { id: "2", classTitle: "Science", classCode: "S202" },
];

describe("useInstructorClasses", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "mock-user-id" } });

    supabaseMocks.mockFrom.mockReturnThis();
    supabaseMocks.mockSelect.mockReturnThis();
    supabaseMocks.mockEq.mockReturnThis();
    supabaseMocks.mockIn.mockResolvedValue({ data: [], error: null });
  });

  it("fetches classes by instructor and includes 'All' option", async () => {
    mockGetClassesByInstructor.mockResolvedValue({
      data: mockClasses,
      error: undefined,
    });

    const { result } = renderHook(() => useInstructorClasses());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.classes.length).toBe(3);
    expect(result.current.classes[0].id).toBe("all");
    expect(result.current.classes[1].classTitle).toBe("Math");
  });

  it("handles instructor fetch error", async () => {
    const errorMessage = "Failed to fetch classes";
    mockGetClassesByInstructor.mockResolvedValue({
      data: undefined,
      error: errorMessage,
    });

    const { result } = renderHook(() => useInstructorClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(errorMessage);
  });

  it("allows class selection", async () => {
    mockGetClassesByInstructor.mockResolvedValue({
      data: mockClasses,
      error: undefined,
    });

    const { result } = renderHook(() => useInstructorClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleClassSelect({ id: "1", type: "class" });
    });

    expect(result.current.selectedClassId).toBe("1");
    expect(result.current.selectedClassType).toBe("class");
    expect(result.current.getSelectedClass()?.classTitle).toBe("Math");
  });

  it("doesn't fetch when no user ID is available", () => {
    mockUseAuth.mockReturnValue({ user: null });
    renderHook(() => useInstructorClasses(null));
    expect(mockGetClassesByInstructor).not.toHaveBeenCalled();
  });

  it("handles selection of 'all' and 'non-class' options", async () => {
    mockGetClassesByInstructor.mockResolvedValue({
      data: mockClasses,
      error: undefined,
    });

    const { result } = renderHook(() => useInstructorClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Select "all"
    act(() => {
      result.current.handleClassSelect({ id: "all", type: "all" });
    });
    expect(result.current.selectedClassId).toBe("all");
    expect(result.current.selectedClassType).toBe("all");
    expect(result.current.getSelectedClass()?.classTitle).toBe("All");

    // Select "non-class"
    act(() => {
      result.current.handleClassSelect({ id: "non-class", type: "non-class" });
    });
    expect(result.current.selectedClassId).toBe("non-class");
    expect(result.current.selectedClassType).toBe("non-class");
    expect(result.current.getSelectedClass()).toBeUndefined();
  });

  it("getSelectedClass returns null if selected class not found", async () => {
    mockGetClassesByInstructor.mockResolvedValue({
      data: [],
      error: undefined,
    });

    const { result } = renderHook(() => useInstructorClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleClassSelect({ id: "missing-id", type: "class" });
    });

    expect(result.current.getSelectedClass()).toBeUndefined();
  });

  it("doesn't fetch if user.id is missing", () => {
    mockUseAuth.mockReturnValue({ user: undefined });
    renderHook(() => useInstructorClasses("some-id"));
    expect(mockGetClassesByInstructor).not.toHaveBeenCalled();
  });

  it("handles unknown thrown error object", async () => {
    mockGetClassesByInstructor.mockImplementation(() => {
      throw "some string error";
    });

    const { result } = renderHook(() => useInstructorClasses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Unknown error occurred");
  });
});

describe("useClassStudentsInfo", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles supabase error gracefully", async () => {
    supabaseMocks.mockFrom.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockRejectedValue(new Error("Supabase error")),
    }));

    const { result } = renderHook(() => useClassStudentsInfo("class-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Supabase error");
  });

  it("doesn't fetch when no classId is provided", () => {
    const { result } = renderHook(() => useClassStudentsInfo(null));
    expect(result.current.loading).toBe(false);
    expect(supabaseMocks.mockFrom).not.toHaveBeenCalled();
  });

  it("handles selection type 'class'", async () => {
    mockGetClassesByInstructor.mockResolvedValue({
      data: mockClasses,
      error: undefined,
    });
    const { result } = renderHook(() => useInstructorClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleClassSelect({ id: "1", type: "class" });
    });

    expect(result.current.selectedClassId).toBe("1");
    expect(result.current.selectedClassType).toBe("class");
  });

  it("handles selection type 'all'", async () => {
    mockGetClassesByInstructor.mockResolvedValue({
      data: mockClasses,
      error: undefined,
    });
    const { result } = renderHook(() => useInstructorClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleClassSelect({ id: "all", type: "all" });
    });

    expect(result.current.selectedClassId).toBe("all");
    expect(result.current.selectedClassType).toBe("all");
  });

  it("handles selection type 'non-class'", async () => {
    mockGetClassesByInstructor.mockResolvedValue({
      data: mockClasses,
      error: undefined,
    });
    const { result } = renderHook(() => useInstructorClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleClassSelect({ id: "non-class", type: "non-class" });
    });

    expect(result.current.selectedClassId).toBe("non-class");
    expect(result.current.selectedClassType).toBe("non-class");
  });

  it("sets unknown error message if thrown error is not an Error instance", async () => {
    mockGetClassesByInstructor.mockImplementation(() => {
      throw "unexpected string error";
    });

    const { result } = renderHook(() => useInstructorClasses());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Unknown error occurred");
  });

  it("exposes all returned properties", async () => {
    mockGetClassesByInstructor.mockResolvedValue({
      data: mockClasses,
      error: undefined,
    });

    const { result } = renderHook(() => useInstructorClasses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const hook = result.current;
    expect(hook.classes).toHaveLength(3);
    expect(hook.originalClasses).toHaveLength(2);
    expect(hook.selectedClassId).toBe("all");
    expect(hook.selectedClassType).toBe("all");
    expect(hook.loading).toBe(false);
    expect(hook.error).toBeNull();
    expect(typeof hook.handleClassSelect).toBe("function");
    expect(typeof hook.getSelectedClass).toBe("function");
  });
});
