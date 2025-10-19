import React from "react";
import "../styles/BakersPercentageDisplay.css";

export default function BakersPercentageDisplay({ data }) {
    if (data.status === "error") {
        return (
            <div className="error-message">
                <strong>Calculation Error</strong>
                <div>{data.error}</div>
            </div>
        );
    }

    if (data.status === "no_flour" || data.status === "no_data") {
        return (
            <div className="warning-list">
                <strong>⚠️ Warning</strong>
                <p>{data.warning}</p>
            </div>
        );
    }

    return (
        <div className="recipe-section">
            <h2>
                🧮 Baker's Percentages
                <span className="badge success">Calculated</span>
            </h2>

            {/* Metrics Cards */}
            {data.metrics && (
                <div className="metrics-grid">
                    {data.metrics.hydration !== null && (
                        <div className="metric-card">
                            <div className="metric-label">Hydration</div>
                            <div className="metric-value">{data.metrics.hydration}%</div>
                        </div>
                    )}
                    <div className="metric-card">
                        <div className="metric-label">Total Flour</div>
                        <div className="metric-value">{data.metrics.totalFlourGrams}g</div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-label">Total Dough</div>
                        <div className="metric-value">{data.metrics.totalDoughWeight}g</div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-label">Recipe Type</div>
                        <div className="metric-value" style={{ fontSize: "1rem" }}>
                            {data.metrics.recipeType.replace("_", " ")}
                        </div>
                    </div>
                </div>
            )}

            {/* Baker's Percentage Table */}
            <div className="table-container">
                <table>
                    <thead>
                    <tr>
                        <th>Ingredient</th>
                        <th>Type</th>
                        <th>Weight (g)</th>
                        <th>Baker's %</th>
                        <th>Confidence</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.ingredients.map((ing, idx) => (
                        <tr key={idx}>
                            <td><strong>{ing.name}</strong></td>
                            <td>{ing.type}</td>
                            <td>{ing.grams || "—"}</td>
                            <td>{ing.bakersPercent || "—"}</td>
                            <td>{ing.bakersConfidence}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
