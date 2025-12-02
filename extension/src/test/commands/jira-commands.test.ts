jest.mock("vscode");
jest.mock("../../services/auth-service", () => ({
    getAuthContext: jest.fn(),
}));
jest.mock("../../services/team-service", () => ({
    getUserTeams: jest.fn(),
}));
jest.mock("../../services/jira-service", () => ({
    JiraService: {
        getInstance: jest.fn(),
    },
}));

// Mock setInterval so we can control the status bar interval
jest.useFakeTimers();

describe("Jira Commands", () => {
    const loadModules = () => {
        const vscode = require("vscode");
        const auth = require("../../services/auth-service");
        const teamSvc = require("../../services/team-service");
        const jiraSvc = require("../../services/jira-service");
        const commands = require("../../commands/jira-commands");
        return { vscode, auth, teamSvc, jiraSvc, commands };
    };

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });

    // --------------------------------------------------------------------
    // connectToJiraCommand
    // --------------------------------------------------------------------

    test("connectToJiraCommand rejects when user is not authenticated", async () => {
        const { vscode, auth, commands } = loadModules();

        auth.getAuthContext.mockResolvedValue({ context: { isAuthenticated: false } });

        await commands.connectToJiraCommand();

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
            "Please sign in first to connect to Jira."
        );
    });

    test("connectToJiraCommand rejects when user has no teams", async () => {
        const { vscode, auth, teamSvc, commands } = loadModules();

        auth.getAuthContext.mockResolvedValue({ context: { isAuthenticated: true } });
        teamSvc.getUserTeams.mockResolvedValue({ teams: [], error: null });

        await commands.connectToJiraCommand();

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
            "Please create or join a team first in the Agent Bot tab."
        );
    });

    test("connectToJiraCommand rejects when no team is selected", async () => {
        const { vscode, auth, teamSvc, commands } = loadModules();

        auth.getAuthContext.mockResolvedValue({ context: { isAuthenticated: true, id: "user1" } });

        teamSvc.getUserTeams.mockResolvedValue({
            teams: [{ id: "team1", role: "admin" }],
            error: null,
        });

        const context = {
            globalState: {
                get: jest.fn().mockReturnValue(undefined),
            },
        };

        vscode.workspace.getConfiguration.mockReturnValue({
            get: jest.fn().mockReturnValue(undefined),
        });

        await commands.connectToJiraCommand(context);

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
            "Please select a team in the Agent Bot tab first."
        );
    });

    test("connectToJiraCommand rejects when current team not found", async () => {
        const { vscode, auth, teamSvc, commands } = loadModules();

        auth.getAuthContext.mockResolvedValue({ context: { isAuthenticated: true, id: "user1" } });

        teamSvc.getUserTeams.mockResolvedValue({
            teams: [{ id: "teamA", role: "admin" }],
            error: null,
        });

        const context = {
            globalState: {
                get: jest.fn().mockReturnValue("teamXYZ"),
            },
        };

        await commands.connectToJiraCommand(context);

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
            "Current team not found. Please select a team in the Agent Bot tab."
        );
    });

    test("connectToJiraCommand rejects when user is not admin", async () => {
        const { vscode, auth, teamSvc, commands } = loadModules();

        auth.getAuthContext.mockResolvedValue({ context: { isAuthenticated: true, id: "user1" } });

        teamSvc.getUserTeams.mockResolvedValue({
            teams: [{ id: "team1", role: "member" }],
            error: null,
        });

        const context = {
            globalState: {
                get: jest.fn().mockReturnValue("team1"),
            },
        };

        await commands.connectToJiraCommand(context);

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
            "Only team admins can configure Jira integration. Please ask your team admin to set up Jira."
        );
    });

    test("connectToJiraCommand handles existing Jira config: view configuration", async () => {
        const { vscode, auth, teamSvc, jiraSvc, commands } = loadModules();

        auth.getAuthContext.mockResolvedValue({ context: { isAuthenticated: true, id: "user1" } });

        teamSvc.getUserTeams.mockResolvedValue({
            teams: [{ id: "team1", role: "admin" }],
            error: null,
        });

        const mockJira = {
            getJiraConfig: jest.fn().mockResolvedValue({
                jira_url: "https://jira.com",
                jira_project_key: "ABC",
                admin_user_id: "user1",
            }),
        };

        jiraSvc.JiraService.getInstance.mockReturnValue(mockJira);

        vscode.window.showQuickPick.mockResolvedValue({
            label: "View Current Configuration",
        });

        const context = {
            globalState: {
                get: jest.fn().mockReturnValue("team1"),
            },
        };

        await commands.connectToJiraCommand(context);

        expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    test("connectToJiraCommand removes Jira config when chosen", async () => {
        const { vscode, auth, teamSvc, jiraSvc, commands } = loadModules();

        auth.getAuthContext.mockResolvedValue({ context: { id: "user1", isAuthenticated: true } });

        teamSvc.getUserTeams.mockResolvedValue({
            teams: [{ id: "team1", role: "admin" }],
            error: null,
        });

        const mockJira = {
            getJiraConfig: jest.fn().mockResolvedValue({ jira_project_key: "ABC" }),
            removeJiraConfig: jest.fn().mockResolvedValue(undefined),
        };

        jiraSvc.JiraService.getInstance.mockReturnValue(mockJira);

        vscode.window.showQuickPick.mockResolvedValue({
            label: "Remove Jira Integration",
        });

        vscode.window.showWarningMessage.mockResolvedValue("Remove");

        const context = { globalState: { get: jest.fn().mockReturnValue("team1") } };

        await commands.connectToJiraCommand(context);

        expect(mockJira.removeJiraConfig).toHaveBeenCalledWith("team1");
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
            "Jira integration removed successfully."
        );
    });

    test("connectToJiraCommand initiates Jira auth when no existing config", async () => {
        const { vscode, auth, teamSvc, jiraSvc, commands } = loadModules();

        auth.getAuthContext.mockResolvedValue({
            context: { id: "user1", isAuthenticated: true },
        });

        teamSvc.getUserTeams.mockResolvedValue({
            teams: [{ id: "team1", role: "admin" }],
            error: null,
        });

        const mockJira = {
            getJiraConfig: jest.fn().mockResolvedValue(null),
            initiateJiraAuth: jest.fn().mockResolvedValue(undefined),
        };

        jiraSvc.JiraService.getInstance.mockReturnValue(mockJira);

        const context = { globalState: { get: jest.fn().mockReturnValue("team1") } };

        await commands.connectToJiraCommand(context);

        expect(mockJira.initiateJiraAuth).toHaveBeenCalledWith("team1", "user1");
        expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
            "workbench.view.extension.collabAgent"
        );
    });

    // --------------------------------------------------------------------
    // createJiraStatusBarItem / updateJiraStatusBarItem
    // --------------------------------------------------------------------

    test("createJiraStatusBarItem initializes & updates status bar text", async () => {
        const { vscode, jiraSvc, commands } = loadModules();

        const context = {
            globalState: { get: jest.fn().mockReturnValue("team1") },
            subscriptions: [],
        };

        const mockJira = {
            getJiraConfig: jest.fn().mockResolvedValue({
                jira_project_key: "ABC",
            }),
        };

        jiraSvc.JiraService.getInstance.mockReturnValue(mockJira);

        const item = commands.createJiraStatusBarItem(context);

        jest.runOnlyPendingTimers(); // simulate interval tick

        expect(item.text).toContain("Jira");
        expect(context.subscriptions.length).toBe(2); // interval & statusBarItem
    });
});
