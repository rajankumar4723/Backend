import 'dotenv/config';
import express from "express";
import cors from "cors";
import uploadRoute from "./routes/upload.js";
import connectDB from '../database.js';

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'https://main.d28r2hluiqwji1.amplifyapp.com', // your Amplify frontend URL
    'http://localhost:3000' // optional for local testing
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(express.json());


connectDB();

// routes
app.use("/api", uploadRoute);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
