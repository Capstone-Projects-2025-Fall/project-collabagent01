/**
 * team-project-commands.test.ts
 */

const commandMap: Record<string, Function> = {};


jest.mock("vscode", () => ({
    window: {
        showErrorMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        withProgress: jest.fn((opts: any, cb: any) => cb({ report: jest.fn() })),
    },
    commands: {
        registerCommand: jest.fn((name: string, callback: Function) => {
            commandMap[name] = callback;
            return { dispose: jest.fn() };
        }),
    },
    ProgressLocation: {
        Notification: 15,
    },
}));


// -----------------------------
// 3. Mock services used in file
// -----------------------------
jest.mock("../../services/team-service", () => ({
    validateTeamProject: jest.fn(),
    handleProjectMismatch: jest.fn(),
    openTeamProject: jest.fn(),
    updateTeamProject: jest.fn(),
    getTeamProjectDescription: jest.fn(),
}));

jest.mock("../../services/project-detection-service", () => ({
    getCurrentProjectInfo: jest.fn(),
    getProjectDescription: jest.fn(() => "Nice project!"),
}));


// -----------------------------
// 4. Import commands (AFTER mocks)
// -----------------------------
import {
    validateCurrentProjectCommand,
    showCurrentProjectInfoCommand,
    updateTeamProjectCommand,
    checkTeamProjectCompatibilityCommand,
    openTeamProjectCommand,
    autoValidateTeamProject,
} from "../../commands/team-project-commands";

import * as vscode from "vscode";
import * as teamService from "../../services/team-service";
import * as projectService from "../../services/project-detection-service";


// -----------------------------
// 5. Helpers
// -----------------------------
const getHandler = (id: string) => commandMap[id];


