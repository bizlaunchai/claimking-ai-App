/*
import { Dropzone, FileMosaic } from "@files-ui/react";
import crypto from "crypto";

const DEFAULT_ALLOWED = [
    ".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx",
];

export default function FileUploader({
                                         files,
                                         setFiles,
                                         allowedExtensions = DEFAULT_ALLOWED,
                                         maxSizeMB = 5,
                                         maxFiles = 1,
                                         label = 'Drop your files here...',
                                         labelStyle = { fontSize: 16, marginBottom: 2 },
                                     }) {
    const accept = allowedExtensions.join(",");

    const removeFile = async (file) => {
        try {
            if (file?.serverResponse?.payload?.key) {
                await fetch("/api/upload-file", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key: file.serverResponse.payload.key }),
                });
            }
            setFiles(files.filter((x) => x.id !== file.id));
        } catch (err) {
            console.error("Failed to delete file from S3:", err);
        }
    };

    return (
        <Dropzone
            value={files}
            onChange={(incomingFiles) => {
                // Assign unique IDs to local files
                const filesWithId = incomingFiles.map(f => ({
                    ...f,
                    id: f.id || crypto.randomUUID(),
                }));
                setFiles(filesWithId);
            }}
            accept={accept}
            maxFileSize={`${maxSizeMB}` * 1024 * 1024}
            maxFiles={maxFiles}
            actionButtons={{ position: "bottom", uploadButton: {}, abortButton: {} }}
            hideInstructions={true}
            uploadConfig={{
                url: "/api/upload-file",
                method: "POST",
                headers: { Authorization: "Bearer MY_SECRET_TOKEN" },
                cleanOnUpload: true,
                autoUpload: true
            }}
            onUploadFinish={(uploadedFiles) => {
                // Merge uploaded files with existing files
                const filesWithId = uploadedFiles.map(file => ({
                    ...file,
                    id: file.id || crypto.randomUUID(),
                }));

                // Merge: existing files that are not in uploadedFiles + new uploadedFiles
                const allFiles = [
                    ...files.filter(f => !filesWithId.some(u => u.id === f.id)),
                    ...filesWithId
                ];

                setFiles(allFiles);
            }}
            footerConfig={{ style: { display: "none" } }}
            headerConfig={{
                cleanFiles: false,
                deleteFiles: false,
            }}
        >
            {files.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                    <div style={labelStyle}>{label}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                        Allowed file types: {allowedExtensions.join(", ")}
                    </div>
                </div>
            )}

            {files.map((file) => (
                <FileMosaic
                    key={file.id}
                    {...file}
                    onDelete={() => removeFile(file)}
                    info
                    preview
                />
            ))}
        </Dropzone>
    );
}

*/



import { Dropzone, FileMosaic } from "@files-ui/react";
import crypto from "crypto";

const DEFAULT_ALLOWED = [
    ".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx",
];

// Utility to check image dimensions
const validateImageSize = (dropzoneFile, recommendedWidth, recommendedHeight) => {
    return new Promise((resolve, reject) => {

        const file = dropzoneFile.file || dropzoneFile; // get actual File/Blob
        if (!file.type.startsWith("image/")) return resolve(true);

        const img = new Image();
        img.onload = () => {
            if (img.width !== recommendedWidth || img.height !== recommendedHeight) {
                reject(
                    new Error(
                        `Image must be exactly ${recommendedWidth}x${recommendedHeight}px. Uploaded image is ${img.width}x${img.height}px.`
                    )
                );
            } else {
                resolve(true);
            }
        };
        img.onerror = () => reject(new Error("Failed to load image for size validation"));
        img.src = URL.createObjectURL(file);
    });
};


export default function FileUploader({
                                         files,
                                         setFiles,
                                         allowedExtensions = DEFAULT_ALLOWED,
                                         maxSizeMB = 5,
                                         maxFiles = 1,
                                         label = "Drop your files here...",
                                         labelStyle = { fontSize: 16, marginBottom: 2 },
                                         enforceRecommendedSize = false,      // NEW prop
                                         recommendedSize = null, // NEW prop
                                     }) {
    const accept = allowedExtensions.join(",");

    const removeFile = async (file) => {
        try {
            if (file?.serverResponse?.payload?.key) {
                await fetch("/api/upload-file", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key: file.serverResponse.payload.key }),
                });
            }
            setFiles(files.filter((x) => x.id !== file.id));
        } catch (err) {
            console.error("Failed to delete file from S3:", err);
        }
    };

    return (
        <Dropzone
            value={files}
            onChange={async (incomingFiles) => {
                const validatedFiles = [];
                for (const f of incomingFiles) {
                    try {
                        if (enforceRecommendedSize && recommendedSize) {
                            await validateImageSize(f, recommendedSize.width, recommendedSize.height);
                        }
                        validatedFiles.push({ ...f, id: f.id || crypto.randomUUID() });
                    } catch (err) {
                        alert(err.message);
                    }
                }
                setFiles([...files, ...validatedFiles]);
            }}

            accept={accept}
            maxFileSize={`${maxSizeMB}` * 1024 * 1024}
            maxFiles={maxFiles}
            actionButtons={{ position: "bottom", uploadButton: {}, abortButton: {} }}
            hideInstructions={true}
            uploadConfig={{
                url: "/api/upload-file",
                method: "POST",
                headers: { Authorization: "Bearer MY_SECRET_TOKEN" },
                cleanOnUpload: true,
                autoUpload: true,
            }}
            onUploadFinish={(uploadedFiles) => {
                const filesWithId = uploadedFiles.map((file) => ({
                    ...file,
                    id: file.id || crypto.randomUUID(),
                }));

                const allFiles = [
                    ...files.filter((f) => !filesWithId.some((u) => u.id === f.id)),
                    ...filesWithId,
                ];

                setFiles(allFiles);
            }}
            footerConfig={{ style: { display: "none" } }}
            headerConfig={{
                cleanFiles: false,
                deleteFiles: false,
            }}
        >
            {files.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                    <div style={labelStyle}>{label}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                        Allowed file types: {allowedExtensions.join(", ")}
                    </div>
                    {enforceRecommendedSize && recommendedSize && (
                        <div style={{ fontSize: 12, color: "#666" }}>
                            Recommended Size: {recommendedSize.width}x{recommendedSize.height}px
                        </div>
                    )}
                </div>
            )}

            {files.map((file) => (
                <FileMosaic key={file.id} {...file} onDelete={() => removeFile(file)} info preview />
            ))}
        </Dropzone>
    );
}

