import React from "react";
import "../styles/ErrorMessage.css";

export default function ErrorMessage({ message }) {
    return (
        <div className="error-message">
            <strong>⚠️ Error</strong>
            <div>{message}</div>
        </div>
    );
}
