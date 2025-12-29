import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  originalName: String,
  s3Key: String,
  fileUrl: String,
  fileType: String,
  fileSize: Number,
  createdAt: { type: Date, default: Date.now }
});

// Important: Mongoose turns 'File' into 'files' in the database
export default mongoose.model("File", fileSchema);