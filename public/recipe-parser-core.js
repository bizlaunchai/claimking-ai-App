/**
 * Recipe Parser - Core Parsing Functions
 *
 * Three-tier parsing strategy:
 * 1. JSON-LD structured data (70% coverage)
 * 2. DOM selectors (20% coverage)
 * 3. Regex parsing (universal fallback)
 *
 * All functions are pure (no side effects) and portable to Chrome extension.
 *
 * @version 1.0
 * @license MIT
 */

// ========== CONSTANTS ==========

/**
 * Unicode fraction character mappings to decimal values
 */
const UNICODE_FRACTIONS = {
    '½': 0.5,
    '¼': 0.25,
    '¾': 0.75,
    '⅓': 0.333,
    '⅔': 0.667,
    '⅛': 0.125,
    '⅜': 0.375,
    '⅝': 0.625,
    '⅞': 0.875,
    '⅕': 0.2,
    '⅖': 0.4,
    '⅗': 0.6,
    '⅘': 0.8
};

/**
 * Common DOM selectors for ingredient extraction (in priority order)
 */
const INGREDIENT_SELECTORS = [
    '[itemprop="recipeIngredient"]',      // Microdata (highest priority)
    '[property="recipeIngredient"]',      // RDFa
    '.recipe-ingredient',                 // Common class name
    '.ingredient',                        // Generic class
    '.structured-ingredients__list-item', // Serious Eats
    '.ingredients-list__item',            // BBC Good Food
    '.tasty-recipes-ingredients li',      // Tasty Recipes WordPress plugin
    '.wprm-recipe-ingredient',            // WP Recipe Maker
    '.wprm-recipe-ingredient-name',       // WP Recipe Maker variant
    '.easyrecipe-ingredient',             // EasyRecipe
    '.ERSIngredient',                     // EasyRecipe variant
    '.ingredient-item',                   // Generic ingredient item
    '.ingredient-text',                   // Generic ingredient text
    '[data-ingredient]',                  // Data attribute
    'li[itemprop="ingredients"]',         // Microdata list items
    '.recipe-ingredients li',             // Common pattern
    '.ingredients li',                    // Fallback list items
    '.wp-block-list li',                  // WordPress Gutenberg blocks
    '.wp-block-group .wp-block-list li'   // Gutenberg groups
];

/**
 * Common DOM selectors for recipe title extraction (in priority order)
 */
const TITLE_SELECTORS = [
    '[itemprop="name"]',                  // Microdata
    '[property="name"]',                  // RDFa
    '.recipe-title',                      // Common class
    '.entry-title',                       // Blog post title
    'h1.title',                          // Semantic title
    'h1',                                // First h1
    'h2.recipe-title',                   // Alternative
    '.tasty-recipes-title',              // Tasty Recipes plugin
    '.wprm-recipe-name'                  // WP Recipe Maker
];

// ========== TIER 3: REGEX INGREDIENT PARSING ==========

/**
 * Parse a single ingredient string to extract amount, unit, and ingredient name
 *
 * Handles various formats:
 * - "2 cups flour"
 * - "2 1/2 cups flour"
 * - "500g bread flour"
 * - "1/2 teaspoon salt"
 * - "2-3 tablespoons oil"
 * - "salt to taste"
 *
 * @param {string} text - Raw ingredient string
 * @returns {Object|null} Parsed ingredient or null if invalid
 * @returns {string} .raw - Original text
 * @returns {number|null} .amount - Numeric quantity (null if unparseable)
 * @returns {string|null} .unit - Measurement unit (null if missing)
 * @returns {string} .ingredient - Ingredient name
 *
 * @example
 * parseIngredient("2 1/2 cups bread flour")
 * // Returns: { raw: "2 1/2 cups bread flour", amount: 2.5, unit: "cups", ingredient: "bread flour" }
 */
function parseIngredient(text) {
    // Input validation
    if (!text || typeof text !== 'string') {
        return null;
    }

    const raw = text;
    const trimmed = text.trim();

    if (trimmed.length === 0) {
        return null;
    }

    // Try to parse amount and unit
    const parsed = parseAmountAndUnit(trimmed);

    if (parsed) {
        return {
            raw,
            amount: parsed.amount,
            unit: parsed.unit,
            ingredient: parsed.ingredient.trim()
        };
    }

    // No parseable amount/unit - return as ingredient name only
    return {
        raw,
        amount: null,
        unit: null,
        ingredient: trimmed
    };
}

/**
 * Parse amount and unit from ingredient text
 *
 * @private
 * @param {string} text - Trimmed ingredient text
 * @returns {Object|null} Parsed amount/unit or null
 */
