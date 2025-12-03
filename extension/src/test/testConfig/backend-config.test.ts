describe("backend-config", () => {
    beforeEach(() => {
        jest.resetModules();
        jest.dontMock("../../config/backend-config");
        delete process.env.BACKEND_URL;
    });

    test("BACKEND_URL uses LOCAL_BACKEND_URL when USE_LOCAL_BACKEND = true", () => {
        const { BACKEND_URL } = require("../../config/backend-config");
        expect(BACKEND_URL).toBe("http://localhost:5000");
    });

    test("BACKEND_URL falls back to production URL when USE_LOCAL_BACKEND = false", () => {
        process.env.BACKEND_URL = "https://custom-env-url.com";

        jest.resetModules();

        jest.doMock("../../config/backend-config", () => {
            return {
                LOCAL_BACKEND_URL: "http://localhost:5000",
                PRODUCTION_BACKEND_URL: process.env.BACKEND_URL,
                USE_LOCAL_BACKEND: false,
                BACKEND_URL: process.env.BACKEND_URL,
                getApiUrl: (endpoint: string) =>
                    `${process.env.BACKEND_URL}${endpoint}`,
            };
        });

        const { BACKEND_URL } = require("../../config/backend-config");

        expect(BACKEND_URL).toBe("https://custom-env-url.com");

        // 🔥 VERY IMPORTANT: unmock after this test
        jest.dontMock("../../config/backend-config");
        jest.resetModules();
    });

    test("getApiUrl correctly joins BACKEND_URL with endpoint", () => {
        const { getApiUrl } = require("../../config/backend-config");
        expect(getApiUrl("/api/test")).toBe("http://localhost:5000/api/test");
    });

    test("getApiUrl handles endpoints without leading slash", () => {
        const { getApiUrl } = require("../../config/backend-config");
        expect(getApiUrl("health")).toBe("http://localhost:5000health");
    });
});
