// Configuration file for API keys
// In production, these should be set via environment variables or secure configuration
const CONFIG = {
    OPENAI_API_KEY: 'sk-proj-paste-your-actual-openai-key-here',
    GOOGLE_CLIENT_ID: 'paste-your-actual-google-client-id-here.apps.googleusercontent.com'
};

// For development, you can override these values here
// In production, use proper environment variable injection
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}