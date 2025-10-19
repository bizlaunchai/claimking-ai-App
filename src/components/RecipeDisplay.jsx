import React from "react";
import "../styles/RecipeDisplay.css";

export default function RecipeDisplay({ recipe }) {
    return (
        <div className="recipe-section">
            <h2>
                📋 {recipe.title}
                <span className="badge success">Parsed</span>
            </h2>

            <h3 style={{ marginBottom: "15px", color: "#666" }}>
                Ingredients ({recipe.ingredients.length})
            </h3>
            <ul className="ingredients-list">
                {recipe.ingredients.map((ing, idx) => (
                    <li key={idx} className="ingredient-item">
                        <span className="ingredient-name">{ing.name}</span>
                        <span className="ingredient-amount">
              {ing.amount && ing.unit ? `${ing.amount} ${ing.unit}` : "to taste"}
                            {ing.grams > 0 && ` (${ing.grams}g)`}
            </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