function parseAmountAndUnit(text) {
    // Pattern 0a: Single gram value in parentheses (HIGHEST PRIORITY)
    // Examples: "(227g)", "(340g)", "(600 grams)"
    // This pattern takes priority over volume conversions to use actual gram measurements when provided
    const gramSinglePattern = /\((\d+(?:\.\d+)?)\s*(?:g|grams?)\)/i;
    let match = text.match(gramSinglePattern);
    if (match) {
        const grams = parseFloat(match[1]);
        // Remove the parenthetical from text to get ingredient name
        const cleanedText = text.replace(gramSinglePattern, '').trim();
        return { amount: grams, unit: 'g', ingredient: cleanedText };
    }

    // Pattern 0b: Gram RANGE in parentheses (also high priority)
    // Examples: "(540g to 600g)", "(540-600g)", "(563–625g)", "(540 grams to 600 grams)"
    // Supports both formats: "(563g–625g)" and "(563–625g)" (unit optional on first number)
    // Supports both hyphen (-) and EN DASH (–)
    const gramRangePattern = /\((\d+(?:\.\d+)?)\s*(?:g|grams?)?\s*(?:to|-|–)\s*(\d+(?:\.\d+)?)\s*(?:g|grams?)\)/i;
    match = text.match(gramRangePattern);
    if (match) {
        const min = parseFloat(match[1]);
        const max = parseFloat(match[2]);
        const avgGrams = (min + max) / 2;
        // Remove the parenthetical from text to get ingredient name
        const cleanedText = text.replace(gramRangePattern, '').trim();
        return { amount: avgGrams, unit: 'g', ingredient: cleanedText };
    }

    // Pattern 1: Whole number + fraction + unit (but NOT "to" or "or" which indicate ranges)
    // Examples: "2 1/2 cups", "1 ¼ tsp", "3 and 1/4 cups"
    // Exclude: "4 1/2 to 5 cups" (handled by range pattern)
    const wholeFractionPattern = /^(\d+)\s+(?:and\s+)?([½¼¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘]|\d+\/\d+)\s+([a-zA-Z]+)/;
    match = text.match(wholeFractionPattern);
    if (match) {
        const unit = match[3];
        // Skip if unit is a range indicator
        if (unit.toLowerCase() === 'to' || unit.toLowerCase() === 'or') {
            // Let range pattern handle this
        } else {
            const whole = parseInt(match[1], 10);
            const fraction = parseFraction(match[2]);
            const ingredient = text.slice(match[0].length).trim();
            return {
                amount: whole + fraction,
                unit,
                ingredient
            };
        }
    }

    // Pattern 2: Range with unit
    // Examples: "2-3 cups", "2 to 3 tablespoons", "4 1/2 to 5 cups"
    // Handle whole + fraction ranges
    const wholeFractionRangePattern = /^(\d+)\s+([½¼¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘]|\d+\/\d+)\s+(?:to|-)\s+(\d+(?:\.\d+)?)\s+([a-zA-Z]+)/;
    match = text.match(wholeFractionRangePattern);
    if (match) {
        const whole = parseInt(match[1], 10);
        const fraction = parseFraction(match[2]);
        const min = whole + fraction;
        const max = parseFloat(match[3]);
        const unit = match[4];
        const ingredient = text.slice(match[0].length).trim();
        return {
            amount: (min + max) / 2,  // Use average of range
            unit,
            ingredient
        };
    }

    // Simple numeric range
    const rangePattern = /^(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s+([a-zA-Z]+)/;
    match = text.match(rangePattern);
    if (match) {
        const min = parseFloat(match[1]);
        const max = parseFloat(match[2]);
        const unit = match[3];
        const ingredient = text.slice(match[0].length).trim();
        return {
            amount: (min + max) / 2,  // Use average of range
            unit,
            ingredient
        };
    }

    // Pattern 3: Decimal or whole number + unit
    // Examples: "2.5 cups", "500 g", "2 tablespoons"
    const decimalPattern = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/;
    match = text.match(decimalPattern);
    if (match) {
        const amount = parseFloat(match[1]);
        const unit = match[2];
        const ingredient = text.slice(match[0].length).trim();
        return {
            amount,
            unit,
            ingredient
        };
    }

    // Pattern 4: Just fraction + unit
    // Examples: "1/2 cup", "½ tsp"
    const fractionPattern = /^([½¼¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘]|\d+\/\d+)\s+([a-zA-Z]+)/;
    match = text.match(fractionPattern);
    if (match) {
        const fraction = parseFraction(match[1]);
        const unit = match[2];
        const ingredient = text.slice(match[0].length).trim();
        return {
            amount: fraction,
            unit,
            ingredient
        };
    }

    // Pattern 5: Reverse format (ingredient - amount unit)
    // Examples: "Bread Flour - 450 grams", "Water - 300 grams", "Salt - 10 grams"
    // This pattern is LAST (lowest priority) to avoid breaking existing patterns
    // Supports both hyphen (-) and EN DASH (–)
    const reversePattern = /^(.+?)\s*[-–]\s*(\d+(?:\.\d+)?)\s+([a-zA-Z]+)$/;
    match = text.match(reversePattern);
    if (match) {
        const ingredient = match[1].trim();
        const amount = parseFloat(match[2]);
        const unit = match[3];
        return {
            amount,
            unit,
            ingredient
        };
    }

    // No parseable amount/unit
    return null;
}

/**
 * Parse fraction string to decimal
 * Handles both unicode fractions (½) and slash fractions (1/2)
 *
 * @private
 * @param {string} fractionStr - Fraction string
 * @returns {number} Decimal value
 */
function parseFraction(fractionStr) {
    // Check unicode fractions first
    if (UNICODE_FRACTIONS[fractionStr]) {
        return UNICODE_FRACTIONS[fractionStr];
    }

    // Parse slash fractions (e.g., "1/2")
    if (fractionStr.includes('/')) {
        const parts = fractionStr.split('/');
        if (parts.length === 2) {
            const numerator = parseInt(parts[0], 10);
            const denominator = parseInt(parts[1], 10);
            if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
                return numerator / denominator;
            }
        }
    }

    // Fallback
    return 0;
}

