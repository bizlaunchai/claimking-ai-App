import {
    DeleteObjectCommand,
    PutObjectCommand,
    GetObjectCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "@/lib/s3";
import path from "path";
import crypto from "crypto";

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) {
            return Response.json(
                { success: false, message: "No file found" },
                { status: 400 }
            );
        }

        // Convert to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Unique filename
        const ext = path.extname(file.name);
        const key = `${crypto.randomUUID()}${ext}`;

        // Upload to S3 (PRIVATE)
        await s3.send(
            new PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: key,
                Body: buffer,
                ContentType: file.type,
            })
        );


        return Response.json({
            success: true,
            message: "File uploaded successfully",
            payload: {
                name: file.name,
                type: file.type,
                size: file.size,
                key,
            },
        });
    } catch (err) {
        console.error(err);
        return Response.json(
            { success: false, message: "Upload failed" },
            { status: 500 }
        );
    }
}

export async function GET(req) {
    const key = req.nextUrl.searchParams.get("key");

    if (!key) return new Response(JSON.stringify({ error: "No key provided" }), { status: 400 });

    try {
        const s3Object = await s3.send(
            new GetObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: key,
            })
        );

        return new Response(s3Object.Body, {
            headers: {
                "Content-Type": s3Object.ContentType,
                // "Content-Disposition": `attachment; filename="${key}"`,
            },
        });
    } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: "File not found" }), { status: 404 });
    }
}


export async function DELETE(req) {
    try {
        const { key } = await req.json();

        if (!key) {
            return Response.json(
                { success: false, message: "No key provided" },
                { status: 400 }
            );
        }

        await s3.send(
            new DeleteObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: key,
            })
        );

        return Response.json({
            success: true,
            message: "File deleted successfully",
        });
    } catch (err) {
        console.error(err);
        return Response.json(
            { success: false, message: "Delete failed" },
            { status: 500 }
        );
    }
}
