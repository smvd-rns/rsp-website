import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "./client";
import { sendRealtimeBroadcast } from "./realtime-utils";

describe("realtime-utils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should subscribe, send broadcast, and remove channel when SUBSCRIBED", async () => {
    const sendMock = vi.fn().mockResolvedValue({});
    let subscribeCallback: (status: string) => Promise<void> = async () => {};

    const mockChannel = {
      send: sendMock,
      subscribe: vi.fn((cb) => {
        subscribeCallback = cb;
        return mockChannel;
      }),
    };

    const removeChannelMock = vi.fn();
    const mockSupabase = {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: removeChannelMock,
    };

    vi.spyOn(client, "createClient").mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof client.createClient>,
    );

    sendRealtimeBroadcast("test-channel", "test-event", { key: "value" });

    expect(mockSupabase.channel).toHaveBeenCalledWith("test-channel");
    expect(mockChannel.subscribe).toHaveBeenCalled();

    await subscribeCallback("SUBSCRIBED");

    expect(sendMock).toHaveBeenCalledWith({
      type: "broadcast",
      event: "test-event",
      payload: { key: "value" },
    });

    vi.advanceTimersByTime(250);
    expect(removeChannelMock).toHaveBeenCalledWith(mockChannel);
  });

  it("should remove channel immediately on error or timeout", () => {
    let subscribeCallback: (status: string) => void = () => {};
    const mockChannel = {
      send: vi.fn(),
      subscribe: vi.fn((cb) => {
        subscribeCallback = cb;
        return mockChannel;
      }),
    };

    const removeChannelMock = vi.fn();
    const mockSupabase = {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: removeChannelMock,
    };

    vi.spyOn(client, "createClient").mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof client.createClient>,
    );

    sendRealtimeBroadcast("err-channel", "event", {});
    subscribeCallback("CHANNEL_ERROR");
    expect(removeChannelMock).toHaveBeenCalledWith(mockChannel);
  });
});
