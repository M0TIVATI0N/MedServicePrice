import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import routes from "./routes";
import { connectDB } from "./db";
import { runParser } from "./parser";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(
    cors({
        origin: ["http://localhost:5173"],
    })
);

app.use(express.json());
app.use("/api", routes);

let parserRunning = false;

async function startParser() {
    if (parserRunning) {
        console.log("Parser is already running. Skipping...");
        return;
    }

    parserRunning = true;

    try {
        console.log("STARTING PARSER ON BOOT...");

        const result = await runParser();

        console.log("BOOT PARSER DONE:");
        console.dir(result, { depth: null });
    } catch (err) {
        console.error("BOOT PARSER ERROR:", err);
    } finally {
        parserRunning = false;
    }
}

async function bootstrap() {
    try {
        await connectDB();

        app.listen(port, () => {
            console.log(`Backend started: http://localhost:${port}`);

            // Run parser without blocking the server startup
            void startParser();
        });
    } catch (err) {
        console.error("Failed to connect to MongoDB:", err);
        process.exit(1);
    }
}

bootstrap();

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});