'use client';

import { Dropzone, FileMosaic } from "@files-ui/react";

const DEFAULT_ALLOWED = [
    ".jpg",
    ".jpeg",
    ".png",
    ".pdf",
    ".doc",
    ".docx",
];

export default function FileUploader({
                                         files,
                                         setFiles,
                                         allowedExtensions = DEFAULT_ALLOWED,
                                         maxSizeMB = null, // optional
                                         maxFiles = 10,
                                     }) {
    const accept = allowedExtensions.join(",");

  /*  const updateFiles = async (incomingFiles) => {
        let valid = incomingFiles.filter(file =>
            allowedExtensions.some(ext =>
                file.name.toLowerCase().endsWith(ext)
            )
        );

        if (maxSizeMB) {
            const maxBytes = maxSizeMB * 1024 * 1024;
            valid = valid.filter(file => file.size <= maxBytes);
        }

        if (valid.length !== incomingFiles.length) {
            alert(
                `Only ${allowedExtensions.join(", ")} files are allowed` +
                (maxSizeMB ? ` (Max ${maxSizeMB}MB)` : "")
            );
        }

        // 👉 Upload each file (recommended)
        for (const item of valid) {
            const formData = new FormData();
            formData.append("file", item.file); // ✅ IMPORTANT

            const res = await fetch("/api/upload-file", {
                method: "POST",
                body: formData,
            });

            const result = await res.json();
            console.log("Uploaded:", result);
        }

        setFiles(valid);
    };


    const removeFile = (id) => {
        setFiles(files.filter((x) => x.id !== id));
    };*/

    const removeFile = async (file) => {

        console.log(file?.serverResponse?.payload?.key);
        // return;

        try {
            if (file?.serverResponse?.payload?.key) {
                await fetch("/api/upload-file", {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ key: file?.serverResponse?.payload?.key }),
                });
            }
            // Remove from state
            setFiles(files.filter((x) => x.id !== file.id));
        } catch (err) {
            console.error("Failed to delete file from S3:", err);
        }
    };


    return (
        <Dropzone
            value={files}
            onChange={setFiles} // optional, you can still use updateFiles for filtering
            accept={accept}
            maxFileSize={5 * 1024 * 1024} // 28MB
            maxFiles={maxFiles}
            actionButtons={{ position: "bottom", uploadButton: {}, abortButton: {} }}
            uploadConfig={{
                url: "/api/upload-file",
                method: "POST",
                headers: {
                    // You can send auth if needed
                    Authorization: "Bearer MY_SECRET_TOKEN",
                },
                cleanOnUpload: true,
                autoUpload: true
            }}
            onUploadFinish={(uploadedFiles) => {
                console.log("All uploads finished", uploadedFiles);
                // Update state with uploaded file info if you want
                setFiles(uploadedFiles);
            }}
        >
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
