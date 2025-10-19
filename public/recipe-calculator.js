/**
 * Recipe Calculator - Unit Conversion and Baker's Percentage System
 *
 * This module provides:
 * 1. Unit conversion (weight and volume with uncertainty tracking)
 * 2. Ingredient categorization
 * 3. Baker's percentage calculation and validation
 *
 * All functions are pure (no side effects) and portable to Chrome extension.
 *
 * @version 1.0
 * @license MIT
 */

// ========== UNIT CONVERSION CONSTANTS ==========

/**
 * Weight unit conversions (exact, high confidence)
 */
const WEIGHT_CONVERSIONS = {
    // Metric
    'g': { toGrams: 1, type: 'weight' },
    'gram': { toGrams: 1, type: 'weight' },
    'grams': { toGrams: 1, type: 'weight' },
    'kg': { toGrams: 1000, type: 'weight' },
    'kilogram': { toGrams: 1000, type: 'weight' },
    'kilograms': { toGrams: 1000, type: 'weight' },

    // Imperial
    'oz': { toGrams: 28.3495, type: 'weight' },
    'ounce': { toGrams: 28.3495, type: 'weight' },
    'ounces': { toGrams: 28.3495, type: 'weight' },
    'lb': { toGrams: 453.592, type: 'weight' },
    'lbs': { toGrams: 453.592, type: 'weight' },
    'pound': { toGrams: 453.592, type: 'weight' },
    'pounds': { toGrams: 453.592, type: 'weight' }
};

/**
 * Volume unit conversions (approximate with uncertainty)
 *
 * Note: Volume-to-weight conversions vary by ingredient density.
 * These use bread flour as reference (~120g/cup).
 * Uncertainty accounts for variation across ingredients and measurement methods.
 */
const VOLUME_CONVERSIONS = {
    // US Volume
    'cup': {
        toGrams: 120,              // Bread flour standard
        type: 'volume',
        uncertainty: 10,            // ±10% variation
        ingredientSpecific: true
    },
    'cups': {
        toGrams: 120,
        type: 'volume',
        uncertainty: 10,
        ingredientSpecific: true
    },

    'tablespoon': {
        toGrams: 7.5,              // ~1/16 cup
        type: 'volume',
        uncertainty: 15             // Higher % uncertainty for small measures
    },
    'tablespoons': { toGrams: 7.5, type: 'volume', uncertainty: 15 },
    'tbsp': { toGrams: 7.5, type: 'volume', uncertainty: 15 },
    'tbs': { toGrams: 7.5, type: 'volume', uncertainty: 15 },
    'T': { toGrams: 7.5, type: 'volume', uncertainty: 15 },

    'teaspoon': {
        toGrams: 2.5,              // ~1/3 tablespoon
        type: 'volume',
        uncertainty: 20             // Even higher for tiny measures
    },
    'teaspoons': { toGrams: 2.5, type: 'volume', uncertainty: 20 },
    'tsp': { toGrams: 2.5, type: 'volume', uncertainty: 20 },
    't': { toGrams: 2.5, type: 'volume', uncertainty: 20 },

    // Metric Volume (for liquids)
    'ml': {
        toGrams: 1,                // Water equivalent (density ≈ 1)
        type: 'volume',
        uncertainty: 5
    },
    'milliliter': { toGrams: 1, type: 'volume', uncertainty: 5 },
    'milliliters': { toGrams: 1, type: 'volume', uncertainty: 5 },
    'l': { toGrams: 1000, type: 'volume', uncertainty: 5 },
    'liter': { toGrams: 1000, type: 'volume', uncertainty: 5 },
    'liters': { toGrams: 1000, type: 'volume', uncertainty: 5 }
};

/**
 * Unit alias normalization (common variations)
 */
const UNIT_ALIASES = {
    'gm': 'g',
    'gr': 'g',
    'kgs': 'kg',
    'tablespoon': 'tbsp',
    'teaspoon': 'tsp',
    'cupful': 'cup',
    'milliliter': 'ml',
    'liter': 'l'
};

