import React, { useState } from "react";
import "./App.css";

import URLInput from "./components/URLInput";
import ErrorMessage from "./components/ErrorMessage";
import LoadingSpinner from "./components/LoadingSpinner";
import RecipeDisplay from "./components/RecipeDisplay";
import BakersPercentageDisplay from "./components/BakersPercentageDisplay";

// Trusted domains
const BOT_PROTECTED_DOMAINS = [
    "seriouseats.com",
    "food52.com",
    "bbcgoodfood.com",
    "thekitchn.com",
];

const TRUSTED_RECIPE_DOMAINS = [
    "kingarthurbaking.com",
    "seriouseats.com",
    "food52.com",
    "bbcgoodfood.com",
    "thekitchn.com",
    "allrecipes.com",
    "bonappetit.com",
    "epicurious.com",
    "simplyrecipes.com",
    "tasty.co",
    "foodnetwork.com",
    "cookinglight.com",
    "delish.com",
    "thepioneerwoman.com",
    "sallysbakingaddiction.com",
    "natashasbaking.com",
    "emmafontanella.com",
    "heartbeetkitchen.com",
    "pantrymama.com",
    "grantbakes.com",
    "cooking.nytimes.com",
];

const CORS_PROXIES = [
    "https://api.allorigins.win/get?url=",
    "https://corsproxy.io/?",
];

// URL Validation
export function validateRecipeUrl(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.protocol !== "https:") {
            throw new Error("Only HTTPS URLs are allowed");
        }
        const isTrusted = TRUSTED_RECIPE_DOMAINS.some(
            (domain) =>
                urlObj.hostname === domain || urlObj.hostname.endsWith("." + domain)
        );
        if (!isTrusted) {
            throw new Error(
                `URL must be from a trusted recipe site. Domain "${urlObj.hostname}" is not in the allowed list.`
            );
        }
        return true;
    } catch (e) {
        throw new Error(`Invalid recipe URL: ${e.message}`);
    }
}

