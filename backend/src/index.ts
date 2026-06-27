import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cron from "node-cron";

import routes from "./routes";
import { connectDB } from "./db";
import { runParser } from "./parser";

const app = express();
const port = Number(process.env.PORT ?? 4000);

const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

app.use(cors({ origin: corsOrigins }));
app.use(express.json());
app.use("/api", routes);

let parserRunning = false;

export async function startParser() {
    if (parserRunning) {
        console.log("Parser is already running. Skipping...");
        return;
    }

    parserRunning = true;

    try {
        console.log("STARTING PARSER...");
        const result = await runParser();
        console.log(
            `PARSER DONE: ${result.total} records, ${result.unmatched} unmatched, ` +
            `${result.errors.length} errors, fetch ${(result.fetchMs / 1000).toFixed(1)}s`
        );
        if (result.errors.length > 0) {
            console.warn("Parser errors:", result.errors);
        }
    } catch (err: any) {
        if (err?.name === "BulkWriteError" || err?.code === 11000) {
            console.error("PARSER ERROR: BulkWriteError", err?.message);
        } else {
            console.error("PARSER ERROR:", err?.message ?? err);
        }
    } finally {
        parserRunning = false;
    }
}

function scheduleParserCron() {
    const schedule = process.env.PARSER_CRON ?? "0 3 * * *";
    if (schedule === "off" || schedule === "false") {
        console.log("Parser cron disabled");
        return;
    }

    cron.schedule(schedule, () => {
        console.log("Cron: scheduled parser run");
        void startParser();
    });

    console.log(`Parser cron scheduled: ${schedule}`);
}

async function bootstrap() {
    try {
        await connectDB();

        app.listen(port, () => {
            console.log(`Backend started: http://localhost:${port}`);

            scheduleParserCron();

            if (process.env.RUN_PARSER_ON_BOOT !== "false") {
                void startParser();
            }
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
