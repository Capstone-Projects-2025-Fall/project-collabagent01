import { SessionSyncService } from "../../services/session-sync-service";
import { getSupabase } from "../../auth/supabaseClient";

jest.mock("../../auth/supabaseClient", () => ({
  getSupabase: jest.fn(),
}));

// Fake realtime channel object we can control
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockImplementation((cb) => {
    cb("SUBSCRIBED");
    return mockChannel;
  }),
  unsubscribe: jest.fn().mockResolvedValue(true),
};

describe("SessionSyncService", () => {
  let supabaseMock: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // --- unified mock returning the same structure for every from() call ---
    const mockFromReturn = {
      upsert: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    supabaseMock = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user123" } } }),
      },
      from: jest.fn(() => mockFromReturn),
      channel: jest.fn(() => mockChannel),
    };

    (getSupabase as jest.Mock).mockReturnValue(supabaseMock);
  });

  // --------------------------------------------------
  // joinSession()
  // --------------------------------------------------
  test("joinSession upserts participant and subscribes", async () => {
    const service = new SessionSyncService();

    await service.joinSession("sessionA", "nickgithub", 5);

    expect(supabaseMock.auth.getUser).toHaveBeenCalled();
    expect(supabaseMock.from).toHaveBeenCalledWith("session_participants");

    // Check upsert call
    const upsertMock = supabaseMock.from().upsert;
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: "sessionA",
        user_id: "user123",
        github_username: "nickgithub",
        peer_number: 5,
      }),
      { onConflict: "session_id,peer_number" }
    );

    // Subscription should be created
    expect(supabaseMock.channel).toHaveBeenCalledWith("session_sessionA");
    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  test("joinSession logs error if upsert fails", async () => {
    supabaseMock.from = jest.fn(() => ({
      upsert: jest.fn().mockResolvedValue({ error: { message: "fail" } }),
    }));

    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const service = new SessionSyncService();

    await service.joinSession("sessionA", "nickgithub", 5);

    expect(spy).toHaveBeenCalledWith(
      "[SessionSync] Failed to announce presence:",
      expect.any(Object)
    );

    spy.mockRestore();
  });


  // --------------------------------------------------
  // getParticipants()
  // --------------------------------------------------
  test("getParticipants returns participant list", async () => {
    supabaseMock.from().order.mockResolvedValue({
      data: [{ id: "x" }],
      error: null,
    });

    const service = new SessionSyncService();
    const result = await service.getParticipants("sessionA");

    expect(result).toEqual([{ id: "x" }]);
  });

  test("getParticipants handles error", async () => {
    supabaseMock.from().order.mockResolvedValue({
      data: null,
      error: { message: "fail" },
    });

    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const service = new SessionSyncService();

    const result = await service.getParticipants("sessionA");

    expect(result).toEqual([]);
    spy.mockRestore();
  });

  // --------------------------------------------------
  // leaveSession()
  // --------------------------------------------------
  test("leaveSession deletes participant and unsubscribes", async () => {
    const service = new SessionSyncService();
    (service as any).sessionId = "sessionA";
    (service as any).channel = mockChannel;

    await service.leaveSession();

    expect(supabaseMock.from().delete).toHaveBeenCalled();
    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });

  test("leaveSession does nothing if no sessionId", async () => {
    const service = new SessionSyncService();
    await service.leaveSession();
    expect(supabaseMock.from().delete).not.toHaveBeenCalled();
  });

  // --------------------------------------------------
  // cleanupSession()
  // --------------------------------------------------
  test("cleanupSession deletes all participants", async () => {
    const service = new SessionSyncService();

    await service.cleanupSession("sessionA");

    expect(supabaseMock.from().delete).toHaveBeenCalled();
  });

  test("cleanupSession unsubscribes if owning session", async () => {
    const service = new SessionSyncService();
    (service as any).sessionId = "sessionA";
    (service as any).channel = mockChannel;

    await service.cleanupSession("sessionA");

    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });
});
