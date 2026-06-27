    import dotenv from 'dotenv';
    import express from 'express';
    import cors from 'cors';
    import routes from './routes';
    import { connectDB } from './db';
    import { runParser } from "./parser";
    dotenv.config();

    const app = express();
    const port = Number(process.env.PORT || 4000);

    app.use(cors({ origin: ['http://localhost:5173'] }));
    app.use(express.json());
    app.use('/api', routes);

    connectDB()
    .then(async () => {
        app.listen(port, async () => {
        console.log(`Backend started: http://localhost:${port}`);

        console.log("STARTING PARSER ON BOOT...");
        runParser()
            .then((r) => console.log("BOOT PARSER DONE:", r))
            .catch((e) => console.error("BOOT PARSER ERROR:", e));
        });
    })
    .catch((error) => {
        console.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    });
