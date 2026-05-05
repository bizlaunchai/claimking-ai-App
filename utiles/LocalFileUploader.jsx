import { Dropzone, FileMosaic } from "@files-ui/react";
import crypto from "crypto";

const DEFAULT_ALLOWED = [".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx"];

const validateImageSize = (dropzoneFile, recommendedWidth, recommendedHeight) => {
    return new Promise((resolve, reject) => {
        const file = dropzoneFile.file || dropzoneFile;
        if (!file.type.startsWith("image/")) return resolve(true);
        const img = new Image();
        img.onload = () => {
            if (img.width !== recommendedWidth || img.height !== recommendedHeight) {
                reject(new Error(`Image must be exactly ${recommendedWidth}x${recommendedHeight}px. Uploaded image is ${img.width}x${img.height}px.`));
            } else {
                resolve(true);
            }
        };
        img.onerror = () => reject(new Error("Failed to load image for size validation"));
        img.src = URL.createObjectURL(file);
    });
};

export default function LocalFileUploader({
                                              files,
                                              setFiles,
                                              allowedExtensions = DEFAULT_ALLOWED,
                                              maxSizeMB = 5,
                                              maxFiles = 1,
                                              label = "Drop your files here (Local only)...",
                                              labelStyle = { fontSize: 16, marginBottom: 2 },
                                              enforceRecommendedSize = false,
                                              recommendedSize = null,
                                          }) {

    const accept = allowedExtensions.join(",");

    const removeFile = (id) => {
        setFiles(files.filter((x) => x.id !== id));
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

                        const fileData = f.file || f;

                        let previewUrl = "";
                        if (fileData.type.startsWith("image/")) {
                            previewUrl = URL.createObjectURL(fileData);
                        }

                        validatedFiles.push({
                            ...f,
                            id: f.id || crypto.randomUUID(),
                            preview: previewUrl,
                        });
                    } catch (err) {
                        alert(err.message);
                    }
                }

                setFiles([...files, ...validatedFiles]);
            }}
            accept={accept}
            maxFileSize={maxSizeMB * 1024 * 1024}
            maxFiles={maxFiles}
            headerConfig={{
                cleanFiles: false,
                deleteFiles: false
            }}
            footerConfig={{ style: { display: "none" } }}
        >
            {files.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                    <div style={labelStyle}>{label}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                        Allowed: {allowedExtensions.join(", ")}
                    </div>
                </div>
            )}

            {files.map((file) => (
                <FileMosaic
                    key={file.id}
                    {...file}
                    onDelete={() => removeFile(file.id)}
                    info
                    preview
                    smartImgFit="cover"
                />
            ))}
        </Dropzone>
    );
}