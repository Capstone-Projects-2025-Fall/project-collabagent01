// Ensure the VS Code mock loads (even though we don't use it directly)
jest.mock("vscode");

describe("debug commands (testFetchCommand, incorrectChoicesCommand, fetchSettingsCommand)", () => {
    const loadModule = () => require("../../commands/test-commands");

    beforeEach(() => {
        jest.resetModules();
    });

    test("exports testFetchCommand object", () => {
        const { testFetchCommand } = loadModule();

        expect(testFetchCommand).toBeDefined();
        expect(typeof testFetchCommand.dispose).toBe("function");
        expect(() => testFetchCommand.dispose()).not.toThrow();
    });

    test("exports incorrectChoicesCommand object", () => {
        const { incorrectChoicesCommand } = loadModule();

        expect(incorrectChoicesCommand).toBeDefined();
        expect(typeof incorrectChoicesCommand.dispose).toBe("function");
        expect(() => incorrectChoicesCommand.dispose()).not.toThrow();
    });

    test("exports fetchSettingsCommand object", () => {
        const { fetchSettingsCommand } = loadModule();

        expect(fetchSettingsCommand).toBeDefined();
        expect(typeof fetchSettingsCommand.dispose).toBe("function");
        expect(() => fetchSettingsCommand.dispose()).not.toThrow();
    });
});
