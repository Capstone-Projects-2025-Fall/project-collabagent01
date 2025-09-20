/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "../../hooks/useTheme";

describe("useTheme", () => {
  const originalLocalStorage = { ...global.localStorage };
  let setItemSpy: jest.SpyInstance;
  let getItemSpy: jest.SpyInstance;
  const classList = {
    add: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    setItemSpy = jest.spyOn(Storage.prototype, "setItem");
    getItemSpy = jest.spyOn(Storage.prototype, "getItem");
    getItemSpy.mockReturnValue(null);

    Object.defineProperty(document.documentElement, "classList", {
      value: classList,
      configurable: true,
    });

    jest.clearAllMocks();
  });

  afterAll(() => {
    global.localStorage = originalLocalStorage;
  });

  it("initializes with light theme if no theme in localStorage", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
    expect(setItemSpy).toHaveBeenCalledWith("theme", "light");
    expect(classList.remove).toHaveBeenCalledWith("dark");
  });

  it("initializes with dark theme if localStorage has dark", () => {
    getItemSpy.mockReturnValue("dark");

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
    expect(setItemSpy).toHaveBeenCalledWith("theme", "dark");
    expect(classList.add).toHaveBeenCalledWith("dark");
  });

  it("toggles theme from light to dark", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
    expect(setItemSpy).toHaveBeenCalledWith("theme", "dark");
    expect(classList.add).toHaveBeenCalledWith("dark");
  });

  it("toggles theme from dark to light", () => {
    getItemSpy.mockReturnValue("dark");

    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("light");
    expect(setItemSpy).toHaveBeenCalledWith("theme", "light");
    expect(classList.remove).toHaveBeenCalledWith("dark");
  });
});