// ========== INGREDIENT CATEGORIZATION CONSTANTS ==========

/**
 * Regex patterns for ingredient type classification
 * Order matters: More specific patterns first
 */
const INGREDIENT_TYPE_PATTERNS = {
    flour: /\b(flour|bread\s*flour|all[- ]purpose|ap\s*flour|whole\s*wheat|rye|spelt|semolina|durum|pastry\s*flour|cake\s*flour|00\s*flour|tipo\s*00)\b/i,

    water: /\b(water|liquid|aqua)\b/i,

    salt: /\b(salt|sea\s*salt|kosher\s*salt|table\s*salt|fine\s*salt)\b/i,

    yeast: /\b(yeast|instant\s*yeast|active\s*dry|fresh\s*yeast|saf\s*instant|rapid\s*rise)\b/i,

    starter: /\b(starter|levain|sourdough|mother|preferment|poolish|biga|pâte\s*fermentée)\b/i,

    fat: /\b(oil|butter|lard|shortening|margarine|olive\s*oil|vegetable\s*oil|coconut\s*oil)\b/i,

    dairy: /\b(milk|cream|buttermilk|yogurt|kefir|sour\s*cream|heavy\s*cream)\b/i,

    sweetener: /\b(sugar|honey|syrup|molasses|malt|maple\s*syrup|agave|brown\s*sugar|cane\s*sugar)\b/i,

    egg: /\b(egg|eggs|yolk|white)\b/i,

    addon: /\b(seed|seeds|nut|nuts|raisin|raisins|olive|olives|cheese|herb|herbs|spice|spices|cinnamon|rosemary|walnut|walnuts|sunflower|sesame|oat|oats|dried\s+\w+)\b/i
};

// ========== BAKER'S PERCENTAGE CONSTANTS ==========

/**
 * Typical baker's percentage ranges for bread ingredients
 *
 * Based on common bread formulations:
 * - Lean breads: 60-70% hydration, 2% salt, 1-2% yeast
 * - Enriched breads: Similar but with added fat/sugar
 * - Sourdough: 70-80% hydration, 2% salt, 15-25% starter
 */
const TYPICAL_BAKERS_RANGES = {
    flour: {
        min: 10,    // Individual flour can be low if multiple flours
        max: 150,   // Allow some margin for unusual cases
        typical: [60, 100],  // Individual flour typically 60-100% when combined
        description: 'All flours should sum to 100%'
    },

    water: {
        min: 50,
        max: 100,
        typical: [65, 75],
        description: 'Hydration typically 60-80% for bread'
    },

    salt: {
        min: 1,
        max: 3,
        typical: 2,
        description: 'Salt typically 1.8-2.2% of flour weight'
    },

    yeast: {
        min: 0.1,
        max: 5,
        typical: [1, 2],
        description: 'Commercial yeast 0.5-2% for long ferments, higher for quick'
    },

    starter: {
        min: 10,
        max: 50,
        typical: [15, 25],
        description: 'Sourdough starter typically 15-25% of flour'
    },

    fat: {
        min: 0,
        max: 30,
        typical: [5, 10],
        description: 'Enriched breads: 5-15%, lean breads: 0-5%'
    },

    dairy: {
        min: 0,
        max: 30,
        typical: [10, 20],
        description: 'If used, typically replaces some water'
    },

    sweetener: {
        min: 0,
        max: 20,
        typical: [3, 8],
        description: 'Sugar for enriched breads, 0-10% typical'
    },

    egg: {
        min: 0,
        max: 30,
        typical: [10, 20],
        description: 'Enriched breads with eggs: 10-20%'
    },

    addon: {
        min: 0,
        max: 40,
        typical: [5, 15],
        description: 'Seeds, nuts, inclusions: 5-20% typical'
    },

    other: {
        min: 0,
        max: 50,
        typical: [0, 10],
        description: 'Other ingredients vary widely'
    }
};

// ========== UNIT CONVERSION FUNCTIONS ==========

