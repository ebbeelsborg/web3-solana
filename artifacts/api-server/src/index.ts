import http from "http";
import app from "./app.js";
import { setupWebSocket } from "./lib/websocket.js";
import { scheduleAllWallets } from "./lib/queue.js";
import { connectDb } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);

setupWebSocket(server);

connectDb()
  .then(() => {
    server.listen(port, async () => {
      console.log(`Server listening on port ${port}`);
      await scheduleAllWallets().catch((err) => {
        console.error("Failed to reschedule wallets:", err.message);
      });
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
