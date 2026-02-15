"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.externalTranslationService = exports.GoogleTranslateAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
class GoogleTranslateAdapter {
    constructor(apiKey) {
        this.baseUrl = 'https://translation.googleapis.com/language/translate/v2';
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.apiKey = apiKey || process.env.GOOGLE_TRANSLATE_API_KEY || '';
        if (!this.apiKey) {
            console.warn('⚠️ Google Translate API key not configured. Translation service will use fallback.');
        }
    }
    /**
     * Translate a single text from source to target language
     */
    async translate(text, sourceLocale, targetLocale) {
        // If no API key, use simple mock translations for testing
        if (!this.apiKey) {
            return this.mockTranslate(text, sourceLocale, targetLocale);
        }
        // If same language, return original text
        if (sourceLocale === targetLocale) {
            return text;
        }
        return this.translateWithRetry(text, sourceLocale, targetLocale);
    }
    /**
     * Simple mock translation for testing without API key
     */
    mockTranslate(text, sourceLocale, targetLocale) {
        // Simple dictionary for common Romanian -> English translations
        const mockDictionary = {
            // Produse
            'Lapte de vacă': 'Cow Milk',
            'Lapte de capră': 'Goat Milk',
            'Brânză': 'Cheese',
            'Unt': 'Butter',
            'Smântână': 'Sour Cream',
            'Iaurt': 'Yogurt',
            'Ouă': 'Eggs',
            'Carne': 'Meat',
            'Pâine': 'Bread',
            'Legume': 'Vegetables',
            'Fructe': 'Fruits',
            // Locații de livrare
            'Sediul Principal': 'Main Office',
            'Localități limitrofe': 'Nearby Localities',
            'Livrare la domiciliu': 'Home Delivery',
            'Ridicare personală': 'Personal Pickup',
        };
        // If translating from Romanian to English, check dictionary
        if (sourceLocale === 'ro' && targetLocale === 'en') {
            const translated = mockDictionary[text];
            if (translated) {
                return Promise.resolve(translated);
            }
        }
        // For other cases, return original text with language indicator
        return Promise.resolve(`[${targetLocale.toUpperCase()}] ${text}`);
    }
    /**
     * Translate multiple texts in a single batch request
     */
    async translateBatch(texts, sourceLocale, targetLocale) {
        // If no API key or same language, return original texts
        if (!this.apiKey || sourceLocale === targetLocale) {
            return texts;
        }
        try {
            const response = await axios_1.default.post(this.baseUrl, {
                q: texts,
                source: sourceLocale,
                target: targetLocale,
                format: 'text',
            }, {
                params: { key: this.apiKey },
                headers: { 'Content-Type': 'application/json' },
            });
            return response.data.data.translations.map(t => t.translatedText);
        }
        catch (error) {
            console.error('Batch translation failed:', error);
            // Return original texts as fallback
            return texts;
        }
    }
    /**
     * Detect the language of a text
     */
    async detectLanguage(text) {
        if (!this.apiKey) {
            return 'ro'; // Default to Romanian
        }
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/detect`, { q: text }, {
                params: { key: this.apiKey },
                headers: { 'Content-Type': 'application/json' },
            });
            const detectedLang = response.data.data.detections[0][0].language;
            return this.isValidLocale(detectedLang) ? detectedLang : 'ro';
        }
        catch (error) {
            console.error('Language detection failed:', error);
            return 'ro';
        }
    }
    /**
     * Get list of supported languages
     */
    async getSupportedLanguages() {
        return ['ro', 'en', 'fr', 'de', 'es', 'it'];
    }
    /**
     * Translate with exponential backoff retry logic
     */
    async translateWithRetry(text, sourceLocale, targetLocale, attempt = 0) {
        try {
            const response = await axios_1.default.post(this.baseUrl, {
                q: text,
                source: sourceLocale,
                target: targetLocale,
                format: 'text',
            }, {
                params: { key: this.apiKey },
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000, // 10 second timeout
            });
            return response.data.data.translations[0].translatedText;
        }
        catch (error) {
            const isRateLimitError = error.response?.status === 429;
            const isTransientError = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
            const isPermanentError = error.response?.status === 400 || error.response?.status === 403;
            // Don't retry on permanent errors
            if (isPermanentError) {
                console.error('Permanent translation error:', error.response?.data || error.message);
                return text; // Return original text
            }
            // Retry on rate limit or transient errors
            if ((isRateLimitError || isTransientError) && attempt < this.maxRetries) {
                const delay = this.retryDelay * Math.pow(2, attempt); // Exponential backoff
                console.warn(`Translation attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
                await this.sleep(delay);
                return this.translateWithRetry(text, sourceLocale, targetLocale, attempt + 1);
            }
            // Max retries exceeded or unknown error
            console.error('Translation failed after retries:', error.message);
            return text; // Return original text as fallback
        }
    }
    /**
     * Check if a language code is a valid locale
     */
    isValidLocale(lang) {
        return ['ro', 'en', 'fr', 'de', 'es', 'it'].includes(lang);
    }
    /**
     * Sleep utility for retry delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.GoogleTranslateAdapter = GoogleTranslateAdapter;
// Export singleton instance
exports.externalTranslationService = new GoogleTranslateAdapter();