/**
 * Normalize unit string to standard form
 *
 * Handles:
 * - Case variations (Cups → cups)
 * - Punctuation (tbsp. → tbsp)
 * - Plural forms (tablespoons → tablespoon)
 * - Common aliases (tablespoon → tbsp)
 *
 * @param {string} unit - Raw unit string
 * @returns {string} - Normalized unit
 *
 * @example
 * normalizeUnit('CUPS') // → 'cup'
 * normalizeUnit('tbsp.') // → 'tbsp'
 */
function normalizeUnit(unit) {
    // Input validation
    if (!unit || typeof unit !== 'string') {
        return '';
    }

    // Remove whitespace
    let normalized = unit.trim();

    // Check case-sensitive mappings BEFORE lowercasing (T. vs t.)
    if (normalized === 'T.' || normalized === 'T') {
        return 'tbsp';
    }
    if (normalized === 't.' || normalized === 't') {
        return 'tsp';
    }
    if (normalized === 'c.' || normalized === 'C' || normalized === 'c') {
        return 'cup';
    }

    // Now lowercase
    normalized = normalized.toLowerCase();

    // Now remove periods (tbsp. → tbsp)
    normalized = normalized.replace(/\./g, '');

    // Direct mappings for common variations
    const directMappings = {
        'cups': 'cup',
        'c': 'cup',
        'teaspoons': 'tsp',
        'teaspoon': 'tsp',
        't': 'tsp',
        'tablespoons': 'tbsp',
        'tablespoon': 'tbsp',
        'tbsp': 'tbsp',
        'Tbsp': 'tbsp',
        'grams': 'g',
        'gram': 'g',
        'ounces': 'oz',
        'ounce': 'oz'
    };

    if (directMappings[normalized]) {
        return directMappings[normalized];
    }

    // Check aliases
    if (UNIT_ALIASES[normalized]) {
        return UNIT_ALIASES[normalized];
    }

    // Remove plural 's' for remaining units
    if (normalized.endsWith('s') && normalized.length > 2) {
        const singular = normalized.slice(0, -1);
        if (WEIGHT_CONVERSIONS[singular] || VOLUME_CONVERSIONS[singular]) {
            return singular;
        }
    }

    return normalized;
}

/**
 * Get conversion factor for normalized unit
 *
 * @param {string} normalizedUnit - Unit after normalization
 * @returns {Object|null} Conversion factor object or null if unknown
 *
 * @example
 * getConversionFactor('g') // → { toGrams: 1, type: 'weight' }
 * getConversionFactor('cup') // → { toGrams: 120, type: 'volume', uncertainty: 10 }
 */
function getConversionFactor(normalizedUnit) {
    // Check weight conversions first (preferred - exact)
    if (WEIGHT_CONVERSIONS[normalizedUnit]) {
        return WEIGHT_CONVERSIONS[normalizedUnit];
    }

    // Check volume conversions (approximate)
    if (VOLUME_CONVERSIONS[normalizedUnit]) {
        return VOLUME_CONVERSIONS[normalizedUnit];
    }

    // Unknown unit
    return null;
}

/**
 * Convert amount and unit to grams with confidence tracking
 *
 * @param {number} amount - Numeric quantity
 * @param {string} unit - Measurement unit
 * @param {string} ingredientType - Type for density adjustments (future use)
 * @returns {Object} Conversion result with grams, confidence, and uncertainty
 * @returns {number} .grams - Converted amount in grams
 * @returns {'high'|'medium'|'low'} .confidence - Conversion confidence
 * @returns {number|null} .uncertaintyGrams - Absolute uncertainty in grams (±)
 *
 * @example
 * convertToGrams(500, 'g', 'flour')
 * // → { grams: 500, confidence: 'high', uncertaintyGrams: null }
 *
 * convertToGrams(2, 'cups', 'flour')
 * // → { grams: 240, confidence: 'medium', uncertaintyGrams: 24 }
 */
