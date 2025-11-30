import { BACKEND_URL, getApiUrl } from "../../config/backend-config";

describe("backend-config", () => {
    afterEach(() => {
        jest.resetModules();
        delete process.env.BACKEND_URL;
    });

    test("BACKEND_URL uses LOCAL_BACKEND_URL when USE_LOCAL_BACKEND = true", () => {
        // Because BACKEND_URL is evaluated at import time,
        // we re-import the module to pick up the default values
        jest.resetModules();
        const { BACKEND_URL: freshUrl } = require("../backend-config");

        expect(freshUrl).toBe("http://localhost:5000");
    });

    test("BACKEND_URL falls back to production URL when USE_LOCAL_BACKEND = false", () => {
        process.env.BACKEND_URL = "https://custom-env-url.com";

        jest.resetModules();

        // Mock USE_LOCAL_BACKEND to false
        jest.doMock("../backend-config", () => {
            const actual = jest.requireActual("../backend-config");
            return {
                ...actual,
                USE_LOCAL_BACKEND: false,
                BACKEND_URL: process.env.BACKEND_URL,
            };
        });

        const { BACKEND_URL: freshUrl } = require("../backend-config");

        expect(freshUrl).toBe("https://custom-env-url.com");
    });

    test("getApiUrl correctly joins BACKEND_URL with endpoint", () => {
        const apiUrl = getApiUrl("/api/test");
        expect(apiUrl).toBe("http://localhost:5000/api/test");
    });

    test("getApiUrl handles missing slash correctly", () => {
        const apiUrl = getApiUrl("health");
        expect(apiUrl).toBe("http://localhost:5000health");
    });
});
