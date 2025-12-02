/**
 * FINAL FIXED VERSION — file-snapshot-service.test.ts
 * All 8 failures resolved.
 */

jest.mock("vscode", () => ({
  workspace: {
    getConfiguration: jest.fn(),
  },
  window: {
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showInputBox: jest.fn(),
    showQuickPick: jest.fn(),
  },
}));

// -------------------------
// Mock auth-service
// -------------------------
jest.mock("../../services/auth-service", () => ({
  getAuthContext: jest.fn(),
}));

// -------------------------
// Mock globalContext
// -------------------------
const mockGlobalGet = jest.fn();

jest.mock("../../extension", () => ({
  globalContext: {
    globalState: {
      get: mockGlobalGet,
    },
  },
}));

// -------------------------
// Mock Supabase client
// -------------------------
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();

const mockSupabase = {
  auth: {
    admin: {
      listUsers: jest.fn(),
    },
  },
  from: mockFrom,
};

mockFrom.mockReturnValue({
  insert: mockInsert,
  select: mockSelect,
  single: mockSingle,
});

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => mockSupabase),
}));

// -------------------------
// Bring in mocks
// -------------------------
const config = require("vscode").workspace.getConfiguration;
const authService = require("../../services/auth-service");

// -------------------------
// Test Suite
// -------------------------
describe("file snapshot service", () => {
  const loadModule = () => require("../../services/file-snapshot-service");

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    config.mockReturnValue({
      get: jest.fn().mockImplementation((key: string) => {
        if (key.endsWith("supabase.url")) return "https://example.supabase.co";
        if (key.endsWith("supabase.anonKey")) return "anon-key";
        return undefined;
      }),
    });

    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });
  });

  // ------------------------------------------------------------------
  test("getSupabaseClient throws when config missing", async () => {
    const { addFileSnapshot } = loadModule();

    config.mockReturnValue({
      get: jest.fn().mockReturnValue(undefined), // missing config
    });

    const result = await addFileSnapshot({
      file_path: "file",
      snapshot: "snap",
      changes: "chg",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Supabase configuration missing");
  });

  // ------------------------------------------------------------------
  test("addFileSnapshot fails when user not authenticated", async () => {
    const { addFileSnapshot } = loadModule();

    authService.getAuthContext.mockResolvedValue({
      context: undefined,
      error: "no ctx",
    });

    const result = await addFileSnapshot({
      file_path: "x",
      snapshot: "y",
      changes: "z",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated.");
  });

  // ------------------------------------------------------------------
  test("addFileSnapshot fails when auth user not found", async () => {
    const { addFileSnapshot } = loadModule();

    authService.getAuthContext.mockResolvedValue({
      context: { email: "test@example.com" },
      error: undefined,
    });

    mockSupabase.auth.admin.listUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });

    const result = await addFileSnapshot({
      file_path: "file",
      snapshot: "snap",
      changes: "chg",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Could not resolve Supabase auth user id from current user."
    );
  });

  // ------------------------------------------------------------------
  test("addFileSnapshot fails when no team selected", async () => {
    const { addFileSnapshot } = loadModule();

    authService.getAuthContext.mockResolvedValue({
      context: { email: "test@example.com" },
      error: undefined,
    });

    mockSupabase.auth.admin.listUsers.mockResolvedValue({
      data: { users: [{ email: "test@example.com", id: "user123" }] },
      error: null,
    });

    mockGlobalGet.mockReturnValue(undefined);

    const result = await addFileSnapshot({
      file_path: "file",
      snapshot: "snap",
      changes: "chg",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Active team is not selected.");
  });

  // ------------------------------------------------------------------
  test("addFileSnapshot returns error when Supabase insert fails", async () => {
    const { addFileSnapshot } = loadModule();

    authService.getAuthContext.mockResolvedValue({
      context: { email: "test@example.com" },
      error: undefined,
    });

    mockSupabase.auth.admin.listUsers.mockResolvedValue({
      data: { users: [{ email: "test@example.com", id: "user123" }] },
      error: null,
    });

    mockGlobalGet.mockReturnValue("team-XYZ");

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "insert failed" },
    });

    const result = await addFileSnapshot({
      file_path: "test.ts",
      snapshot: "snap-1",
      changes: "chg-1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("insert failed");
  });

  // ------------------------------------------------------------------
  test("addFileSnapshot succeeds and returns id", async () => {
    const { addFileSnapshot } = loadModule();

    authService.getAuthContext.mockResolvedValue({
      context: { email: "test@example.com" },
      error: undefined,
    });

    mockSupabase.auth.admin.listUsers.mockResolvedValue({
      data: { users: [{ email: "test@example.com", id: "user123" }] },
      error: null,
    });

    mockGlobalGet.mockReturnValue("team-1");

    mockSingle.mockResolvedValue({
      data: { id: "snapshot-123" },
      error: null,
    });

    const result = await addFileSnapshot({
      file_path: "/path/a.ts",
      snapshot: "snap",
      changes: "chg",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe("snapshot-123");
  });

  // ------------------------------------------------------------------
  test("cryptoRandomUUIDFallback uses crypto.randomUUID when present", () => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.mock("crypto", () => ({
      randomUUID: jest.fn(() => "real-uuid-123"),
    }));

    const service = require("../../services/file-snapshot-service");

    const uuid = service.__test.cryptoRandomUUIDFallback();
    expect(uuid).toBe("real-uuid-123");
  });

  // ------------------------------------------------------------------
  test("cryptoRandomUUIDFallback uses fallback when randomUUID not available", () => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.mock("crypto", () => ({
      randomUUID: undefined,
    }));

    const service = require("../../services/file-snapshot-service");

    const uuid = service.__test.cryptoRandomUUIDFallback();

    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
