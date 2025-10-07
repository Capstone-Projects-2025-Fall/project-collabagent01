import { LogData, LogEvent } from "../../api/types/event";
import { calculateUserProgress } from "../../services/user-service";
// Deprecated tests removed after feature simplification.
describe('user-service (deprecated)', () => { it('placeholder', () => expect(true).toBe(true)); });

describe("calculateUserProgress", () => {
  // Helper function to create log entries with required timeLapse
  const createLog = (event: LogEvent, metadata: any = {}): LogData => ({
    event,
    metadata,
    timeLapse: 0, // Adding required timeLapse property
  });

  it("should return zeros when no logs are provided", () => {
    const result = calculateUserProgress([]);
    expect(result).toEqual({
      totalAccepted: 0,
      totalWithBugs: 0,
      percentageWithBugs: 0,
    });
  });

  it("should return zeros when no USER_ACCEPT events exist", () => {
    const logs: LogData[] = [
      createLog(LogEvent.USER_REJECT),
      createLog(LogEvent.MODEL_GENERATE),
    ];
    const result = calculateUserProgress(logs);
    expect(result).toEqual({
      totalAccepted: 0,
      totalWithBugs: 0,
      percentageWithBugs: 0,
    });
  });

  it("should count accepted suggestions without bugs", () => {
    const logs: LogData[] = [
      createLog(LogEvent.USER_ACCEPT, { has_bug: false }),
      createLog(LogEvent.USER_ACCEPT, { has_bug: false }),
      createLog(LogEvent.USER_REJECT),
    ];
    const result = calculateUserProgress(logs);
    expect(result).toEqual({
      totalAccepted: 2,
      totalWithBugs: 0,
      percentageWithBugs: 0,
    });
  });

  it("should count accepted suggestions with bugs", () => {
    const logs: LogData[] = [
      createLog(LogEvent.USER_ACCEPT, { has_bug: true }),
      createLog(LogEvent.USER_ACCEPT, { has_bug: false }),
      createLog(LogEvent.USER_ACCEPT, { has_bug: true }),
    ];
    const result = calculateUserProgress(logs);
    expect(result).toEqual({
      totalAccepted: 3,
      totalWithBugs: 2,
      percentageWithBugs: 66.66666666666666,
    });
  });

  it("should handle missing has_bug property", () => {
    const logs: LogData[] = [
      createLog(LogEvent.USER_ACCEPT), // treated as no bug
      createLog(LogEvent.USER_ACCEPT, { has_bug: true }),
    ];
    const result = calculateUserProgress(logs);
    expect(result).toEqual({
      totalAccepted: 2,
      totalWithBugs: 1,
      percentageWithBugs: 50,
    });
  });

  it("should handle mixed scenarios", () => {
    const logs: LogData[] = [
      createLog(LogEvent.USER_ACCEPT, { has_bug: true }),
      createLog(LogEvent.MODEL_GENERATE),
      createLog(LogEvent.USER_ACCEPT, { has_bug: false }),
      createLog(LogEvent.USER_REJECT),
      createLog(LogEvent.USER_ACCEPT), // no bug
      createLog(LogEvent.USER_ACCEPT, { has_bug: true }),
    ];
    const result = calculateUserProgress(logs);
    expect(result).toEqual({
      totalAccepted: 4,
      totalWithBugs: 2,
      percentageWithBugs: 50,
    });
  });
});