function convertToGrams(amount, unit, ingredientType = 'unknown') {
    // Validate amount exists (allow zero and negative for tests)
    if (amount === null || amount === undefined || typeof amount !== 'number') {
        return {
            grams: 0,
            confidence: 'low',
            uncertaintyGrams: null
        };
    }

    // Normalize unit
    const normalizedUnit = normalizeUnit(unit);
    const conversion = getConversionFactor(normalizedUnit);

    // Unknown unit - cannot convert
    if (!conversion) {
        return {
            grams: 0,
            confidence: 'low',
            uncertaintyGrams: null
        };
    }

    // Perform conversion (allow any numeric amount including zero/negative)
    const grams = amount * conversion.toGrams;

    // Calculate confidence and uncertainty
    const confidence = conversion.type === 'weight' ? 'high' : 'medium';
    const uncertaintyGrams = conversion.uncertainty
        ? grams * (conversion.uncertainty / 100)
        : null;

    return {
        grams: Math.round(grams * 10) / 10,  // Round to 1 decimal
        confidence,
        uncertaintyGrams: uncertaintyGrams
            ? Math.round(uncertaintyGrams * 10) / 10
            : null
    };
}

// ========== INGREDIENT CATEGORIZATION FUNCTIONS ==========

/**
 * Categorize ingredient by name
 *
 * @param {string} ingredientName - Ingredient name to classify
 * @returns {string} Category: 'flour', 'water', 'salt', etc., or 'other'
 *
 * @example
 * categorizeIngredient('bread flour') // → 'flour'
 * categorizeIngredient('filtered water') // → 'water'
 * categorizeIngredient('vanilla extract') // → 'other'
 */
function categorizeIngredient(ingredientName) {
    // Input validation
    if (!ingredientName || typeof ingredientName !== 'string') {
        return 'other';
    }

    const name = ingredientName.toLowerCase();

    // Test each pattern in order
    for (const [type, pattern] of Object.entries(INGREDIENT_TYPE_PATTERNS)) {
        if (pattern.test(name)) {
            return type;
        }
    }

    // No match - default to 'other'
    return 'other';
}

// ========== BAKER'S PERCENTAGE FUNCTIONS ==========

/**
 * Validate baker's percentage against typical ranges
 *
 * @param {string} type - Ingredient type
 * @param {number} percent - Calculated baker's percentage
 * @returns {Object} Validation result
 * @returns {'high'|'medium'|'low'} .confidence - Validation confidence
 * @returns {string[]} .warnings - Validation warnings
 * @returns {boolean} .isWithinTypical - Whether within typical range
 * @returns {boolean} .isWithinPossible - Whether within possible range
 */
function validateBakersPercent(type, percent) {
    const range = TYPICAL_BAKERS_RANGES[type];
    const warnings = [];

    // Unknown types - return medium confidence with no warnings
    if (!range) {
        return {
            confidence: 'medium',
            warnings: [],
            isWithinTypical: true,
            isWithinPossible: true
        };
    }

    // Check if within possible range
    const isWithinPossible = percent >= range.min && percent <= range.max;

    // Check if within typical range
    let isWithinTypical = false;
    if (Array.isArray(range.typical)) {
        // Range: [min, max]
        isWithinTypical = percent >= range.typical[0] && percent <= range.typical[1];
    } else {
        // Single value: allow ±20% variation
        const margin = range.typical * 0.2;
        isWithinTypical = Math.abs(percent - range.typical) <= margin;
    }

    // Generate warnings
    if (!isWithinPossible) {
        if (percent < range.min) {
            warnings.push(`Very low for ${type} (${percent.toFixed(1)}% < typical ${range.min}%)`);
        } else {
            warnings.push(`Very high for ${type} (${percent.toFixed(1)}% > typical ${range.max}%)`);
        }
    } else if (!isWithinTypical) {
        warnings.push(`Outside typical range for ${type} (${range.description})`);
    }

    // Determine confidence
    let confidence;
    if (isWithinTypical) {
        confidence = 'high';
    } else if (isWithinPossible) {
        confidence = 'medium';
    } else {
        // Check if close to possible range (within 20% of range size, or at least 1 unit)
        const rangeSize = range.max - range.min;
        const margin = Math.max(rangeSize * 0.2, 1);
        const isCloseToRange = percent >= (range.min - margin) && percent <= (range.max + margin);

        confidence = isCloseToRange ? 'medium' : 'low';
    }

    return {
        confidence,
        warnings,
        isWithinTypical,
        isWithinPossible
    };
}

