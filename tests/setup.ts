import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock Next.js server modules that aren't available in test environment
vi.mock("next/server", () => {
  class MockNextRequest {
    private _url: string;
    private _method: string;
    private _headers: Map<string, string>;
    private _body: string | null;
    private _cookies: Map<string, { value: string }>;

    constructor(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) {
      this._url = url;
      this._method = init?.method || "GET";
      this._headers = new Map(Object.entries(init?.headers || {}));
      this._body = init?.body || null;
      this._cookies = new Map();
    }

    get url() { return this._url; }
    get method() { return this._method; }

    get headers() {
      return {
        get: (key: string) => this._headers.get(key) ?? null,
        has: (key: string) => this._headers.has(key),
        entries: () => this._headers.entries(),
      };
    }

    get cookies() {
      return {
        get: (name: string) => this._cookies.get(name),
        set: (name: string, value: string) => this._cookies.set(name, { value }),
      };
    }

    setCookie(name: string, value: string) {
      this._cookies.set(name, { value });
    }

    async text() { return this._body || ""; }
    async json() { return JSON.parse(this._body || "{}"); }
  }

  class MockNextResponse {
    status: number;
    body: any;
    _headers: Map<string, string>;

    constructor(body: any, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status || 200;
      this._headers = new Map(Object.entries(init?.headers || {}));
    }

    async json() { return this.body; }

    get headers() {
      return {
        get: (key: string) => this._headers.get(key),
        set: (key: string, value: string) => this._headers.set(key, value),
      };
    }

    static json(body: any, init?: { status?: number; headers?: Record<string, string> }) {
      return new MockNextResponse(body, init);
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});