// ========== TIER 1: JSON-LD STRUCTURED DATA PARSING ==========

/**
 * Extract recipe data from JSON-LD structured data
 *
 * Looks for <script type="application/ld+json"> tags containing Recipe schema.
 * This is the preferred method as it provides structured, reliable data.
 *
 * @param {string} html - HTML string of recipe page
 * @returns {Object|null} Extracted recipe data or null if not found
 * @returns {string} .title - Recipe name
 * @returns {string[]} .ingredients - Array of ingredient strings
 *
 * @example
 * extractStructuredData(html)
 * // Returns: { title: "Sourdough Bread", ingredients: ["500g flour", "350g water"] }
 */
function extractStructuredData(html) {
    // Input validation
    if (!html || typeof html !== 'string') {
        return null;
    }

    // Find all JSON-LD script tags
    const jsonLdPattern = /<script\s+type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis;
    const matches = html.matchAll(jsonLdPattern);

    // Try each JSON-LD block
    for (const match of matches) {
        try {
            const jsonText = match[1].trim();

            // Parse JSON
            let data = JSON.parse(jsonText);

            // Handle @graph wrapper (used by King Arthur and others)
            if (data['@graph'] && Array.isArray(data['@graph'])) {
                // Find Recipe in @graph array
                data = data['@graph'].find(item =>
                    item['@type'] === 'Recipe' ||
                    (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))
                );
            }
            // Handle arrays (some sites wrap in array)
            else if (Array.isArray(data)) {
                // Find Recipe in array
                data = data.find(item =>
                    item['@type'] === 'Recipe' ||
                    (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))
                );
            }

            // Check if this is a Recipe
            if (!data || !isRecipeSchema(data)) {
                continue;
            }

            // Extract recipe name
            const title = data.name || data.headline || null;

            // Extract ingredients
            const ingredients = data.recipeIngredient || data.ingredients;

            if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
                continue;
            }

            // Success - found recipe with ingredients
            return {
                title: title || 'Untitled Recipe',
                ingredients: ingredients.filter(ing => typeof ing === 'string' && ing.trim().length > 0)
            };

        } catch (e) {
            // JSON parsing failed, try next script
            continue;
        }
    }

    // No valid Recipe JSON-LD found
    return null;
}

/**
 * Check if JSON-LD data is a Recipe schema
 *
 * @private
 * @param {Object} data - Parsed JSON-LD data
 * @returns {boolean} True if Recipe schema
 */
function isRecipeSchema(data) {
    if (!data || !data['@type']) {
        return false;
    }

    const type = data['@type'];

    // @type can be string or array
    if (typeof type === 'string') {
        return type === 'Recipe';
    }

    if (Array.isArray(type)) {
        return type.includes('Recipe');
    }

    return false;
}

// ========== TIER 2: DOM SELECTOR PARSING ==========

