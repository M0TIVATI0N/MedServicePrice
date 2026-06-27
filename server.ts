import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { connectDB } from "./server/db";
import routes from "./server/routes";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API Routes
  app.use("/api", routes);

  // Fallback for API 404
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Connect to DB and start server
  try {
    await connectDB();
    console.log("Connected to MongoDB successfully");
    
    // Seed data if empty
    import('./server/db').then(async ({ OfferRecord }) => {
      const count = await OfferRecord.countDocuments();
      if (count === 0) {
        console.log("No data found, starting parser to seed database...");
        import('./server/parser').then(({ runParser }) => runParser().catch(console.error));
      }
    });

  } catch (err) {
    console.error("Failed to connect to MongoDB. Starting anyway for frontend testing...", err);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
