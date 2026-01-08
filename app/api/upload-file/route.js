import {DeleteObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import { s3 } from "@/lib/s3";
import path from "path";
import crypto from "crypto";

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) {
            return Response.json({
                success: false,
                message: "No file found",
            }, { status: 400 });
        }

        // // Validate file type
        // const allowed = [
        //     "image/jpeg",
        //     "image/png",
        //     "application/pdf",
        //     "application/msword",
        //     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        // ];
        //
        // if (!allowed.includes(file.type)) {
        //     return Response.json({
        //         success: false,
        //         message: "Invalid file type",
        //     }, { status: 400 });
        // }

        // Convert to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Unique filename
        const ext = path.extname(file.name);
        const key = `customer-invoice/${crypto.randomUUID()}${ext}`;

        await s3.send(
            new PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: key,
                Body: buffer,
                ContentType: file.type,
            })
        );

        const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        return Response.json({
            success: true,
            message: "File uploaded successfully",
            payload: {
                name: file.name,
                type: file.type,
                size: file.size,
                key,
                url,
            },
        });

    } catch (err) {
        console.error(err);

        return Response.json({
            success: false,
            message: "Upload failed",
        }, { status: 500 });
    }
}


export async function DELETE(req) {
    try {
        const { key } = await req.json();

        if (!key) {
            return Response.json({ success: false, message: "No key provided" }, { status: 400 });
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
        return Response.json({
            success: false,
            message: "Delete failed",
        }, { status: 500 });
    }
}