/**
 * Calculate derived metrics from baker's percentages
 *
 * @param {Object[]} ingredients - Ingredients with baker's percentages
 * @param {number} totalFlourGrams - Total flour weight
 * @returns {Object} Baker's metrics
 * @returns {number} .totalFlourGrams - Sum of all flour weights
 * @returns {number} .totalDoughWeight - Total weight of all ingredients
 * @returns {number|null} .hydration - Water percentage (null if no water)
 * @returns {string} .recipeType - Hydration classification
 * @returns {string} .enrichmentLevel - Enrichment classification
 * @returns {string} .leaveningType - Leavening classification
 * @returns {boolean} .isLikelyBreadRecipe - Heuristic classification
 * @returns {string[]} .warnings - Recipe-level warnings
 * @returns {string[]} .flourTypes - List of flour types found
 * @returns {string[]} .waterTypes - List of liquid types found
 */
function calculateBakersMetrics(ingredients, totalFlourGrams) {
    const warnings = [];

    // Find flour types
    const flourTypes = ingredients
        .filter(i => i.type === 'flour' && i.grams > 0)
        .map(i => i.ingredient);

    // Calculate total dough weight
    const totalDoughWeight = ingredients
        .filter(i => i.grams > 0)
        .reduce((sum, i) => sum + i.grams, 0);

    // Calculate total flour percentage (should be ~100%)
    const totalFlourPercent = flourTypes.length > 0 ? 100 : 0;
    if (Math.abs(totalFlourPercent - 100) > 5) {
        warnings.push(`Total flour percentage is ${totalFlourPercent}% (expected 100%)`);
    }

    // Calculate hydration (water + dairy as % of flour)
    const waterIngredients = ingredients.filter(i =>
        (i.type === 'water' || i.type === 'dairy') && i.grams > 0
    );
    const waterTypes = waterIngredients.map(i => i.ingredient);
    const totalWaterGrams = waterIngredients.reduce((sum, i) => sum + i.grams, 0);
    const hydration = totalFlourGrams > 0
        ? Math.round((totalWaterGrams / totalFlourGrams) * 100 * 10) / 10
        : null;

    // Classify recipe type by hydration
    let recipeType = 'unknown';
    if (hydration !== null) {
        if (hydration < 60) {
            recipeType = 'low_hydration'; // Bagels, pretzels
        } else if (hydration >= 60 && hydration < 75) {
            recipeType = 'medium_hydration'; // Sandwich bread
        } else if (hydration >= 75 && hydration < 90) {
            recipeType = 'high_hydration'; // Ciabatta, focaccia
        } else {
            recipeType = 'very_high_hydration'; // Pizza dough, flatbreads
        }
    }

    // Validate hydration
    if (hydration !== null) {
        if (hydration < 50) {
            warnings.push(`Very low hydration (${hydration}%) - may not be bread`);
        } else if (hydration > 100) {
            warnings.push(`Very high hydration (${hydration}%) - unusual for bread`);
        }
    }

    // Calculate enrichment level
    const fatIngredients = ingredients.filter(i =>
        (i.type === 'fat' || i.type === 'dairy') && i.grams > 0
    );
    const sweetenerIngredients = ingredients.filter(i =>
        i.type === 'sweetener' && i.grams > 0
    );
    const eggIngredients = ingredients.filter(i =>
        i.type === 'egg' && i.grams > 0
    );

    const totalEnrichmentGrams =
        fatIngredients.reduce((sum, i) => sum + i.grams, 0) +
        sweetenerIngredients.reduce((sum, i) => sum + i.grams, 0) +
        eggIngredients.reduce((sum, i) => sum + i.grams, 0);

    const enrichmentPercent = totalFlourGrams > 0
        ? (totalEnrichmentGrams / totalFlourGrams) * 100
        : 0;

    let enrichmentLevel = 'lean';
    if (enrichmentPercent > 30) {
        enrichmentLevel = 'very_enriched'; // Brioche, challah
    } else if (enrichmentPercent > 5) {
        enrichmentLevel = 'enriched'; // Soft sandwich bread (>5% enrichment)
    }

    // Classify leavening type
    const hasYeast = ingredients.some(i => i.type === 'yeast' && i.grams > 0);
    const hasStarter = ingredients.some(i => i.type === 'starter' && i.grams > 0);

    let leaveningType = 'none';
    if (hasYeast && hasStarter) {
        leaveningType = 'mixed';
    } else if (hasStarter) {
        leaveningType = 'sourdough';
    } else if (hasYeast) {
        leaveningType = 'yeast';
    }

    // Classify as likely bread recipe
    const hasSalt = ingredients.some(i => i.type === 'salt' && i.grams > 0);
    const hasLeavening = hasYeast || hasStarter;
    const hasReasonableHydration = hydration !== null && hydration >= 50 && hydration <= 100;

    const isLikelyBreadRecipe =
        flourTypes.length > 0 &&
        hasSalt &&
        hasLeavening &&
        hasReasonableHydration;

    if (!isLikelyBreadRecipe) {
        if (!hasSalt) warnings.push('No salt detected');
        if (!hasLeavening) warnings.push('No yeast or starter detected');
        if (!hasReasonableHydration) warnings.push('Hydration outside bread range');
    }

    return {
        totalFlourGrams,
        totalDoughWeight,
        hydration,
        recipeType,
        enrichmentLevel,
        leaveningType,
        isLikelyBreadRecipe,
        warnings,
        flourTypes,
        waterTypes
    };
}