/**
 * Check if element is a heading
 *
 * @private
 * @param {Element} element - DOM element to check
 * @returns {boolean} True if heading element
 */
function isHeading(element) {
    return /^H[1-6]$/i.test(element.tagName);
}

/**
 * Get heading level (1-6) from element
 *
 * @private
 * @param {Element} element - Heading element
 * @returns {number|null} Heading level (1-6) or null if not a heading
 */
function getHeadingLevel(element) {
    const match = element.tagName.match(/^H([1-6])$/i);
    return match ? parseInt(match[1], 10) : null;
}

/**
 * Check if element is a heading at same or higher level
 *
 * @private
 * @param {Element} element - DOM element to check
 * @param {number} level - Heading level to compare against
 * @returns {boolean} True if heading is at same or higher level (lower number = higher level)
 */
function isHeadingSameOrHigher(element, level) {
    const elementLevel = getHeadingLevel(element);
    return elementLevel !== null && elementLevel <= level;
}

/**
 * Check if text looks like an ingredient
 *
 * @private
 * @param {string} text - Text to analyze
 * @returns {boolean} True if looks like ingredient
 */
function looksLikeIngredient(text) {
    // Filter out very long or very short text
    if (text.length > 150 || text.length < 5) {
        return false;
    }

    // Check for measurement patterns (numbers with units)
    const hasMeasurement = /\d+\s*(g|grams?|kg|cups?|c\.|tsp|teaspoons?|tbsp|tablespoons?|oz|ounces?|ml|milliliters?|l|liters?|lb|lbs|pounds?)/i.test(text);

    return hasMeasurement;
}

/**
 * Extract ingredients by finding "Ingredients" heading and parsing content below
 *
 * This is a contextual extraction method that works when standard selectors fail.
 * It looks for headings containing "ingredient" and extracts structured content below.
 *
 * @private
 * @param {Document} doc - Parsed DOM document
 * @returns {string[]|null} Array of ingredient strings or null if not found
 */
function extractContextualIngredients(doc) {
    // Find all headings
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');

    for (const heading of headings) {
        const headingText = heading.textContent || '';

        // Check if this heading is about ingredients
        if (/ingredients?/i.test(headingText)) {
            const ingredients = [];
            const headingLevel = getHeadingLevel(heading);
            let current = heading.nextElementSibling;

            // Extract content until we hit a heading of same or higher level
            while (current && !isHeadingSameOrHigher(current, headingLevel)) {
                // Extract from lists (most common)
                if (current.tagName === 'UL' || current.tagName === 'OL') {
                    const items = current.querySelectorAll('li');
                    items.forEach(li => {
                        const text = li.textContent.trim();
                        if (text.length > 0) {
                            ingredients.push(text);
                        }
                    });
                }
                // Extract from paragraphs (less common, but used by some sites)
                else if (current.tagName === 'P') {
                    const text = current.textContent.trim();
                    // Only include if it looks like an ingredient
                    if (looksLikeIngredient(text)) {
                        ingredients.push(text);
                    }
                }
                // Extract from divs that might contain ingredients
                else if (current.tagName === 'DIV') {
                    // Check if div contains a list
                    const lists = current.querySelectorAll('ul, ol');
                    if (lists.length > 0) {
                        lists.forEach(list => {
                            const items = list.querySelectorAll('li');
                            items.forEach(li => {
                                const text = li.textContent.trim();
                                if (text.length > 0) {
                                    ingredients.push(text);
                                }
                            });
                        });
                    }
                }

                current = current.nextElementSibling;
            }

            // Return if we found enough ingredients
            if (ingredients.length >= 3) {
                return ingredients;
            }
        }
    }

    return null;
}

/**
 * Extract recipe data using DOM selectors
 *
 * Tries common ingredient selectors used by recipe sites and plugins.
 * Fallback method when JSON-LD is not available.
 *
 * @param {string} html - HTML string of recipe page
 * @returns {Object|null} Extracted recipe data or null if not found
 * @returns {string} .title - Recipe name
 * @returns {string[]} .ingredients - Array of ingredient strings
 *
 * @example
 * extractFromDOM(html)
 * // Returns: { title: "Sourdough Bread", ingredients: ["500g flour", "350g water"] }
 */
