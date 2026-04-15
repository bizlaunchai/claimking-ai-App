import { S3Client } from "@aws-sdk/client-s3";

const isLocal = process.env.NODE_ENV === "development";

export const s3 = new S3Client({
    region: process.env.AWS_REGION,
    ...(isLocal
        ? {
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        }
        : {}),
});