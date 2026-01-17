import axios, { AxiosError } from "axios";
import { Market, WagerRequest, WagerResponse, MarketCategory, MarketTerm } from "@/types";

class IndimarketAPI {
  private getHeaders() {
    return {
      "Content-Type": "application/json",
    };
  }

  async getMarkets(category?: MarketCategory, term?: MarketTerm): Promise<Market[]> {
    try {
      const headers = this.getHeaders();
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (term) params.term = term;

      const response = await axios.get<Market[]>("/api/markets", {
        headers,
        params,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string }>;
        throw new Error(
          axiosError.response?.data?.message ||
          `Failed to fetch markets: ${axiosError.message}`
        );
      }
      throw error;
    }
  }

  async placeWager(wager: WagerRequest): Promise<WagerResponse> {
    try {
      const headers = this.getHeaders();
      const response = await axios.post<WagerResponse>("/api/wager", wager, {
        headers,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string }>;
        const status = axiosError.response?.status;
        let message = axiosError.response?.data?.message || axiosError.message;

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

        throw new Error(message);
      }
      throw error;
    }
  }
}

export const api = new IndimarketAPI();

