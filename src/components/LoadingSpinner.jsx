import React from "react";
import "../styles/LoadingSpinner.css";

export default function LoadingSpinner() {
    return (
        <div className="loading">
            <div className="spinner"></div>
            <p>Fetching and parsing recipe...</p>
        </div>
    );
}
