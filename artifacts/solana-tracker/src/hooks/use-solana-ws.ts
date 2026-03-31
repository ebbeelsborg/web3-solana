import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetWalletTransactionsQueryKey } from "@workspace/api-client-react";
import type {
  WalletTransactionsResponse,
  Transaction,
} from "@workspace/api-client-react";

export function useSolanaWebSocket(address?: string) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;
      setStatus("connecting");

      // Use wss:// if on HTTPS, otherwise ws://
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setStatus("connected");
        // Subscribe to the current wallet
        if (address) {
          ws.send(JSON.stringify({ type: "subscribe", address }));
        }
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);

          if (
            data.type === "transactions" &&
            address &&
            data.address === address &&
            data.transactions
          ) {
            // Update React Query Cache directly
            const queryKey = getGetWalletTransactionsQueryKey(address);

            queryClient.setQueryData(
              queryKey,
              (oldData: WalletTransactionsResponse | undefined) => {
                if (!oldData) return oldData;

                const existingTxs = oldData.transactions || [];
                const newTxs = data.transactions as Transaction[];

                // Merge and deduplicate by signature
                const merged = [...newTxs, ...existingTxs];
                const uniqueMap = new Map<string, Transaction>();

                merged.forEach((tx) => {
                  if (!uniqueMap.has(tx.signature)) {
                    uniqueMap.set(tx.signature, tx);
                  }
                });

                // Keep sorted by blockTime/createdAt descending
                const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
                  const timeA =
                    a.blockTime || new Date(a.createdAt).getTime() / 1000;
                  const timeB =
                    b.blockTime || new Date(b.createdAt).getTime() / 1000;
                  return timeB - timeA;
                });

                return {
                  ...oldData,
                  transactions: sorted,
                };
              },
            );
          }
        } catch (e) {
          console.error("Failed to parse WS message", e);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setStatus("disconnected");
        // Attempt reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [address, queryClient]);

  // Re-subscribe if address changes while connected
  useEffect(() => {
    if (
      status === "connected" &&
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      address
    ) {
      wsRef.current.send(JSON.stringify({ type: "subscribe", address }));
    }
  }, [address, status]);

  return { status };
}
