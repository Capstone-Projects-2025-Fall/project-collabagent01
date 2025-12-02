import * as vscode from "vscode";

jest.mock("vscode");
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

    (globalContext as any).globalState = {
      get: (key: string) => mockState.get(key),
      update: (key: string, value: any) => mockState.set(key, value),
    };

    jest.clearAllMocks();

    (vscode.workspace.fs.readFile as any) = jest.fn();
    (vscode.window.showInputBox as any) = jest.fn();
    (getSupabase as jest.Mock).mockReset();
  });

  const DISPLAY_NAME_KEY = "collabAgent.displayName";

  // -------------------------------------------------------------------------
  // Cached value path
  // -------------------------------------------------------------------------

  test("returns cached display name", async () => {
    mockState.set(DISPLAY_NAME_KEY, "CachedUser");

    const result = await getOrInitDisplayName(true);

    expect(result).toEqual({
      displayName: "CachedUser",
      source: "cached",
    });
  });

  // -------------------------------------------------------------------------
  // Supabase metadata path
  // -------------------------------------------------------------------------

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

    // mock git config read to fail so it goes to system username
    (vscode.workspace.fs.readFile as any).mockRejectedValue(new Error("fail"));

    const result = await getOrInitDisplayName(true);

    expect(result.displayName).toBe("systemUser");
    expect(result.source).toBe("fallback");
  });

  // -------------------------------------------------------------------------
  // Git config fallback
  // -------------------------------------------------------------------------

  test("reads git config name fallback", async () => {
    const gitConfig = `
[user]
    name = GitUserName
`;

    (vscode.workspace.fs.readFile as any).mockResolvedValue(
      Buffer.from(gitConfig)
    );

    // Force Supabase to return null user
    (getSupabase as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const result = await getOrInitDisplayName(true);

    expect(result).toEqual({
      displayName: "GitUserName",
      source: "fallback",
    });
  });

  test("git config missing → fallback continues", async () => {
    (vscode.workspace.fs.readFile as any).mockRejectedValue(new Error("nope"));

    (getSupabase as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const result = await getOrInitDisplayName(true);

    // systemUser from mocked os.userInfo()
    expect(result).toEqual({
      displayName: "systemUser",
      source: "fallback",
    });
  });

  // -------------------------------------------------------------------------
  // System username fallback
  // -------------------------------------------------------------------------

  test("uses system username fallback", async () => {
    (vscode.workspace.fs.readFile as any).mockRejectedValue(new Error("fail"));
    (getSupabase as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const result = await getOrInitDisplayName(true);

    expect(result.displayName).toBe("systemUser");
    expect(result.source).toBe("fallback");
  });

  // -------------------------------------------------------------------------
  // Prompt path
  // -------------------------------------------------------------------------

  test("prompts user for name when nonInteractive=false", async () => {
    // no supabase user
    (getSupabase as jest.Mock).mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    });

    // git config fails
    (vscode.workspace.fs.readFile as any).mockRejectedValue(new Error("fail"));

    (vscode.window.showInputBox as any).mockResolvedValue("PromptUser");

    const result = await getOrInitDisplayName(false);

    expect(result).toEqual({
      displayName: "PromptUser",
      source: "prompt",
    });
    expect(mockState.get(DISPLAY_NAME_KEY)).toBe("PromptUser");
  });

  // -------------------------------------------------------------------------
  // Final fallback ("User")
  // -------------------------------------------------------------------------

  test("final fallback returns 'User'", async () => {
    (getSupabase as jest.Mock).mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    });

    (vscode.workspace.fs.readFile as any).mockRejectedValue(new Error("fail"));
    (vscode.window.showInputBox as any).mockResolvedValue(undefined);

    // force os.userInfo to throw so it doesn't use systemUser
    jest.mock("os", () => ({
      homedir: () => "/home/test",
      userInfo: () => {
        throw new Error("fail");
      },
    }));

    const result = await getOrInitDisplayName(false);

    expect(result).toEqual({
      displayName: "User",
      source: "fallback",
    });
  });

  // -------------------------------------------------------------------------
  // setDisplayNameExplicit
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // getCachedDisplayName
  // -------------------------------------------------------------------------

  test("getCachedDisplayName returns cached value", () => {
    mockState.set(DISPLAY_NAME_KEY, "Nick");
    expect(getCachedDisplayName()).toBe("Nick");
  });

  test("getCachedDisplayName returns undefined if none", () => {
    expect(getCachedDisplayName()).toBeUndefined();
  });
});
