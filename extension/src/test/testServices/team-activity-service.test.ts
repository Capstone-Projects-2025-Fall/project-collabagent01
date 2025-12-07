/**
 * Tests for Team Activity Service
 */
import {
  fetchTeamActivity,
  insertLiveShareActivity,
  updateLiveShareActivityLink,
  cleanupOrphanedPinnedEvents,
  insertLiveShareSessionEnd,
  insertLiveShareSummary,
  insertParticipantStatusEvent
} from "../../services/team-activity-service";

jest.mock("../../api/types/endpoints", () => ({
  BASE_URL: "http://mocked-api.test"
}));

// Mock fetch global
global.fetch = jest.fn();

// Mock Supabase fallback
const mockSupabaseInsert = jest.fn();
const mockSupabaseClient = {
  from: jest.fn(() => ({
    insert: mockSupabaseInsert
  }))
};

jest.mock("../../auth/supabaseClient", () => ({
  getSupabase: jest.fn(() => mockSupabaseClient)
}));

// Mock getOrInitDisplayName fallback
jest.mock("../../services/profile-service", () => ({
  getOrInitDisplayName: jest.fn().mockResolvedValue({ displayName: "Nicholas" })
}));

describe("Team Activity Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------------------------------------------
  // fetchTeamActivity
  // --------------------------------------------------------
  test("fetchTeamActivity returns items on success", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([{ id: "1" }])
    });

    const result = await fetchTeamActivity("team123");

    expect(result.success).toBe(true);
    expect(result.items).toEqual([{ id: "1" }]);
  });

  test("fetchTeamActivity returns error on HTTP failure", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue("Server error")
    });

    const result = await fetchTeamActivity("team123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("HTTP 500");
  });

  test("fetchTeamActivity handles exception", async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error("Network down"));

    const result = await fetchTeamActivity("team123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network down");
  });

  // --------------------------------------------------------
  // insertLiveShareActivity
  // --------------------------------------------------------
  test("insertLiveShareActivity succeeds", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ summary: "ok" })
    });

    const result = await insertLiveShareActivity(
      "team1", "user1", "live_share_started", "Nick", "s123", "snap1", "link"
    );

    expect(result.success).toBe(true);
    expect(result.summary).toBe("ok");
  });

  test("insertLiveShareActivity returns error on failure", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue("Bad")
    });

    const result = await insertLiveShareActivity(
      "team1", "user1", "live_share_started", "Nick"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("HTTP 400");
  });

  // --------------------------------------------------------
  // updateLiveShareActivityLink
  // --------------------------------------------------------
  test("updateLiveShareActivityLink succeeds", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({})
    });

    const result = await updateLiveShareActivityLink(
      "team1", "s123", "myLink"
    );

    expect(result.success).toBe(true);
  });

  test("updateLiveShareActivityLink fails", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      text: jest.fn().mockResolvedValue("not found")
    });

    const result = await updateLiveShareActivityLink(
      "team1", "s123", "link"
    );

    expect(result.success).toBe(false);
  });

  // --------------------------------------------------------
  // cleanupOrphanedPinnedEvents
  // --------------------------------------------------------
  test("cleanupOrphanedPinnedEvents succeeds", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({})
    });

    const result = await cleanupOrphanedPinnedEvents("team1");

    expect(result.success).toBe(true);
  });

  test("cleanupOrphanedPinnedEvents fails", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      text: jest.fn().mockResolvedValue("forbidden")
    });

    const result = await cleanupOrphanedPinnedEvents("team1");

    expect(result.success).toBe(false);
  });

  // --------------------------------------------------------
  // insertLiveShareSessionEnd
  // --------------------------------------------------------
  test("insertLiveShareSessionEnd succeeds", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ summary: "ended" })
    });

    const result = await insertLiveShareSessionEnd(
      "team1", "user1", "Nick", "sess1", 42, "snap"
    );

    expect(result.success).toBe(true);
    expect(result.summary).toBe("ended");
  });

  test("insertLiveShareSessionEnd fails", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue("error")
    });

    const result = await insertLiveShareSessionEnd(
      "team1", "user1", "Nick", "s1", 10
    );

    expect(result.success).toBe(false);
  });

  // --------------------------------------------------------
  // insertLiveShareSummary
  // --------------------------------------------------------
  test("insertLiveShareSummary succeeds", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ snapshot_id: "snap99" })
    });

    const result = await insertLiveShareSummary(
      "t1", "u1", "Nick", "s1", "diff output"
    );

    expect(result.success).toBe(true);
    expect(result.snapshotId).toBe("snap99");
  });

  test("insertLiveShareSummary fails", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 422,
      text: jest.fn().mockResolvedValue("bad")
    });

    const result = await insertLiveShareSummary(
      "t1", "u1", "Nick", "s1", "diff"
    );

    expect(result.success).toBe(false);
  });

  // --------------------------------------------------------
  // insertParticipantStatusEvent
  // --------------------------------------------------------
  test("insertParticipantStatusEvent succeeds via backend", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn()
    });

    const result = await insertParticipantStatusEvent(
      "team1", "user1", ["u2"], []
    );

    expect(result.success).toBe(true);
    expect(mockSupabaseInsert).not.toHaveBeenCalled();
  });

  test("insertParticipantStatusEvent falls back to Supabase on backend failure", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      text: jest.fn().mockResolvedValue("missing route")
    });

    mockSupabaseInsert.mockResolvedValue({ error: null });

    const result = await insertParticipantStatusEvent(
      "team1", "user1", ["a"], []
    );

    expect(result.success).toBe(true);
    expect(mockSupabaseInsert).toHaveBeenCalled();
  });

  test("insertParticipantStatusEvent fallback insert fails", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue("fail")
    });

    mockSupabaseInsert.mockResolvedValue({
      error: { message: "Insert error" }
    });

    const result = await insertParticipantStatusEvent(
      "team1", "user1", ["u2"], []
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Insert error");
  });
});
