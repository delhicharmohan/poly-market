import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import crypto from "crypto";

const DEFAULT_API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api/v1";

function generateSignature(apiKey: string, body: any): string {
  const bodyStr = JSON.stringify(body);
  return crypto
    .createHmac("sha256", apiKey)
    .update(bodyStr)
    .digest("hex");
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Generate HMAC signature
    const signature = generateSignature(apiKey, body);

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
    const apiUrl = `${baseUrl}/wager`;

    const response = await axios.post(apiUrl, body, {
      headers: {
        "X-Merchant-API-Key": apiKey,
        "X-Merchant-Signature": signature,
        "Content-Type": "application/json",
      },
    });

    return NextResponse.json(response.data, { status: 201 });
  } catch (error: any) {
    console.error("Error placing wager:", error);
    
    if (error.response) {
      const status = error.response.status;
      let message = error.response.data?.message || "Failed to place wager";

      switch (status) {
        case 401:
          message = "Invalid or missing API key";
          break;
        case 403:
          message = "Invalid signature or IP not whitelisted";
          break;
        case 400:
          message = message || "Invalid parameters or market is closed";
          break;
        case 404:
          message = "Market not found";
          break;
        case 500:
          message = "Internal server error. Please try again later";
          break;
      }

      return NextResponse.json({ message }, { status });
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

