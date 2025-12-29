import express from "express";
import multer from "multer";
import {
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import s3 from "../s3.js";
import File from "../models/File.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* =======================
   POST /api/upload
   Upload to S3 + Save to Mongo
======================= */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    // console.log("1. Starting S3 Upload...");
    const file = req.file;
    const s3Key = `uploads/${Date.now()}-${file.originalname}`;

    // Upload to S3
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );
    // console.log("2. S3 Upload Finished.");
    // Save metadata to MongoDB
    const newFile = await File.create({
      originalName: file.originalname,
      s3Key,
      fileUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`,
      fileType: file.mimetype,
      fileSize: file.size,
    });
    

    res.status(201).json(newFile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =======================
   GET /api/files
   Read from Mongo + presigned URLs
======================= */
router.get("/files", async (req, res) => {
  try {
    const files = await File.find().sort({ createdAt: -1 });

    const result = await Promise.all(
      files.map(async (file) => {
        const command = new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: file.s3Key,
        });

        const viewUrl = await getSignedUrl(s3, command, {
          expiresIn: 3600,
        });

        return {
          ...file.toObject(),
          viewUrl,
        };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Error fetching files" });
  }
});

/* =======================
   DELETE /api/delete
   Delete from S3 + Mongo
======================= */
router.delete("/delete", async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: "File key required" });
    }

    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      })
    );

    await File.findOneAndDelete({ s3Key: key });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
