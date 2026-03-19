import http from "http";
import app from "./app.js";
import { setupWebSocket } from "./lib/websocket.js";
import { scheduleAllWallets } from "./lib/queue.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

setupWebSocket(server);

server.listen(port, async () => {
  console.log(`Server listening on port ${port}`);
  await scheduleAllWallets().catch((err) => {
    console.error("Failed to reschedule wallets:", err.message);
  });
});
