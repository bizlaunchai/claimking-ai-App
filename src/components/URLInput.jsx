import React from "react";
import "../styles/URLInput.css";

export default function URLInput({ url, onUrlChange, onSubmit, loading }) {
    return (
        <div className="url-input-section">
            <form onSubmit={onSubmit}>
                <div className="input-group">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => onUrlChange(e.target.value)}
                        placeholder="Enter recipe URL (e.g., https://www.kingarthurbaking.com/recipes/...)"
                        disabled={loading}
                        required
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? "Parsing..." : "Parse Recipe"}
                    </button>
                </div>
            </form>
            <p className="help-text">
                ✨ Paste a recipe URL from popular sites like King Arthur Baking,
                Serious Eats, AllRecipes, etc.
            </p>
        </div>
    );
}
