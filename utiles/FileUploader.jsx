import { Dropzone, FileMosaic } from "@files-ui/react";
import { useEffect, useState } from "react";
import crypto from "crypto";
import {createClient} from "@/lib/supabase/client.js";


const DEFAULT_ALLOWED = [".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx"];


// Logos come in all aspect ratios — never force a square/exact size. We only
// cap the WIDTH (height stays auto), and SVG is skipped entirely since it's
// resolution-independent.
const validateMaxWidth = (dropzoneFile, maxWidth) => {
    return new Promise((resolve, reject) => {
        const file = dropzoneFile.file || dropzoneFile;
        if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return resolve(true);
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            if (maxWidth && img.width > maxWidth) {
                reject(new Error(`Logo is ${img.width}px wide — please use an image up to ${maxWidth}px wide (any height/shape is fine).`));
            } else {
                resolve(true);
            }
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image for validation")); };
        img.src = url;
    });
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

export default function FileUploader({
                                         files,
                                         setFiles,
                                         allowedExtensions = DEFAULT_ALLOWED,
                                         maxSizeMB = 5,
                                         maxFiles = 1,
                                         label = "Drag & drop files here, or click/tap to browse",
                                         labelStyle = { fontSize: 16, marginBottom: 2 },
                                         maxWidth = null,
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

    if (!token) return <div className="ck-load-inline" style={{ padding: 16 }}><span className="ck-spinner sm" />Loading…</div>;

    return (
        <Dropzone
            value={files}
            onChange={async (incomingFiles) => {
                const validatedFiles = [];
                for (const f of incomingFiles) {
                    try {
                        if (maxWidth) {
                            await validateMaxWidth(f, maxWidth);
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
                    {maxWidth && (
                        <div style={{ fontSize: 12, color: "#666" }}>
                            Any shape — up to {maxWidth}px wide (height auto)
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