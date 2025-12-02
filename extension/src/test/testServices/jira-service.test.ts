jest.mock("vscode");
jest.mock("axios");
jest.mock("../../config/backend-config", () => ({
  BACKEND_URL: "http://localhost:3000",
}));

import * as vscode from "vscode";
import axios from "axios";
import { JiraService } from "../../services/jira-service";

const mockedAxios = axios as unknown as {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
};

describe("JiraService", () => {
  const showInputBox = vscode.window.showInputBox as jest.Mock;
  const showQuickPick = vscode.window.showQuickPick as jest.Mock;
  const showErrorMessage = vscode.window.showErrorMessage as jest.Mock;
  const showInformationMessage = vscode.window.showInformationMessage as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockedAxios.put.mockReset();
    mockedAxios.delete.mockReset();
    // reset singleton
    (JiraService as any).instance = undefined;
  });

  const getService = () => JiraService.getInstance();

  // ---------------------------------------------------------------------------
  // getInstance / constructor
  // ---------------------------------------------------------------------------

  test("getInstance returns singleton instance", () => {
    const s1 = JiraService.getInstance();
    const s2 = JiraService.getInstance();
    expect(s1).toBe(s2);
  });

  // ---------------------------------------------------------------------------
  // initiateJiraAuth
  // ---------------------------------------------------------------------------

  test("initiateJiraAuth returns early when URL prompt cancelled", async () => {
    const service = getService();
    showInputBox.mockResolvedValueOnce(undefined); // jiraUrl

    await service.initiateJiraAuth("team1", "admin1");

    expect(showInputBox).toHaveBeenCalledTimes(1);
  });

  test("initiateJiraAuth happy path", async () => {
    const service = getService() as any;

    // URL, email, API token
    showInputBox
      .mockResolvedValueOnce("https://my.atlassian.net")
      .mockResolvedValueOnce("user@example.com")
      .mockResolvedValueOnce("this-is-a-long-api-token-1234567890");

    // Stub private helpers
    const testConnSpy = jest
      .spyOn(service, "testJiraConnection")
      .mockResolvedValue(true);
    const getProjKeySpy = jest
      .spyOn(service, "getProjectKey")
      .mockResolvedValue("PROJ");
    const saveConfigSpy = jest
      .spyOn(service, "saveJiraConfig")
      .mockResolvedValue(undefined);

    await service.initiateJiraAuth("team1", "admin1");

    expect(testConnSpy).toHaveBeenCalled();
    expect(getProjKeySpy).toHaveBeenCalled();
    expect(saveConfigSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        team_id: "team1",
        jira_url: "https://my.atlassian.net",
        jira_project_key: "PROJ",
        admin_user_id: "admin1",
      })
    );
    expect(showInformationMessage).toHaveBeenCalled();
  });

  test("initiateJiraAuth shows error when connection invalid", async () => {
    const service = getService() as any;

    showInputBox
      .mockResolvedValueOnce("https://my.atlassian.net")
      .mockResolvedValueOnce("user@example.com")
      .mockResolvedValueOnce("this-is-a-long-api-token-1234567890");

    jest
      .spyOn(service, "testJiraConnection")
      .mockResolvedValue(false);

    await service.initiateJiraAuth("team1", "admin1");

    expect(showErrorMessage).toHaveBeenCalledWith(
      "Failed to connect to Jira. Please check your credentials and try again."
    );
  });

  test("initiateJiraAuth returns when no project key selected", async () => {
    const service = getService() as any;

    showInputBox
      .mockResolvedValueOnce("https://my.atlassian.net")
      .mockResolvedValueOnce("user@example.com")
      .mockResolvedValueOnce("this-is-a-long-api-token-1234567890");

    jest
      .spyOn(service, "testJiraConnection")
      .mockResolvedValue(true);
    jest
      .spyOn(service, "getProjectKey")
      .mockResolvedValue(null);

    await service.initiateJiraAuth("team1", "admin1");

    expect(showInformationMessage).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // connectWithCredentials
  // ---------------------------------------------------------------------------

  test("connectWithCredentials throws on invalid URL format", async () => {
    const service = getService();
    await expect(
      service.connectWithCredentials("team1", "admin1", "not-a-url", "a@b.com", "12345678901234567890")
    ).rejects.toThrow("Invalid Jira URL format");
  });

  test("connectWithCredentials throws on non-Jira host", async () => {
    const service = getService();
    await expect(
      service.connectWithCredentials(
        "team1",
        "admin1",
        "https://example.com",
        "a@b.com",
        "12345678901234567890"
      )
      ).rejects.toThrow("Invalid Jira URL format");
    });

  test("connectWithCredentials throws on invalid email", async () => {
    const service = getService();
    await expect(
      service.connectWithCredentials(
        "team1",
        "admin1",
        "https://my.atlassian.net",
        "invalid-email",
        "12345678901234567890"
      )
    ).rejects.toThrow("Invalid email address format");
  });

  test("connectWithCredentials throws on short token", async () => {
    const service = getService();
    await expect(
      service.connectWithCredentials(
        "team1",
        "admin1",
        "https://my.atlassian.net",
        "user@example.com",
        "short"
      )
    ).rejects.toThrow("API token appears to be invalid or too short");
  });

  test("connectWithCredentials throws when testJiraConnection fails", async () => {
    const service = getService() as any;

    jest.spyOn(service, "testJiraConnection").mockResolvedValue(false);

    await expect(
      service.connectWithCredentials(
        "team1",
        "admin1",
        "https://my.atlassian.net",
        "user@example.com",
        "12345678901234567890"
      )
    ).rejects.toThrow("Failed to connect to Jira.");
  });

  test("connectWithCredentials throws when getProjectKey returns null", async () => {
    const service = getService() as any;

    jest.spyOn(service, "testJiraConnection").mockResolvedValue(true);
    jest.spyOn(service, "getProjectKey").mockResolvedValue(null);

    await expect(
      service.connectWithCredentials(
        "team1",
        "admin1",
        "https://my.atlassian.net",
        "user@example.com",
        "12345678901234567890"
      )
    ).rejects.toThrow("No project selected or unable to fetch projects");
  });

  test("connectWithCredentials happy path", async () => {
    const service = getService() as any;

    const testConnSpy = jest
      .spyOn(service, "testJiraConnection")
      .mockResolvedValue(true);
    const projKeySpy = jest
      .spyOn(service, "getProjectKey")
      .mockResolvedValue("PROJ");
    const saveSpy = jest
      .spyOn(service, "saveJiraConfig")
      .mockResolvedValue(undefined);

    await service.connectWithCredentials(
      "team1",
      "admin1",
      "https://my.atlassian.net",
      "user@example.com",
      "12345678901234567890"
    );

    expect(testConnSpy).toHaveBeenCalled();
    expect(projKeySpy).toHaveBeenCalled();
    expect(saveSpy).toHaveBeenCalled();
    expect(showInformationMessage).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // testJiraConnection (private)
  // ---------------------------------------------------------------------------

  test("testJiraConnection returns true on 200", async () => {
    const service = getService() as any;

    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: { displayName: "Jira User" },
    });

    const result = await service.testJiraConnection(
      "https://my.atlassian.net",
      "user@example.com",
      "TOKEN"
    );

    expect(result).toBe(true);
  });

  test("testJiraConnection returns false and shows error on 401", async () => {
    const service = getService() as any;

    mockedAxios.get.mockRejectedValue({
      response: {
        status: 401,
        statusText: "Unauthorized",
        data: {},
      },
      message: "Auth failed",
    });

    const result = await service.testJiraConnection(
      "https://my.atlassian.net",
      "user@example.com",
      "TOKEN"
    );

    expect(result).toBe(false);
    expect(showErrorMessage).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // getProjectKey (private)
  // ---------------------------------------------------------------------------

  test("getProjectKey returns selected project key", async () => {
    const service = getService() as any;

    mockedAxios.get.mockResolvedValue({
      data: [
        { key: "P1", name: "Project One", projectTypeKey: "software" },
        { key: "P2", name: "Project Two", projectTypeKey: "service" },
      ],
    });

    showQuickPick.mockResolvedValueOnce({
      project: { key: "P2" },
    });

    const key = await service.getProjectKey(
      "https://my.atlassian.net",
      "user@example.com",
      "TOKEN"
    );

    expect(key).toBe("P2");
  });

  test("getProjectKey returns null and shows error when no projects", async () => {
    const service = getService() as any;

    mockedAxios.get.mockResolvedValue({ data: [] });

    const key = await service.getProjectKey(
      "https://my.atlassian.net",
      "user@example.com",
      "TOKEN"
    );

    expect(key).toBeNull();
    expect(showErrorMessage).toHaveBeenCalledWith(
      "No projects found in your Jira instance."
    );
  });

  test("getProjectKey returns null when user cancels selection", async () => {
    const service = getService() as any;

    mockedAxios.get.mockResolvedValue({
      data: [{ key: "P1", name: "Project One", projectTypeKey: "software" }],
    });

    showQuickPick.mockResolvedValueOnce(undefined);

    const key = await service.getProjectKey(
      "https://my.atlassian.net",
      "user@example.com",
      "TOKEN"
    );

    expect(key).toBeNull();
  });

  test("getProjectKey handles axios error and returns null", async () => {
    const service = getService() as any;

    mockedAxios.get.mockRejectedValue(new Error("boom"));

    const key = await service.getProjectKey(
      "https://my.atlassian.net",
      "user@example.com",
      "TOKEN"
    );

    expect(key).toBeNull();
    expect(showErrorMessage).toHaveBeenCalledWith(
      "Failed to fetch projects from Jira."
    );
  });

  // ---------------------------------------------------------------------------
  // saveJiraConfig (private)
  // ---------------------------------------------------------------------------

  test("saveJiraConfig succeeds when response status is 200", async () => {
    const service = getService() as any;

    mockedAxios.post.mockResolvedValue({ status: 200 });

    await expect(
      service.saveJiraConfig({
        team_id: "t1",
        jira_url: "https://my.atlassian.net",
        jira_project_key: "PROJ",
        access_token: "abc",
        admin_user_id: "u1",
      })
    ).resolves.toBeUndefined();

    expect(mockedAxios.post).toHaveBeenCalled();
  });

  test("saveJiraConfig throws when response status not 200", async () => {
    const service = getService() as any;

    mockedAxios.post.mockResolvedValue({ status: 500 });

    await expect(
      service.saveJiraConfig({
        team_id: "t1",
        jira_url: "https://my.atlassian.net",
        jira_project_key: "PROJ",
        access_token: "abc",
        admin_user_id: "u1",
      })
    ).rejects.toThrow("Failed to save Jira configuration");
  });

  test("saveJiraConfig rethrows axios error", async () => {
    const service = getService() as any;

    mockedAxios.post.mockRejectedValue(new Error("network error"));

    await expect(
      service.saveJiraConfig({
        team_id: "t1",
        jira_url: "https://my.atlassian.net",
        jira_project_key: "PROJ",
        access_token: "abc",
        admin_user_id: "u1",
      })
    ).rejects.toThrow("network error");
  });

  // ---------------------------------------------------------------------------
  // disconnectJira
  // ---------------------------------------------------------------------------

  test("disconnectJira succeeds on 200", async () => {
    const service = getService();

    mockedAxios.delete.mockResolvedValue({ status: 200 });

    await expect(service.disconnectJira("team1")).resolves.toBeUndefined();
  });

  test("disconnectJira throws on non-200", async () => {
    const service = getService();

    mockedAxios.delete.mockResolvedValue({ status: 500 });

    await expect(service.disconnectJira("team1")).rejects.toThrow(
      "Failed to disconnect from Jira"
    );
  });

  // ---------------------------------------------------------------------------
  // getJiraConfig
  // ---------------------------------------------------------------------------

  test("getJiraConfig returns data on success", async () => {
    const service = getService();

    mockedAxios.get.mockResolvedValue({
      data: { team_id: "t1", jira_url: "url" },
    });

    const cfg = await service.getJiraConfig("t1");
    expect(cfg).toEqual({ team_id: "t1", jira_url: "url" });
  });

  test("getJiraConfig returns null on 404", async () => {
    const service = getService();

    mockedAxios.get.mockRejectedValue({
      response: { status: 404 },
      message: "not found",
    });

    const cfg = await service.getJiraConfig("t1");
    expect(cfg).toBeNull();
  });

  test("getJiraConfig returns null on other error", async () => {
    const service = getService();

    mockedAxios.get.mockRejectedValue({
      response: { status: 500 },
      message: "server error",
    });

    const cfg = await service.getJiraConfig("t1");
    expect(cfg).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // fetchTeamIssues
  // ---------------------------------------------------------------------------

  test("fetchTeamIssues throws when Jira not configured", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue(null);

    await expect(service.fetchTeamIssues("team1")).rejects.toThrow(
      "Jira not configured for this team"
    );
  });

  test("fetchTeamIssues returns empty array when no issues", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
      team_id: "team1",
      admin_user_id: "u1",
    });

    mockedAxios.post.mockResolvedValue({
      data: { issues: [] },
    });

    const issues = await service.fetchTeamIssues("team1");
    expect(issues).toEqual([]);
  });

  test("fetchTeamIssues fetches details for each issue", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
      team_id: "team1",
      admin_user_id: "u1",
    });

    mockedAxios.post.mockResolvedValue({
      data: { issues: [{ id: "1" }, { id: "2" }] },
    });

    mockedAxios.get
      .mockResolvedValueOnce({ data: { id: "1", fields: {} } })
      .mockResolvedValueOnce({ data: { id: "2", fields: {} } });

    const issues = await service.fetchTeamIssues("team1");
    expect(issues.length).toBe(2);
  });

  test("fetchTeamIssues handles Jira auth error 401", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
      team_id: "team1",
      admin_user_id: "u1",
    });

    mockedAxios.post.mockRejectedValue({
      response: { status: 401, data: {}, statusText: "Unauthorized" },
      message: "auth fail",
    });

    await expect(service.fetchTeamIssues("team1")).rejects.toThrow(
      "Jira authentication failed. Please reconfigure the integration."
    );
  });

  test("fetchTeamIssues handles 404 project not found", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
      team_id: "team1",
      admin_user_id: "u1",
    });

    mockedAxios.post.mockRejectedValue({
      response: { status: 404, data: {}, statusText: "Not Found" },
      message: "not found",
    });

    await expect(service.fetchTeamIssues("team1")).rejects.toThrow(
      "Jira project not found. Please check the project key."
    );
  });

  test("fetchTeamIssues handles 410", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
      team_id: "team1",
      admin_user_id: "u1",
    });

    mockedAxios.post.mockRejectedValue({
      response: { status: 410, data: {}, statusText: "Gone" },
      message: "gone",
    });

    await expect(service.fetchTeamIssues("team1")).rejects.toThrow(
      "Jira API endpoint deprecated or project archived. Please verify the project is active and accessible."
    );
  });

  test("fetchTeamIssues handles generic error", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
      team_id: "team1",
      admin_user_id: "u1",
    });

    mockedAxios.post.mockRejectedValue({
      response: { status: 500, data: {}, statusText: "Server Error" },
      message: "server error",
    });

    await expect(service.fetchTeamIssues("team1")).rejects.toThrow(
      "Failed to fetch issues from Jira: server error"
    );
  });

  // ---------------------------------------------------------------------------
  // getBoardId (private)
  // ---------------------------------------------------------------------------

  test("getBoardId returns first board id", async () => {
    const service = getService() as any;
    const config = {
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    };

    mockedAxios.get.mockResolvedValue({
      data: { values: [{ id: 10 }, { id: 11 }] },
    });

    const id = await service.getBoardId(config);
    expect(id).toBe(10);
  });

  test("getBoardId returns null when no boards", async () => {
    const service = getService() as any;
    const config = {
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    };

    mockedAxios.get.mockResolvedValue({
      data: { values: [] },
    });

    const id = await service.getBoardId(config);
    expect(id).toBeNull();
  });

  test("getBoardId returns null on error", async () => {
    const service = getService() as any;
    const config = {
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    };

    mockedAxios.get.mockRejectedValue(new Error("boom"));

    const id = await service.getBoardId(config);
    expect(id).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // fetchSprints
  // ---------------------------------------------------------------------------

  test("fetchSprints throws when Jira not configured", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue(null);

    await expect(service.fetchSprints("team1")).rejects.toThrow(
      "Jira not configured for this team"
    );
  });

  test("fetchSprints throws when board not found", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({});
    jest.spyOn(service, "getBoardId").mockResolvedValue(null);

    await expect(service.fetchSprints("team1")).rejects.toThrow(
      "Unable to find board for this project"
    );
  });

  test("fetchSprints returns sprints", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    });
    jest.spyOn(service, "getBoardId").mockResolvedValue(10);

    mockedAxios.get.mockResolvedValue({
      data: { values: [{ id: 1, name: "Sprint 1" }] },
    });

    const sprints = await service.fetchSprints("team1");
    expect(sprints.length).toBe(1);
  });

  test("fetchSprints throws on axios error", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    });
    jest.spyOn(service, "getBoardId").mockResolvedValue(10);

    mockedAxios.get.mockRejectedValue(new Error("fail"));

    await expect(service.fetchSprints("team1")).rejects.toThrow(
      "Failed to fetch sprints: fail"
    );
  });

  // ---------------------------------------------------------------------------
  // fetchSprintIssues
  // ---------------------------------------------------------------------------

  test("fetchSprintIssues throws when Jira not configured", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue(null);

    await expect(service.fetchSprintIssues("team1", 1)).rejects.toThrow(
      "Jira not configured for this team"
    );
  });

  test("fetchSprintIssues throws when board not found", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({});
    jest.spyOn(service, "getBoardId").mockResolvedValue(null);

    await expect(service.fetchSprintIssues("team1", 1)).rejects.toThrow(
      "Unable to find board for this project"
    );
  });

  test("fetchSprintIssues returns issues", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    });
    jest.spyOn(service, "getBoardId").mockResolvedValue(10);

    mockedAxios.get.mockResolvedValue({
      data: { issues: [{ id: "1" }] },
    });

    const issues = await service.fetchSprintIssues("team1", 1);
    expect(issues.length).toBe(1);
  });

  test("fetchSprintIssues throws on error", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    });
    jest.spyOn(service, "getBoardId").mockResolvedValue(10);

    mockedAxios.get.mockRejectedValue(new Error("fail"));

    await expect(service.fetchSprintIssues("team1", 1)).rejects.toThrow(
      "Failed to fetch sprint issues: fail"
    );
  });

  // ---------------------------------------------------------------------------
  // fetchBacklogIssues
  // ---------------------------------------------------------------------------

  test("fetchBacklogIssues throws when Jira not configured", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue(null);

    await expect(service.fetchBacklogIssues("team1")).rejects.toThrow(
      "Jira not configured for this team"
    );
  });

  test("fetchBacklogIssues throws when board not found", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({});
    jest.spyOn(service, "getBoardId").mockResolvedValue(null);

    await expect(service.fetchBacklogIssues("team1")).rejects.toThrow(
      "Unable to find board for this project"
    );
  });

  test("fetchBacklogIssues returns issues", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    });
    jest.spyOn(service, "getBoardId").mockResolvedValue(10);

    mockedAxios.get.mockResolvedValue({
      data: { issues: [{ id: "1" }] },
    });

    const issues = await service.fetchBacklogIssues("team1");
    expect(issues.length).toBe(1);
  });

  test("fetchBacklogIssues throws on error", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    });
    jest.spyOn(service, "getBoardId").mockResolvedValue(10);

    mockedAxios.get.mockRejectedValue(new Error("fail"));

    await expect(service.fetchBacklogIssues("team1")).rejects.toThrow(
      "Failed to fetch backlog issues: fail"
    );
  });

  // ---------------------------------------------------------------------------
  // fetchTransitions
  // ---------------------------------------------------------------------------

  test("fetchTransitions throws when Jira not configured", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue(null);

    await expect(service.fetchTransitions("team1", "ISSUE-1")).rejects.toThrow(
      "Jira not configured for this team"
    );
  });

  test("fetchTransitions returns transitions", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      access_token: "abc",
    });

    mockedAxios.get.mockResolvedValue({
      data: { transitions: [{ id: "1", name: "Done" }] },
    });

    const transitions = await service.fetchTransitions("team1", "ISSUE-1");
    expect(transitions.length).toBe(1);
  });

  test("fetchTransitions throws on error", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      access_token: "abc",
    });

    mockedAxios.get.mockRejectedValue(new Error("fail"));

    await expect(service.fetchTransitions("team1", "ISSUE-1")).rejects.toThrow(
      "Failed to fetch transitions: fail"
    );
  });

  // ---------------------------------------------------------------------------
  // transitionIssue
  // ---------------------------------------------------------------------------

  test("transitionIssue throws when Jira not configured", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue(null);

    await expect(
      service.transitionIssue("team1", "ISSUE-1", "3")
    ).rejects.toThrow("Jira not configured for this team");
  });

  test("transitionIssue calls axios.post on success", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      access_token: "abc",
    });

    mockedAxios.post.mockResolvedValue({});

    await service.transitionIssue("team1", "ISSUE-1", "3");
    expect(mockedAxios.post).toHaveBeenCalled();
  });

  test("transitionIssue throws on error", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      access_token: "abc",
    });

    mockedAxios.post.mockRejectedValue(new Error("fail"));

    await expect(
      service.transitionIssue("team1", "ISSUE-1", "3")
    ).rejects.toThrow("Failed to transition issue: fail");
  });

  // ---------------------------------------------------------------------------
  // reassignIssue
  // ---------------------------------------------------------------------------

  test("reassignIssue throws when Jira not configured", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue(null);

    await expect(
      service.reassignIssue("team1", "ISSUE-1", "acc-1")
    ).rejects.toThrow("Jira not configured for this team");
  });

  test("reassignIssue sends accountId payload", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      access_token: "abc",
    });

    mockedAxios.put.mockResolvedValue({});

    await service.reassignIssue("team1", "ISSUE-1", "acc-1");
    expect(mockedAxios.put).toHaveBeenCalledWith(
      expect.stringContaining("/assignee"),
      { accountId: "acc-1" },
      expect.any(Object)
    );
  });

  test("reassignIssue sends null payload when accountId null", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      access_token: "abc",
    });

    mockedAxios.put.mockResolvedValue({});

    await service.reassignIssue("team1", "ISSUE-1", null);
    expect(mockedAxios.put).toHaveBeenCalledWith(
      expect.stringContaining("/assignee"),
      null,
      expect.any(Object)
    );
  });

  test("reassignIssue throws on error", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      access_token: "abc",
    });

    mockedAxios.put.mockRejectedValue(new Error("fail"));

    await expect(
      service.reassignIssue("team1", "ISSUE-1", "acc-1")
    ).rejects.toThrow("Failed to reassign issue: fail");
  });

  // ---------------------------------------------------------------------------
  // updateStoryPoints
  // ---------------------------------------------------------------------------

  test("updateStoryPoints throws when Jira not configured", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue(null);

    await expect(
      service.updateStoryPoints("team1", "ISSUE-1", 5)
    ).rejects.toThrow("Jira not configured for this team");
  });

  test("updateStoryPoints calls axios.put on success", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      access_token: "abc",
    });

    mockedAxios.put.mockResolvedValue({});

    await service.updateStoryPoints("team1", "ISSUE-1", 3);
    expect(mockedAxios.put).toHaveBeenCalled();
  });

  test("updateStoryPoints throws on error", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      access_token: "abc",
    });

    mockedAxios.put.mockRejectedValue(new Error("fail"));

    await expect(
      service.updateStoryPoints("team1", "ISSUE-1", 3)
    ).rejects.toThrow("Failed to update story points: fail");
  });

  // ---------------------------------------------------------------------------
  // updatePriority
  // ---------------------------------------------------------------------------

  test("updatePriority throws when Jira not configured", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue(null);

    await expect(
      service.updatePriority("team1", "ISSUE-1", "High")
    ).rejects.toThrow("Jira not configured for this team");
  });

  test("updatePriority calls axios.put on success", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      access_token: "abc",
    });

    mockedAxios.put.mockResolvedValue({});

    await service.updatePriority("team1", "ISSUE-1", "High");
    expect(mockedAxios.put).toHaveBeenCalled();
  });

  test("updatePriority throws on error", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      access_token: "abc",
    });

    mockedAxios.put.mockRejectedValue(new Error("fail"));

    await expect(
      service.updatePriority("team1", "ISSUE-1", "High")
    ).rejects.toThrow("Failed to update priority: fail");
  });

  // ---------------------------------------------------------------------------
  // fetchAssignableUsers
  // ---------------------------------------------------------------------------

  test("fetchAssignableUsers throws when Jira not configured", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue(null);

    await expect(service.fetchAssignableUsers("team1")).rejects.toThrow(
      "Jira not configured for this team"
    );
  });

  test("fetchAssignableUsers maps fields from response", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    });

    mockedAxios.get.mockResolvedValue({
      data: [
        {
          accountId: "a1",
          displayName: "User One",
          emailAddress: "one@example.com",
        },
      ],
    });

    const users = await service.fetchAssignableUsers("team1");
    expect(users).toEqual([
      {
        accountId: "a1",
        displayName: "User One",
        emailAddress: "one@example.com",
      },
    ]);
  });

  test("fetchAssignableUsers throws on error", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    });

    mockedAxios.get.mockRejectedValue(new Error("fail"));

    await expect(service.fetchAssignableUsers("team1")).rejects.toThrow(
      "Failed to fetch assignable users: fail"
    );
  });

  // ---------------------------------------------------------------------------
  // createIssue
  // ---------------------------------------------------------------------------

  test("createIssue throws when Jira not configured", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue(null);

    await expect(
      service.createIssue("team1", { summary: "Test" })
    ).rejects.toThrow("Jira not configured for this team");
  });

  test("createIssue happy path with description and priority", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    });

    mockedAxios.post.mockResolvedValue({
      data: { key: "PROJ-1" },
    });

    mockedAxios.get.mockResolvedValue({
      data: { id: "1", key: "PROJ-1" },
    });

    const issue = await service.createIssue("team1", {
      summary: "My Issue",
      description: "Desc",
      priority: "High",
      issuetype: "Task",
    });

    expect(issue.key).toBe("PROJ-1");
    expect(mockedAxios.post).toHaveBeenCalled();
    expect(mockedAxios.get).toHaveBeenCalled();
  });

  test("createIssue handles 400 validation error with field errors", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    });

    mockedAxios.post.mockRejectedValue({
      response: {
        status: 400,
        data: {
          errors: { summary: "Summary is required" },
        },
      },
      message: "bad request",
    });

    await expect(
      service.createIssue("team1", { summary: "" })
    ).rejects.toThrow("Validation error: Summary is required");
  });

  test("createIssue handles 400 without specific errors", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    });

    mockedAxios.post.mockRejectedValue({
      response: {
        status: 400,
        data: { errors: {} },
      },
      message: "bad request",
    });

    await expect(
      service.createIssue("team1", { summary: "" })
    ).rejects.toThrow(
      "Invalid issue data. Please check your input and try again."
    );
  });

  test("createIssue handles 401", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    });

    mockedAxios.post.mockRejectedValue({
      response: { status: 401 },
      message: "unauthorized",
    });

    await expect(
      service.createIssue("team1", { summary: "test" })
    ).rejects.toThrow(
      "Jira authentication failed. Please reconfigure the integration."
    );
  });

  test("createIssue handles 403", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    });

    mockedAxios.post.mockRejectedValue({
      response: { status: 403 },
      message: "forbidden",
    });

    await expect(
      service.createIssue("team1", { summary: "test" })
    ).rejects.toThrow(
      "Permission denied. You may not have permission to create issues in this project."
    );
  });

  test("createIssue handles 404", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    });

    mockedAxios.post.mockRejectedValue({
      response: { status: 404 },
      message: "not found",
    });

    await expect(
      service.createIssue("team1", { summary: "test" })
    ).rejects.toThrow(
      "Jira project not found. Please check the project configuration."
    );
  });

  test("createIssue handles generic error", async () => {
    const service = getService() as any;
    jest.spyOn(service, "getJiraConfig").mockResolvedValue({
      jira_url: "https://my.atlassian.net",
      jira_project_key: "PROJ",
      access_token: "abc",
    });

    mockedAxios.post.mockRejectedValue({
      response: { status: 500 },
      message: "server err",
    });

    await expect(
      service.createIssue("team1", { summary: "test" })
    ).rejects.toThrow("Failed to create issue: server err");
  });

  // ---------------------------------------------------------------------------
  // removeJiraConfig
  // ---------------------------------------------------------------------------

  test("removeJiraConfig calls axios.delete and succeeds", async () => {
    const service = getService();

    mockedAxios.delete.mockResolvedValue({});

    await service.removeJiraConfig("team1");
    expect(mockedAxios.delete).toHaveBeenCalled();
  });

  test("removeJiraConfig throws on error", async () => {
    const service = getService();

    mockedAxios.delete.mockRejectedValue(new Error("fail"));

    await expect(service.removeJiraConfig("team1")).rejects.toThrow("fail");
  });
});
