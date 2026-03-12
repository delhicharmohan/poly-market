import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'TradeFlow — Live Trading',
    description: 'Real-time binary options trading with live WebSocket feeds',
};

export default function TradeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {/* JetBrains Mono for the trading UI */}
            <link
                href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap"
                rel="stylesheet"
            />
            <div
                style={{
                    fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
                    background: '#060911',
                    color: '#e2e8f0',
                    height: '100vh',
                    overflow: 'hidden',
                }}
            >
                {children}
            </div>
        </>
    );
}