/**
 * Calculate baker's percentages for all ingredients
 *
 * Process:
 * 1. Validate inputs
 * 2. Filter ingredients with gram measurements
 * 3. Find and sum flour ingredients
 * 4. Calculate percentage for each ingredient
 * 5. Validate percentages against typical ranges
 * 6. Calculate derived metrics (hydration, etc.)
 *
 * @param {Object[]} ingredients - Ingredients with grams
 * @returns {Object} Baker's percentage result
 * @returns {'success'|'no_flour'|'no_data'|'empty'|'error'} .status - Calculation status
 * @returns {Object[]} .ingredients - Ingredients with baker's percentages
 * @returns {Object|null} .metrics - Baker's metrics or null
 * @returns {string} [.error] - Error message if failed
 * @returns {string} [.warning] - Warning message if partial success
 *
 * @example
 * const ingredients = [
 *   { ingredient: 'bread flour', grams: 500, type: 'flour', confidence: 'high' },
 *   { ingredient: 'water', grams: 350, type: 'water', confidence: 'high' }
 * ];
 * calculateBakersPercentage(ingredients);
 * // → { status: 'success', ingredients: [...], metrics: { hydration: 70, ... } }
 */
function calculateBakersPercentage(ingredients) {
    // ========== INPUT VALIDATION ==========
    if (!Array.isArray(ingredients)) {
        return {
            status: 'error',
            error: 'Invalid input: ingredients must be an array',
            ingredients: [],
            metrics: null
        };
    }

    if (ingredients.length === 0) {
        return {
            status: 'no_data',
            warning: 'No ingredients to calculate',
            ingredients: [],
            metrics: null
        };
    }

    // ========== DATA VALIDATION ==========
    const withGrams = ingredients.filter(i => i.grams && i.grams > 0);

    if (withGrams.length === 0) {
        // Check if there are flour ingredients without grams - if so, return no_flour
        const flourIngredients = ingredients.filter(i => i.type === 'flour');

        if (flourIngredients.length > 0) {
            // Has flour but no measurements - return no_flour
            return {
                status: 'no_flour',
                warning: 'No flour detected with gram measurements',
                ingredients: ingredients.map(i => ({
                    ...i,
                    bakersPercent: null,
                    bakersConfidence: 'none',
                    bakersWarnings: ['Missing gram measurement']
                })),
                metrics: {
                    totalFlourGrams: 0,
                    totalDoughWeight: 0,
                    hydration: null,
                    recipeType: 'unknown',
                    enrichmentLevel: 'lean',
                    leaveningType: 'none',
                    isLikelyBreadRecipe: false,
                    warnings: ['No flour detected with measurements'],
                    flourTypes: [],
                    waterTypes: []
                }
            };
        }

        // No ingredients at all with measurements
        return {
            status: 'no_data',
            warning: 'No ingredients with gram measurements',
            ingredients: ingredients.map(i => ({
                ...i,
                bakersPercent: null,
                bakersConfidence: 'none',
                bakersWarnings: ['Missing gram measurement']
            })),
            metrics: null
        };
    }

    // ========== FLOUR DETECTION ==========
    const flourIngredients = withGrams.filter(i => i.type === 'flour');

    if (flourIngredients.length === 0) {
        return {
            status: 'no_flour',
            warning: 'No flour detected - may not be a bread recipe',
            ingredients: ingredients.map(i => ({
                ...i,
                bakersPercent: null,
                bakersConfidence: 'none',
                bakersWarnings: ['No flour in recipe']
            })),
            metrics: {
                totalFlourGrams: 0,
                hydration: null,
                isLikelyBreadRecipe: false,
                warnings: ['No flour detected'],
                flourTypes: [],
                waterTypes: []
            }
        };
    }

    // ========== CALCULATION ==========
    try {
        const totalFlourGrams = flourIngredients.reduce((sum, i) => sum + i.grams, 0);

        // Calculate percentage for each ingredient
        const calculated = ingredients.map(ingredient => {
            // No gram measurement
            if (!ingredient.grams || ingredient.grams <= 0) {
                return {
                    ...ingredient,
                    bakersPercent: null,
                    bakersConfidence: 'none',
                    bakersWarnings: ['Missing or invalid gram measurement']
                };
            }

            // Calculate percentage
            const percent = (ingredient.grams / totalFlourGrams) * 100;

            // Validate percentage
            const validation = validateBakersPercent(ingredient.type, percent);

            // Adjust confidence based on conversion confidence
            let finalConfidence = validation.confidence;
            if (ingredient.confidence === 'medium' && validation.confidence === 'high') {
                finalConfidence = 'medium';  // Volume conversion reduces confidence
            }
            if (ingredient.confidence === 'low') {
                finalConfidence = 'low';  // Bad conversion overrides validation
            }

            return {
                ...ingredient,
                bakersPercent: Math.round(percent * 10) / 10,  // 1 decimal place
                bakersConfidence: finalConfidence,
                bakersWarnings: validation.warnings
            };
        });

        // Calculate metrics
        const metrics = calculateBakersMetrics(calculated, totalFlourGrams);

        return {
            status: 'success',
            ingredients: calculated,
            metrics
        };

    } catch (error) {
        return {
            status: 'error',
            error: `Calculation failed: ${error.message}`,
            ingredients: ingredients.map(i => ({
                ...i,
                bakersPercent: null,
                bakersConfidence: 'none',
                bakersWarnings: ['Calculation error']
            })),
            metrics: null
        };
    }
}

// ========== EXPORTS ==========

// Node.js / CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Unit conversion
        normalizeUnit,
        getConversionFactor,
        convertToGrams,

        // Ingredient categorization
        categorizeIngredient,

        // Baker's percentage calculation
        calculateBakersPercentage,
        validateBakersPercent,
        calculateBakersMetrics,

        // Export constants for testing
        WEIGHT_CONVERSIONS,
        VOLUME_CONVERSIONS,
        UNIT_ALIASES,
        INGREDIENT_TYPE_PATTERNS,
        TYPICAL_BAKERS_RANGES
    };
}

// Browser / Global export
if (typeof window !== 'undefined') {
    window.RecipeCalculator = {
        normalizeUnit,
        getConversionFactor,
        convertToGrams,
        categorizeIngredient,
        calculateBakersPercentage,
        validateBakersPercent,
        calculateBakersMetrics
    };
}