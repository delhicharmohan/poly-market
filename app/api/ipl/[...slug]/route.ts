import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const DEFAULT_API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api/v1";

function getBaseUrl(customEndpoint: string | null) {
  const apiBaseUrl = customEndpoint || DEFAULT_API_BASE_URL;
  let baseUrl = apiBaseUrl.trim();
  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }
  if (!baseUrl.endsWith("/v1") && !baseUrl.endsWith("/api/v1")) {
    if (baseUrl.includes("/api/")) {
      baseUrl = `${baseUrl}/v1`;
    } else {
      baseUrl = `${baseUrl}/api/v1`;
    }
  }
  return baseUrl;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  const apiKey = process.env.MERCHANT_API_KEY;
  const customEndpoint = request.headers.get("X-API-Endpoint");

  try {
    if (!apiKey) {
      return NextResponse.json(
        { message: "API key not configured. Please set MERCHANT_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    const baseUrl = getBaseUrl(customEndpoint);
    
    // Construct the Antigravity API URL for IPL endpoints
    const path = params.slug.join('/');
    const apiUrl = `${baseUrl}/ipl/${path}`;

    // Get query parameters to pass along
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const response = await axios.get(apiUrl, {
      headers: {
        "X-Merchant-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(`Error fetching IPL data for ${params.slug.join('/')}:`, error?.response?.data || error.message);

    if (error.response) {
      return NextResponse.json(
        { message: error.response.data?.message || "Failed to fetch IPL data" },
        { status: error.response.status }
      );
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      const apiBaseUrl = customEndpoint || DEFAULT_API_BASE_URL;
      return NextResponse.json(
        { message: `Cannot connect to API endpoint "${apiBaseUrl}".` },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { message: error.message || "Network error." },
      { status: 500 }
    );
  }
}