function App() {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [recipe, setRecipe] = useState(null);
    const [bakersData, setBakersData] = useState(null);

    const fetchRecipe = async (e) => {
        e.preventDefault();

        if (!url.trim()) {
            setError("Please enter a recipe URL");
            return;
        }

        try {
            validateRecipeUrl(url.trim());
        } catch (err) {
            setError(err.message);
            return;
        }

        setLoading(true);
        setError(null);
        setRecipe(null);
        setBakersData(null);

        try {
            let html = null;
            let lastError = null;
            let isBotProtected = BOT_PROTECTED_DOMAINS.some((domain) =>
                url.includes(domain)
            );

            // Server-side proxy for bot-protected sites
            if (isBotProtected) {
                try {
                    const proxyUrl =
                        window.location.protocol === "file:"
                            ? `http://localhost:3000/api/fetch-recipe?url=${encodeURIComponent(
                                url
                            )}`
                            : `/api/fetch-recipe?url=${encodeURIComponent(url)}`;
                    const response = await fetch(proxyUrl);
                    html = await response.text();
                } catch (err) {
                    lastError = err;
                }
            }

            // CORS proxies
            if (!html) {
                for (const proxy of CORS_PROXIES) {
                    try {
                        const proxyUrl = proxy + encodeURIComponent(url);
                        const response = await fetch(proxyUrl);
                        const contentType = response.headers.get("content-type") || "";
                        if (contentType.includes("application/json")) {
                            const data = await response.json();
                            html = data.contents || data.content || data;
                        } else {
                            html = await response.text();
                        }
                        if (html && html.length > 100) break;
                    } catch (err) {
                        lastError = err;
                    }
                }
            }

            if (!html) throw new Error(`Failed to fetch recipe: ${lastError?.message}`);

            const parseResult = window.RecipeParser.parseRecipePage(html);

            if (parseResult.status === "error")
                throw new Error(parseResult.error || "Failed to parse recipe");

            const ingredientsWithGrams = parseResult.ingredients.map((ingText) => {
                const parsed = window.RecipeParser.parseIngredient(ingText);

                if (!parsed) {
                    return {
                        raw: ingText,
                        name: ingText,
                        amount: null,
                        unit: null,
                        grams: null,
                        confidence: "none",
                        type: "other",
                    };
                }

                const conversion = window.RecipeCalculator.convertToGrams(
                    parsed.amount,
                    parsed.unit,
                    parsed.ingredient
                );

                const type = window.RecipeCalculator.categorizeIngredient(
                    parsed.ingredient
                );

                return {
                    raw: parsed.raw,
                    name: parsed.ingredient,
                    amount: parsed.amount,
                    unit: parsed.unit,
                    grams: conversion.grams,
                    confidence: conversion.confidence,
                    uncertaintyGrams: conversion.uncertaintyGrams,
                    type,
                };
            });

            const bakersResult = window.RecipeCalculator.calculateBakersPercentage(
                ingredientsWithGrams
            );

            setRecipe({
                title: parseResult.title,
                method: parseResult.method,
                ingredients: ingredientsWithGrams,
            });
            setBakersData(bakersResult);
        } catch (err) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const scanCurrentPage = async () => {

        try {
            // 1️⃣ Get the active tab in the current window
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab || !tab.url) {
                setError("Could not get the active tab URL");
                return;
            }

            const fullUrl = tab.url;

            // 2️⃣ Validate the URL
            try {
                validateRecipeUrl(fullUrl.trim());
            } catch (err) {
                setError(err.message);
                return;
            }

            // 3️⃣ Reset state and start loading
            setLoading(true);
            setError(null);
            setRecipe(null);
            setBakersData(null);

            let html = null;
            let lastError = null;
            const isBotProtected = BOT_PROTECTED_DOMAINS.some(domain =>
                fullUrl.includes(domain)
            );

            // 4️⃣ Server-side proxy for bot-protected sites
            if (isBotProtected) {
                try {
                    const proxyUrl =
                        window.location.protocol === "file:"
                            ? `http://localhost:3000/api/fetch-recipe?url=${encodeURIComponent(fullUrl)}`
                            : `/api/fetch-recipe?url=${encodeURIComponent(fullUrl)}`;

                    const response = await fetch(proxyUrl);
                    html = await response.text();
                } catch (err) {
                    lastError = err;
                }
            }

            // 5️⃣ Try CORS proxies if HTML not fetched
            if (!html) {
                for (const proxy of CORS_PROXIES) {
                    try {
                        const proxyUrl = proxy + encodeURIComponent(fullUrl);
                        const response = await fetch(proxyUrl);
                        const contentType = response.headers.get("content-type") || "";

                        if (contentType.includes("application/json")) {
                            const data = await response.json();
                            html = data.contents || data.content || data;
                        } else {
                            html = await response.text();
                        }

                        if (html && html.length > 100) break;
                    } catch (err) {
                        lastError = err;
                    }
                }
            }

            if (!html) throw new Error(`Failed to fetch recipe: ${lastError?.message}`);

            // 6️⃣ Parse recipe
            const parseResult = window.RecipeParser.parseRecipePage(html);

            if (parseResult.status === "error")
                throw new Error(parseResult.error || "Failed to parse recipe");

            // 7️⃣ Convert ingredients to grams & categorize
            const ingredientsWithGrams = parseResult.ingredients.map(ingText => {
                const parsed = window.RecipeParser.parseIngredient(ingText);

                if (!parsed) {
                    return {
                        raw: ingText,
                        name: ingText,
                        amount: null,
                        unit: null,
                        grams: null,
                        confidence: "none",
                        type: "other",
                    };
                }

                const conversion = window.RecipeCalculator.convertToGrams(
                    parsed.amount,
                    parsed.unit,
                    parsed.ingredient
                );

                const type = window.RecipeCalculator.categorizeIngredient(parsed.ingredient);

                return {
                    raw: parsed.raw,
                    name: parsed.ingredient,
                    amount: parsed.amount,
                    unit: parsed.unit,
                    grams: conversion.grams,
                    confidence: conversion.confidence,
                    uncertaintyGrams: conversion.uncertaintyGrams,
                    type,
                };
            });

            // 8️⃣ Calculate Baker's percentages
            const bakersResult = window.RecipeCalculator.calculateBakersPercentage(
                ingredientsWithGrams
            );

            // 9️⃣ Update state
            setRecipe({
                title: parseResult.title,
                method: parseResult.method,
                ingredients: ingredientsWithGrams,
            });
            setBakersData(bakersResult);

        } catch (err) {
            setError(err.message || "An unexpected error occurred");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="container">
            <div className="header">
                <h1>🍞 Recipe Parser & Baker's Calculator</h1>
                <p>Parse any recipe and calculate baker's percentages instantly</p>
            </div>

            <div className="content">
                <div style={{display: "flex", justifyContent: "center", margin: "1rem 0"}}>
                    <button onClick={scanCurrentPage} className='scan-btn' style={{textAlign: 'center'}}>Scan Current Page</button>
                </div>
                <p style={{textAlign: 'center', marginBottom: '10px', fontSize: '20px'}}>Or</p>
                <URLInput
                    url={url}
                    onUrlChange={setUrl}
                    onSubmit={fetchRecipe}
                    loading={loading}
                />
                {error && <ErrorMessage message={error} />}
                {loading && <LoadingSpinner />}
                {recipe && <RecipeDisplay recipe={recipe} />}
                {bakersData && <BakersPercentageDisplay data={bakersData} />}
            </div>

            <div className="footer">
                <p>
                    Recipe Parser v1.0 | Built with React | Parsing powered by regex + DOM
                    selectors
                </p>
            </div>
        </div>
    );
}

export default App;
