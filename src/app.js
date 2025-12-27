import 'dotenv/config'; // This fixes the "is not a function" error AND loads variables early
import express from "express";
import cors from "cors";
import uploadRoute from "./routes/upload.js";
import connectDB from "../db.js";

const app = express();
app.use(cors());
app.use(express.json()); // Essential for handling JSON data
connectDB();
// routes
app.use("/api", uploadRoute);

// Added a fallback PORT in case your .env is not found
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});