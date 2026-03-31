import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage, Server } from "http";
import type { ITransaction } from "@workspace/db";

/** Shape pushed over WebSocket (Mongo `_id` as string `id`). */
export type EmittedTransaction = ITransaction & { id: string };
import { isValidSolanaAddress } from "./solana.js";

interface SubscriptionMessage {
  type: "subscribe" | "unsubscribe";
  address: string;
}

interface ClientWithSubs extends WebSocket {
  subscribedAddresses?: Set<string>;
  isAlive?: boolean;
}

let wss: WebSocketServer | null = null;

export function setupWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: ClientWithSubs, _req: IncomingMessage) => {
    ws.subscribedAddresses = new Set();
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as SubscriptionMessage;
        if (
          msg.type === "subscribe" &&
          msg.address &&
          isValidSolanaAddress(msg.address)
        ) {
          ws.subscribedAddresses!.add(msg.address);
          console.log(`[WS] Client subscribed to ${msg.address}`);
        } else if (msg.type === "unsubscribe" && msg.address) {
          ws.subscribedAddresses!.delete(msg.address);
        }
      } catch {
        console.error("[WS] Failed to parse message");
      }
    });

    ws.on("error", (err) => {
      console.error("[WS] Client error:", err.message);
    });
  });

  const interval = setInterval(() => {
    wss!.clients.forEach((ws) => {
      const client = ws as ClientWithSubs;
      if (client.isAlive === false) {
        client.terminate();
        return;
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  console.log("[WS] WebSocket server ready at /ws");
  return wss;
}

export function emitTransactions(
  address: string,
  transactions: EmittedTransaction[],
): void {
  if (!wss) return;

  const payload = JSON.stringify({
    type: "transactions",
    address,
    transactions,
  });

  wss.clients.forEach((ws) => {
    const client = ws as ClientWithSubs;
    if (
      client.readyState === WebSocket.OPEN &&
      client.subscribedAddresses?.has(address)
    ) {
      client.send(payload);
    }
  });
}
