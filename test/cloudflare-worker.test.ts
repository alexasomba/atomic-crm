import { app, worker } from "../server/worker";
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

  it("serves the SPA shell for direct client routes", async () => {
    const assets = {
      fetch: vi.fn().mockResolvedValue(
        new Response('<html><div id="root"></div></html>', {
          headers: { "Content-Type": "text/html" },
        }),
      ),
    };

    const response = await worker.fetch(
      new Request("https://crm.example/contacts?status=hot"),
      { ASSETS: assets } as never,
      {} as never,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('id="root"');
    expect(assets.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://crm.example/" }),
    );
  });

  it("reports an explicit native CopilotKit configuration gap", async () => {
    const response = await app.request("http://localhost/api/copilotkit", {}, {
      COPILOTKIT_RUNTIME_MODE: "native",
      COPILOTKIT_RUNTIME_URL: "",
    } as never);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("Workers AI binding"),
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
        COPILOTKIT_RUNTIME_MODE: "proxy",
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

  it("rejects oversized inbound email before reading or storing it", async () => {
    let rejected = "";
    await worker.email(
      {
        rawSize: 26 * 1024 * 1024,
        to: "crm@atomic-crm.asomba.com",
        from: "demo-admin@atomic-crm.asomba.com",
        headers: new Headers(),
        raw: new ReadableStream(),
        setReject: (reason: string) => {
          rejected = reason;
        },
      } as never,
      {} as never,
      {} as never,
    );

    expect(rejected).toContain("25 MB");
  });

  it("rejects inbound email addressed outside the configured CRM address", async () => {
    let rejected = "";
    await worker.email(
      {
        rawSize: 128,
        to: "other@atomic-crm.asomba.com",
        from: "demo-admin@atomic-crm.asomba.com",
        headers: new Headers(),
        raw: new ReadableStream(),
        setReject: (reason: string) => {
          rejected = reason;
        },
      } as never,
      { VITE_INBOUND_EMAIL_ADDRESS: "crm@atomic-crm.asomba.com" } as never,
      {} as never,
    );

    expect(rejected).toBe("Unknown recipient");
  });
});