function extractFromDOM(html) {
    // Input validation
    if (!html || typeof html !== 'string') {
        return null;
    }

    // Create DOM parser
    let doc;
    try {
        // Browser environment
        if (typeof DOMParser !== 'undefined') {
            const parser = new DOMParser();
            doc = parser.parseFromString(html, 'text/html');
        }
        // Node.js environment (for testing)
        else if (typeof require !== 'undefined') {
            try {
                const { JSDOM } = require('jsdom');
                const dom = new JSDOM(html);
                doc = dom.window.document;
            } catch (e) {
                // jsdom not available
                return null;
            }
        } else {
            return null;
        }
    } catch (e) {
        return null;
    }

    // Try each ingredient selector
    for (const selector of INGREDIENT_SELECTORS) {
        try {
            const elements = doc.querySelectorAll(selector);

            if (elements && elements.length > 0) {
                // Extract text from elements
                const ingredients = Array.from(elements)
                    .map(el => el.textContent.trim())
                    .filter(text => text.length > 0);

                // Need at least 3 ingredients to be considered valid
                if (ingredients.length >= 3) {
                    // Try to find title
                    const title = extractTitle(doc);

                    return {
                        title: title || 'Untitled Recipe',
                        ingredients
                    };
                }
            }
        } catch (e) {
            // Selector failed, try next one
            continue;
        }
    }

    // Standard selectors failed - try contextual extraction
    try {
        const contextualIngredients = extractContextualIngredients(doc);

        if (contextualIngredients && contextualIngredients.length >= 3) {
            const title = extractTitle(doc);

            return {
                title: title || 'Untitled Recipe',
                ingredients: contextualIngredients
            };
        }
    } catch (e) {
        // Contextual extraction failed, continue to final failure
    }

    // No valid ingredients found
    return null;
}

/**
 * Extract recipe title from DOM
 *
 * @private
 * @param {Document} doc - Parsed DOM document
 * @returns {string|null} Recipe title or null
 */
function extractTitle(doc) {
    for (const selector of TITLE_SELECTORS) {
        try {
            const element = doc.querySelector(selector);
            if (element && element.textContent) {
                const title = element.textContent.trim();
                // Reasonable title length (avoid entire paragraphs)
                if (title.length > 0 && title.length < 200) {
                    return title;
                }
            }
        } catch (e) {
            continue;
        }
    }

    return null;
}

// ========== MAIN ORCHESTRATOR ==========

/**
 * Parse recipe page using three-tier strategy
 *
 * Tries extraction methods in order of reliability:
 * 1. JSON-LD structured data (most reliable)
 * 2. DOM selectors (fallback)
 * 3. Returns failure if neither works
 *
 * @param {string} html - HTML string of recipe page
 * @returns {Object} Parse result with status
 * @returns {'json-ld'|'dom'|'failed'} .method - Successful parsing method
 * @returns {'success'|'error'} .status - Parse status
 * @returns {string|null} .title - Recipe title
 * @returns {string[]} .ingredients - Array of ingredient strings
 * @returns {string|null} .error - Error message if failed
 *
 * @example
 * parseRecipePage(html)
 * // Returns: { method: 'json-ld', status: 'success', title: "...", ingredients: [...], error: null }
 */
function parseRecipePage(html) {
    // Input validation
    if (!html || typeof html !== 'string' || html.trim().length === 0) {
        return {
            method: 'failed',
            status: 'error',
            error: 'Invalid HTML input: empty or non-string',
            title: null,
            ingredients: []
        };
    }

    // Tier 1: Try JSON-LD structured data
    const jsonLdResult = extractStructuredData(html);
    if (jsonLdResult && jsonLdResult.ingredients.length > 0) {
        return {
            method: 'json-ld',
            status: 'success',
            title: jsonLdResult.title,
            ingredients: jsonLdResult.ingredients,
            error: null
        };
    }

    // Tier 2: Try DOM selectors
    const domResult = extractFromDOM(html);
    if (domResult && domResult.ingredients.length > 0) {
        return {
            method: 'dom',
            status: 'success',
            title: domResult.title,
            ingredients: domResult.ingredients,
            error: null
        };
    }

    // Tier 3: All methods failed
    return {
        method: 'failed',
        status: 'error',
        error: 'Could not extract ingredients from recipe. No JSON-LD or matching DOM selectors found.',
        title: null,
        ingredients: []
    };
}

// ========== EXPORTS ==========

// Node.js / CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseRecipePage,
        extractStructuredData,
        extractFromDOM,
        parseIngredient,
        // Export constants for testing
        UNICODE_FRACTIONS,
        INGREDIENT_SELECTORS,
        TITLE_SELECTORS
    };
}

// Browser / Global export
if (typeof window !== 'undefined') {
    window.RecipeParser = {
        parseRecipePage,
        extractStructuredData,
        extractFromDOM,
        parseIngredient
    };
}