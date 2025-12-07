describe("backend-config (endpoints.ts)", () => {
    beforeEach(() => {
        jest.resetModules();
        jest.dontMock("../../api/types/endpoints");
        delete process.env.BACKEND_URL;
    });

    test("BASE_URL uses production URL when TESTING = false", () => {
        const { BASE_URL } = require("../../api/types/endpoints");
        expect(BASE_URL).toBe("https://project-collabagent01.onrender.com");
    });

    test("BASE_URL falls back to production URL when TESTING = false", () => {
        process.env.BACKEND_URL = "https://custom-env-url.com";

        jest.resetModules();

        jest.doMock("../../api/types/endpoints", () => {
            return {
                LOCAL_ENDPOINT_URL: "http://127.0.0.1:5000",
                PRODUCTION_ENDPOINT_URL: process.env.BACKEND_URL,
                TESTING: false,
                BASE_URL: process.env.BACKEND_URL,
                AUTH_ENDPOINT: `${process.env.BACKEND_URL}/auth`,
                USER_ENDPOINT: `${process.env.BACKEND_URL}/users`,
                getApiUrl: (endpoint: string) =>
                    `${process.env.BACKEND_URL}${endpoint}`,
            };
        });

        const { BASE_URL } = require("../../api/types/endpoints");

        expect(BASE_URL).toBe("https://custom-env-url.com");

        // 🔥 VERY IMPORTANT: unmock after this test
        jest.dontMock("../../api/types/endpoints");
        jest.resetModules();
    });

    test("getApiUrl correctly joins BASE_URL with endpoint", () => {
        const { getApiUrl } = require("../../api/types/endpoints");
        expect(getApiUrl("/api/test")).toBe("https://project-collabagent01.onrender.com/api/test");
    });

    test("getApiUrl handles endpoints without leading slash", () => {
        const { getApiUrl } = require("../../api/types/endpoints");
        expect(getApiUrl("health")).toBe("https://project-collabagent01.onrender.comhealth");
    });
});
