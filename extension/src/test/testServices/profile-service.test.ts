import * as vscode from "vscode";
import * as os from "os"; 

function mockOsUserInfoOnce(fn: () => any) {
  (os.userInfo as jest.Mock).mockImplementationOnce(fn);
}

//  create full vscode mock including workspace.fs
jest.mock("vscode", () => ({
  window: {
    showInputBox: jest.fn(),
    showInformationMessage: jest.fn(),
  },
  workspace: {
    fs: {
      readFile: jest.fn(),
    },
  },
  Uri: {
    file: (path: string) => path,   // ⭐ FIX
  },
}));

jest.mock("../../extension", () => ({
  globalContext: {
    globalState: {
      get: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("../../auth/supabaseClient", () => ({
  getSupabase: jest.fn(),
}));

jest.mock("os", () => ({
  homedir: jest.fn(() => "/home/test"),
  userInfo: jest.fn(() => ({ username: "systemUser" })),
}));

import { getSupabase } from "../../auth/supabaseClient";
import { globalContext } from "../../extension";

import {
  getOrInitDisplayName,
  setDisplayNameExplicit,
  getCachedDisplayName,
} from "../../services/profile-service";

describe("profile-service", () => {
  const mockState = new Map<string, any>();

  beforeEach(() => {
    mockState.clear();

    // rewrite globalState getters
    (globalContext as any).globalState.get = (key: string) =>
      mockState.get(key);
    (globalContext as any).globalState.update = (key: string, value: any) =>
      mockState.set(key, value);

    jest.clearAllMocks();

    // ⭐ Reset the mocked readFile and inputBox functions
    (vscode.workspace.fs.readFile as any) = jest.fn();
    (vscode.window.showInputBox as any) = jest.fn();

    (getSupabase as jest.Mock).mockReset();
  });

  const DISPLAY_NAME_KEY = "collabAgent.displayName";

  test("returns cached display name", async () => {
    mockState.set(DISPLAY_NAME_KEY, "CachedUser");

    const result = await getOrInitDisplayName(true);

    expect(result).toEqual({
      displayName: "CachedUser",
      source: "cached",
    });
  });

  test("returns name from supabase metadata", async () => {
    (getSupabase as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { user_metadata: { full_name: "SupabaseUser" } } },
          error: null,
        }),
      },
    });

    const result = await getOrInitDisplayName(true);

    expect(result).toEqual({
      displayName: "SupabaseUser",
      source: "supabase",
    });

    expect(mockState.get(DISPLAY_NAME_KEY)).toBe("SupabaseUser");
  });

  test("supabase metadata fallback to email username", async () => {
    (getSupabase as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { email: "john@example.com", user_metadata: {} } },
          error: null,
        }),
      },
    });

    const result = await getOrInitDisplayName(true);

    expect(result.displayName).toBe("john");
    expect(result.source).toBe("supabase");
  });

  test("supabase throws → skip to fallback", async () => {
    (getSupabase as jest.Mock).mockImplementation(() => {
      throw new Error("supabase failure");
    });

    (vscode.workspace.fs.readFile as any).mockRejectedValue(new Error("fail"));

    const result = await getOrInitDisplayName(true);

    expect(result.displayName).toBe("systemUser");
    expect(result.source).toBe("fallback");
  });

  test("git config missing → fallback continues", async () => {
    (vscode.workspace.fs.readFile as any).mockRejectedValue(new Error("nope"));

    (getSupabase as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    mockOsUserInfoOnce(() => ({ username: "systemUser" }));  // ⭐ FIX

    const result = await getOrInitDisplayName(true);

    expect(result).toEqual({
      displayName: "systemUser",
      source: "fallback",
    });
  });

  test("git config missing → fallback continues", async () => {
    (vscode.workspace.fs.readFile as any).mockRejectedValue(new Error("nope"));

    (getSupabase as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });

    const result = await getOrInitDisplayName(true);

    expect(result).toEqual({
      displayName: "systemUser",
      source: "fallback",
    });
  });

  test("uses system username fallback", async () => {
    (vscode.workspace.fs.readFile as any).mockRejectedValue(new Error("fail"));

    (getSupabase as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });

    const result = await getOrInitDisplayName(true);

    expect(result.displayName).toBe("systemUser");
    expect(result.source).toBe("fallback");
  });

  test("prompts user for name when nonInteractive=false", async () => {
    mockOsUserInfoOnce(() => { throw new Error("block system fallback"); });

    (getSupabase as jest.Mock).mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    });

    (vscode.workspace.fs.readFile as any).mockRejectedValue(new Error("fail"));

    (vscode.window.showInputBox as any).mockResolvedValue("PromptUser");

    const result = await getOrInitDisplayName(false);

    expect(result).toEqual({
      displayName: "PromptUser",
      source: "prompt",
    });
  });

  test("final fallback returns 'User'", async () => {
    // supersedes the global mock, forcing system fallback to break
    mockOsUserInfoOnce(() => { throw new Error("fail"); });

    (getSupabase as jest.Mock).mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    });

    (vscode.workspace.fs.readFile as any).mockRejectedValue(new Error("fail"));
    (vscode.window.showInputBox as any).mockResolvedValue(undefined);

    const result = await getOrInitDisplayName(false);

    expect(result).toEqual({
      displayName: "User",
      source: "fallback",
    });
  });

  test("setDisplayNameExplicit updates global state & shows message", async () => {
    mockState.set(DISPLAY_NAME_KEY, "OldName");
    (vscode.window.showInputBox as any).mockResolvedValue("NewName");

    await setDisplayNameExplicit();

    expect(mockState.get(DISPLAY_NAME_KEY)).toBe("NewName");
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      'Collab Agent: Display name updated to "NewName"'
    );
  });

  test("setDisplayNameExplicit does nothing when cancelled", async () => {
    mockState.set(DISPLAY_NAME_KEY, "OldName");
    (vscode.window.showInputBox as any).mockResolvedValue(undefined);

    await setDisplayNameExplicit();

    expect(mockState.get(DISPLAY_NAME_KEY)).toBe("OldName");
  });

  test("getCachedDisplayName returns cached value", () => {
    mockState.set(DISPLAY_NAME_KEY, "Nick");
    expect(getCachedDisplayName()).toBe("Nick");
  });

  test("getCachedDisplayName returns undefined if none", () => {
    expect(getCachedDisplayName()).toBeUndefined();
  });
});
