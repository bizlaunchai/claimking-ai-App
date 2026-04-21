import { Dropzone, FileMosaic } from "@files-ui/react";
import { useEffect, useState } from "react";
import crypto from "crypto";
import {createClient} from "@/lib/supabase/client.js";


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

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

export default function FileUploader({
                                         files,
                                         setFiles,
                                         allowedExtensions = DEFAULT_ALLOWED,
                                         maxSizeMB = 5,
                                         maxFiles = 1,
                                         label = "Drop your files here...",
                                         labelStyle = { fontSize: 16, marginBottom: 2 },
                                         enforceRecommendedSize = false,
                                         recommendedSize = null,
                                         uploadFolderName = "",
                                     }) {
    const [token, setToken] = useState("");


    useEffect(() => {
        const setupAuth = async () => {
            const supabase = await createClient();

            const { data } = await supabase.auth.getSession();
            setToken(data?.session?.access_token || "");

            const { data: listener } = supabase.auth.onAuthStateChange(
                (_event, session) => {
                    setToken(session?.access_token || "");
                }
            );

            return listener;
        };

        let subscription;

        setupAuth().then((listener) => {
            subscription = listener?.subscription;
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const accept = allowedExtensions.join(",");

    const removeFile = async (file) => {
        try {
            if (file?.serverResponse?.payload?.key) {
                await fetch(`${BACKEND_URL}/s3/file`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ key: file.serverResponse.payload.key }),
                });
            }
            setFiles(files.filter((x) => x.id !== file.id));
        } catch (err) {
            console.error("Failed to delete file:", err);
        }
    };

    if (!token) return <div style={{ padding: 16, color: "#9ca3af", fontSize: 13 }}>Loading...</div>;

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
            maxFileSize={maxSizeMB * 1024 * 1024}
            maxFiles={maxFiles}
            actionButtons={{ position: "bottom", uploadButton: {}, abortButton: {} }}
            hideinstructions="true"
            uploadConfig={{
                url: uploadFolderName
                    ? `${BACKEND_URL}/s3/upload?uploadFolderName=${uploadFolderName}`
                    : `${BACKEND_URL}/s3/upload`,
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`, // ← Supabase JWT
                },
                cleanOnUpload: true,
                autoUpload: true,
            }}
            onUploadFinish={(uploadedFiles) => {
                console.log("Upload response:", uploadedFiles);

                const failedFiles = uploadedFiles.filter(
                    (file) => !file.serverResponse?.success
                );

                if (failedFiles.length > 0) {
                    console.error("Upload failed:", failedFiles);
                    return;
                }

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
            headerConfig={{ cleanFiles: false, deleteFiles: false }}
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