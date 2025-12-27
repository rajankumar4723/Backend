import express from "express";
import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../s3.js";

const router = express.Router();
const upload = multer(); // store file in memory

// POST /upload
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    // S3 upload params
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `uploads/${Date.now()}-${req.file.originalname}`, // folder/file
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    await s3.send(new PutObjectCommand(params));

    res.json({ message: "File uploaded successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/files", async (req, res) => {
  try {
    const listParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
    };

    // 1. Fetch the list of objects from S3
    const data = await s3.send(new ListObjectsV2Command(listParams));

    if (!data.Contents) {
      return res.json({ message: "Bucket is empty", files: [] });
    }

    // 2. For each file, generate a temporary viewing URL (Pre-signed URL)
    const fileList = await Promise.all(
      data.Contents.map(async (file) => {
        const getCommand = new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: file.Key,
        });

        // The URL will expire in 1 hour (3600 seconds)
        const url = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });

        return {
          name: file.Key,
          size: (file.Size / 1024).toFixed(2) + " KB",
          lastModified: file.LastModified,
          viewUrl: url,
        };
      })
    );

    res.json(fileList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete("/delete", async (req, res) => {
  try {
    const { key } = req.body; // Expecting { "key": "uploads/123-file.jpg" }

    if (!key) {
      return res.status(400).json({ error: "File key is required to delete" });
    }

    const deleteParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    };

    await s3.send(new DeleteObjectCommand(deleteParams));

    res.json({ message: `File ${key} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