// -----------------------------
// 6. TESTS
// -----------------------------
describe("team-project-commands", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // -----------------------------
    // validateCurrentProjectCommand
    // -----------------------------
    test("validateCurrentProjectCommand - no teamId", async () => {
        const handler = getHandler("collabAgent.validateCurrentProject");
        await handler(undefined);

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
            "No team selected for validation"
        );
    });

    test("validateCurrentProjectCommand - validation error", async () => {
        (teamService.validateTeamProject as jest.Mock).mockResolvedValue({
            error: "fail",
        });

        const handler = getHandler("collabAgent.validateCurrentProject");
        await handler("team-1");

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
            "Validation failed: fail"
        );
    });

    test("validateCurrentProjectCommand - missing team/project", async () => {
        (teamService.validateTeamProject as jest.Mock).mockResolvedValue({
            isValid: false,
            team: undefined,
            currentProject: undefined,
        });

        const handler = getHandler("collabAgent.validateCurrentProject");
        await handler("team-1");

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
            "Could not validate project - missing information"
        );
    });

    test("validateCurrentProjectCommand - valid project", async () => {
        const mockProj = { projectName: "x" };
        (teamService.validateTeamProject as jest.Mock).mockResolvedValue({
            isValid: true,
            team: {},
            currentProject: mockProj,
        });

        const handler = getHandler("collabAgent.validateCurrentProject");
        await handler("team-1");

        expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    test("validateCurrentProjectCommand - mismatch → switch", async () => {
        const mockTeam = { id: "t1" };
        const mockProject = { id: "p" };

        (teamService.validateTeamProject as jest.Mock).mockResolvedValue({
            isValid: false,
            team: mockTeam,
            currentProject: mockProject,
        });

        (teamService.handleProjectMismatch as jest.Mock).mockResolvedValue("switch");

        const handler = getHandler("collabAgent.validateCurrentProject");
        await handler("team");

        expect(teamService.openTeamProject).toHaveBeenCalled();
    });

    test("validateCurrentProjectCommand - mismatch → continue", async () => {
        (teamService.validateTeamProject as jest.Mock).mockResolvedValue({
            isValid: false,
            team: {},
            currentProject: {},
        });

        (teamService.handleProjectMismatch as jest.Mock).mockResolvedValue("continue");

        const handler = getHandler("collabAgent.validateCurrentProject");
        await handler("team");

        expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });


    // -----------------------------
    // showCurrentProjectInfoCommand
    // -----------------------------
    test("showCurrentProjectInfoCommand - no project", async () => {
        (projectService.getCurrentProjectInfo as jest.Mock).mockReturnValue(undefined);

        const handler = getHandler("collabAgent.showCurrentProjectInfo");
        await handler();

        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
            "No workspace folder is currently open"
        );
    });

    test("showCurrentProjectInfoCommand - displays project info", async () => {
        (projectService.getCurrentProjectInfo as jest.Mock).mockReturnValue({
            projectName: "Demo",
            localPath: "/x",
            projectHash: "abc",
            isGitRepo: true,
        });

        const handler = getHandler("collabAgent.showCurrentProjectInfo");
        await handler();

        expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });


    // -----------------------------
    // updateTeamProjectCommand
    // -----------------------------
    test("updateTeamProjectCommand - no team", async () => {
        const handler = getHandler("collabAgent.updateTeamProject");
        await handler(undefined);

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("No team selected");
    });

    test("updateTeamProjectCommand - no current project", async () => {
        (projectService.getCurrentProjectInfo as jest.Mock).mockReturnValue(undefined);

        const handler = getHandler("collabAgent.updateTeamProject");
        await handler("team");

        expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    test("updateTeamProjectCommand - user cancels", async () => {
        (projectService.getCurrentProjectInfo as jest.Mock).mockReturnValue({
            projectName: "Demo",
        });

        jest.spyOn(vscode.window, "showWarningMessage")
            .mockResolvedValue("Cancel" as any);

        const handler = getHandler("collabAgent.updateTeamProject");
        await handler("team");

        expect(teamService.updateTeamProject).not.toHaveBeenCalled();
    });

    test("updateTeamProjectCommand - success", async () => {
        (projectService.getCurrentProjectInfo as jest.Mock).mockReturnValue({
            projectName: "Demo",
        });

        jest.spyOn(vscode.window, "showWarningMessage")
            .mockResolvedValue("Update Project" as any);

        (teamService.updateTeamProject as jest.Mock).mockResolvedValue({});

        const handler = getHandler("collabAgent.updateTeamProject");
        await handler("team");

        expect(teamService.updateTeamProject).toHaveBeenCalledWith("team");
    });


    // -----------------------------
    // checkTeamProjectCompatibilityCommand
    // -----------------------------
    test("checkTeamProjectCompatibilityCommand - validation error", async () => {
        (teamService.validateTeamProject as jest.Mock).mockResolvedValue({
            error: "oops",
        });

        const handler = getHandler("collabAgent.checkTeamProjectCompatibility");
        const res = await handler("team");

        expect(res).toBe(false);
        expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    test("checkTeamProjectCompatibilityCommand - mismatch continue", async () => {
        (teamService.validateTeamProject as jest.Mock).mockResolvedValue({
            isValid: false,
            team: {},
            currentProject: {},
        });

        (teamService.handleProjectMismatch as jest.Mock).mockResolvedValue("continue");

        const handler = getHandler("collabAgent.checkTeamProjectCompatibility");
        const res = await handler("team");

        expect(res).toBe(true);
    });


    // -----------------------------
    // openTeamProjectCommand
    // -----------------------------
    test("openTeamProjectCommand - missing team", async () => {
        const handler = getHandler("collabAgent.openTeamProject");
        await handler(undefined);

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("No team selected");
    });

    test("openTeamProjectCommand - open project success", async () => {
        (teamService.validateTeamProject as jest.Mock).mockResolvedValue({
            team: {},
        });

        (teamService.openTeamProject as jest.Mock).mockResolvedValue({});

        const handler = getHandler("collabAgent.openTeamProject");
        await handler("team1");

        expect(teamService.openTeamProject).toHaveBeenCalled();
    });


    // -----------------------------
    // autoValidateTeamProject
    // -----------------------------
    test("autoValidateTeamProject - mismatch → switch", async () => {
        (teamService.validateTeamProject as jest.Mock).mockResolvedValue({
            isValid: false,
            team: {},
            currentProject: {},
        });

        (teamService.handleProjectMismatch as jest.Mock).mockResolvedValue("switch");

        const res = await autoValidateTeamProject("team");

        expect(res.canProceed).toBe(false);
    });

    test("autoValidateTeamProject - mismatch → continue", async () => {
        (teamService.validateTeamProject as jest.Mock).mockResolvedValue({
            isValid: false,
            team: {},
            currentProject: {},
        });

        (teamService.handleProjectMismatch as jest.Mock).mockResolvedValue("continue");

        const res = await autoValidateTeamProject("team");

        expect(res.canProceed).toBe(true);
    });
});
