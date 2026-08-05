import { app } from "../server/worker";
import { vi } from "vite-plus/test";

describe("Cloudflare Worker HTTP boundary", () => {
  it("returns a health response with a request id", async () => {
    const response = await app.request(
      "http://localhost/api/health",
      { headers: { Origin: "http://localhost:5173" } },
      { ENVIRONMENT: "development" } as never,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Request-ID")).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      environment: "development",
    });
  });

  it("rejects unknown routes with a JSON error", async () => {
    const response = await app.request(
      "http://localhost/api/does-not-exist",
      {},
      {} as never,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found" });
  });

  it("reports an explicit CopilotKit configuration gap", async () => {
    const response = await app.request("http://localhost/api/copilotkit", {}, {
      COPILOTKIT_RUNTIME_URL: "",
    } as never);

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("COPILOTKIT_RUNTIME_URL"),
    });
  });

  it("forwards CopilotKit requests to the configured runtime", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("streamed response", { status: 200 }));

    const response = await app.request(
      "http://localhost/api/copilotkit?threadId=thread-1",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "hello" }),
      },
      {
        APP_ORIGIN: "http://localhost:5173",
        COPILOTKIT_RUNTIME_URL: "http://localhost:4000/api/copilotkit",
      } as never,
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("streamed response");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "http://localhost:4000/api/copilotkit?threadId=thread-1",
      }),
    );
    fetchMock.mockRestore();
  });
});
