jest.mock("vscode");
jest.mock("../extension", () => ({
  globalContext: {
    globalState: {
      get: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("../auth/supabaseClient", () => ({
  getSupabase: jest.fn(() => ({
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({
          data: {
            session: {
              provider_token: "session-token-123",
            },
          },
          error: null,
        })
      ),
    },
  })),
}));
global.fetch = jest.fn();

import * as vscode from "vscode";
import {
  parseGitHubRepoUrl,
  verifyGitHubPushAccess,
  isGitHubRepository,
  promptGitHubVerification,
  storeGitHubAccessToken,
  clearGitHubAccessToken,
} from "../../services/github-verification-service";

import { globalContext } from "../../extension";
import { getSupabase } from "../../auth/supabaseClient";

// Helper typed fetch mock
const mockFetch = global.fetch as jest.Mock;

describe("GitHub Verification Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset default fake vscode mocks
    vscode.window.showInformationMessage = jest.fn();
    vscode.window.showErrorMessage = jest.fn();
    vscode.window.withProgress = jest.fn((_opts, cb: any) => cb());
  });

  // -------------------------------------------------------------------
  // parseGitHubRepoUrl
  // -------------------------------------------------------------------
  describe("parseGitHubRepoUrl", () => {
    test("parses HTTPS URL", () => {
      const result = parseGitHubRepoUrl("https://github.com/user/repo");
      expect(result).toEqual({ owner: "user", repo: "repo" });
    });

    test("parses HTTPS URL with .git", () => {
      const result = parseGitHubRepoUrl("https://github.com/user/repo.git");
      expect(result).toEqual({ owner: "user", repo: "repo" });
    });

    test("parses SSH format", () => {
      const result = parseGitHubRepoUrl("git@github.com:user/repo.git");
      expect(result).toEqual({ owner: "user", repo: "repo" });
    });

    test("returns null for invalid URL", () => {
      expect(parseGitHubRepoUrl("not a url")).toBeNull();
    });

    test("catches exceptions and returns null", () => {
      expect(parseGitHubRepoUrl((null as unknown) as string)).toBeNull();
    });
  });

  // -------------------------------------------------------------------
  // isGitHubRepository
  // -------------------------------------------------------------------
  describe("isGitHubRepository", () => {
    test("true for GitHub URLs", () => {
      expect(isGitHubRepository("https://github.com/user/repo")).toBe(true);
    });

    test("false for undefined", () => {
      expect(isGitHubRepository(undefined)).toBe(false);
    });

    test("false for non-GitHub URLs", () => {
      expect(isGitHubRepository("https://gitlab.com/user/repo")).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // verifyGitHubPushAccess
  // -------------------------------------------------------------------
  describe("verifyGitHubPushAccess", () => {
    test("fails if repo URL is invalid", async () => {
      const result = await verifyGitHubPushAccess("invalid");

      expect(result.hasAccess).toBe(false);
      expect(result.error).toMatch(/Invalid GitHub repository URL/);
    });

    test("fails if GitHub token missing", async () => {
      globalContext.globalState.get = jest.fn(() => undefined);

      (getSupabase as jest.Mock).mockReturnValue({
        auth: { getSession: jest.fn(() => ({ data: { session: null }, error: null })) },
      });

      const result = await verifyGitHubPushAccess("https://github.com/user/repo");

      expect(result.hasAccess).toBe(false);
      expect(result.error).toMatch(/Not authenticated/);
    });

    test("fails if repo does not exist (404)", async () => {
      globalContext.globalState.get = jest.fn(() => "token123");

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await verifyGitHubPushAccess("https://github.com/user/unknown-repo");

      expect(result.hasAccess).toBe(false);
      expect(result.error).toMatch(/Repository not found/);
    });

    test("fails if unauthorized (401)", async () => {
      globalContext.globalState.get = jest.fn(() => "token123");

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      const result = await verifyGitHubPushAccess("https://github.com/user/repo");

      expect(result.error).toMatch(/authentication failed/i);
    });

    test("fails if GitHub returns unexpected error", async () => {
      globalContext.globalState.get = jest.fn(() => "token123");

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
      });

      const result = await verifyGitHubPushAccess("https://github.com/user/repo");

      expect(result.error).toMatch(/Failed to access repository/i);
    });

    test("fails if permissions missing", async () => {
      globalContext.globalState.get = jest.fn(() => "token123");

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          owner: { login: "user" },
          name: "repo",
          full_name: "user/repo",
          id: 1,
          html_url: "url",
          permissions: null,
        }),
      });

      const result = await verifyGitHubPushAccess("https://github.com/user/repo");

      expect(result.hasAccess).toBe(false);
      expect(result.error).toMatch(/Unable to determine repository permissions/);
    });

    test("fails if user lacks push/admin", async () => {
      globalContext.globalState.get = jest.fn(() => "token123");

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          owner: { login: "user" },
          name: "repo",
          full_name: "user/repo",
          id: 1,
          html_url: "url",
          permissions: { admin: false, push: false, pull: true },
        }),
      });

      const result = await verifyGitHubPushAccess("https://github.com/user/repo");

      expect(result.hasAccess).toBe(false);
      expect(result.permission).toBe("read");
    });

    test("succeeds when user has write access", async () => {
      globalContext.globalState.get = jest.fn(() => "token123");

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          owner: { login: "user" },
          name: "repo",
          full_name: "user/repo",
          id: 1,
          html_url: "url",
          permissions: { admin: false, push: true, pull: true },
        }),
      });

      const result = await verifyGitHubPushAccess("https://github.com/user/repo");

      expect(result.hasAccess).toBe(true);
      expect(result.permission).toBe("write");
    });

    test("succeeds when user has admin access", async () => {
      globalContext.globalState.get = jest.fn(() => "token123");

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          owner: { login: "user" },
          name: "repo",
          full_name: "user/repo",
          id: 1,
          html_url: "url",
          permissions: { admin: true, push: true, pull: true },
        }),
      });

      const result = await verifyGitHubPushAccess("https://github.com/user/repo");

      expect(result.hasAccess).toBe(true);
      expect(result.permission).toBe("admin");
    });
  });

  // -------------------------------------------------------------------
  // promptGitHubVerification
  // -------------------------------------------------------------------
  describe("promptGitHubVerification", () => {
    test("shows success message when access is allowed", async () => {
      const info = {
        hasAccess: true,
        permission: "write",
        repoInfo: { fullName: "user/repo" },
      };

      jest.spyOn(require("../../services/github-verification-service"), "verifyGitHubPushAccess")
        .mockResolvedValue(info);

      await promptGitHubVerification("https://github.com/user/repo");

      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    test("shows error message when access denied", async () => {
      const info = {
        hasAccess: false,
        error: "bad token",
      };

      jest.spyOn(require("../../services/github-verification-service"), "verifyGitHubPushAccess")
        .mockResolvedValue(info);

      await promptGitHubVerification("https://github.com/user/repo");

      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  // storeGitHubAccessToken / clearGitHubAccessToken
  // -------------------------------------------------------------------
  describe("token storage", () => {
    test("stores GitHub token", async () => {
      await storeGitHubAccessToken("abc123");

      expect(globalContext.globalState.update).toHaveBeenCalledWith(
        "github_access_token",
        "abc123"
      );
    });

    test("clears GitHub token", async () => {
      await clearGitHubAccessToken();

      expect(globalContext.globalState.update).toHaveBeenCalledWith(
        "github_access_token",
        undefined
      );
    });
  });
});