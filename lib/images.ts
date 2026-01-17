import { MarketCategory } from "@/types";

const CATEGORY_IMAGES: Record<string, string> = {
    Politics: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&q=80&w=800",
    Election: "https://images.unsplash.com/photo-1540910419892-f0c74b0e8966?auto=format&fit=crop&q=80&w=800",
    Cricket: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=800",
    Football: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800",
    Sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=800",
    Crypto: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&q=80&w=800",
    Finance: "https://images.unsplash.com/photo-1611974714013-3c74567498b9?auto=format&fit=crop&q=80&w=800",
    NFL: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&q=80&w=800",
    NBA: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&q=80&w=800",
    World: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&q=80&w=800",
    Default: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800",
};

const KEYWORD_IMAGES: Record<string, string> = {
    reliance: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&q=80&w=800",
    tata: "https://images.unsplash.com/photo-1519307212971-dd9561667ffb?auto=format&fit=crop&q=80&w=800",
    modi: "https://images.unsplash.com/photo-1532105956626-9569c03602f6?auto=format&fit=crop&q=80&w=800",
    india: "https://images.unsplash.com/photo-1524492459414-8f43722519a7?auto=format&fit=crop&q=80&w=800",
    bitcoin: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&q=80&w=800",
    ethereum: "https://images.unsplash.com/photo-1622790698141-94e30457ef12?auto=format&fit=crop&q=80&w=800",
    tesla: "https://images.unsplash.com/photo-1617788138017-80ad42243c5d?auto=format&fit=crop&q=80&w=800",
    apple: "https://images.unsplash.com/photo-1621330396173-e41b1cafd17f?auto=format&fit=crop&q=80&w=800",
    stock: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800",
    poker: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&q=80&w=800",
};

export function getMarketImage(category: MarketCategory | string | undefined, title?: string): string {
    // Try keyword matching first
    if (title) {
        const lowerTitle = title.toLowerCase();
        for (const [keyword, url] of Object.entries(KEYWORD_IMAGES)) {
            if (lowerTitle.includes(keyword)) {
                return url;
            }
        }
    }

    // Fallback to category matching
    if (!category) return CATEGORY_IMAGES.Default;
    return CATEGORY_IMAGES[category] || CATEGORY_IMAGES.Default;
}
