import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import crypto from "crypto";

const DEFAULT_API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api/v1";

const VALID_CATEGORIES = ["Crypto", "Finance", "NFL", "NBA", "Cricket", "Football", "Politics", "Election", "World", "Sports"];
const VALID_TERMS = ["Ultra Short", "Short", "Long"];

export async function GET(request: NextRequest) {
  // Get API key from environment variable (backend only)
  const apiKey = process.env.MERCHANT_API_KEY;
  const customEndpoint = request.headers.get("X-API-Endpoint");

  try {

    if (!apiKey) {
      return NextResponse.json(
        { message: "API key not configured. Please set MERCHANT_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    // Use custom endpoint if provided, otherwise use default
    const apiBaseUrl = customEndpoint || DEFAULT_API_BASE_URL;
    // Handle different URL patterns: /v1, /api/v1, or just base URL
    let baseUrl = apiBaseUrl.trim();
    // Remove trailing slash if present
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }
    // If URL doesn't end with /v1 or /api/v1, try to construct it
    if (!baseUrl.endsWith("/v1") && !baseUrl.endsWith("/api/v1")) {
      // If it already includes /api/, add /v1
      if (baseUrl.includes("/api/")) {
        baseUrl = `${baseUrl}/v1`;
      } else {
        // Otherwise, add /api/v1 (preferred pattern)
        baseUrl = `${baseUrl}/api/v1`;
      }
    }
    const apiUrl = `${baseUrl}/markets`;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const term = searchParams.get("term");

    // Validate and build query params
    const queryParams: Record<string, string> = {};
    if (category && VALID_CATEGORIES.includes(category)) {
      queryParams.category = category;
    }
    if (term && VALID_TERMS.includes(term)) {
      queryParams.term = term;
    }

    const response = await axios.get(apiUrl, {
      headers: {
        "X-Merchant-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("Error fetching markets:", error);

    if (error.response) {
      return NextResponse.json(
        { message: error.response.data?.message || "Failed to fetch markets" },
        { status: error.response.status }
      );
    }

    // Handle DNS/network errors
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      const apiBaseUrl = customEndpoint || DEFAULT_API_BASE_URL;
      return NextResponse.json(
        {
          message: `Cannot connect to API endpoint "${apiBaseUrl}". The domain may not exist or the server is unreachable. Please check your API endpoint configuration in settings.`
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        message: error.message || "Network error. Please check your connection and API endpoint configuration."
      },
      { status: 500 }
    );
  }
}

