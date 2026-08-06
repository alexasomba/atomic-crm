import { describe, expect, it } from "vite-plus/test";
import { getDeterministicCopilotMessages } from "./deterministicChat";

describe("deterministic Copilot chat", () => {
  it("provides a repeatable TanStack AI conversation", () => {
    const messages = getDeterministicCopilotMessages();

    expect(messages).toHaveLength(5);
    expect(messages[0]?.role).toBe("user");
    expect(messages[1]?.role).toBe("assistant");
  });
});
