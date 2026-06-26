import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import routes from './routes';
import { connectDB } from './db';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors({ origin: ['http://localhost:5173'] }));
app.use(express.json());
app.use('/api', routes);
import { runParser } from "./parser";

runParser()
    .then(console.log)
    .catch(console.error);
connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend started: http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  });
