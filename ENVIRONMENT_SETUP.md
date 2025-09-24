# Environment Setup Guide

This project requires environment variables to be configured for proper operation.

## Quick Setup

1. **Server Environment Variables:**
   ```bash
   cd server
   cp .env.example .env
   # Then edit .env with your actual values
   ```

2. (Removed) Website Environment Variables: The website app has been deprecated in this repo. No website `.env` is required.

## Required API Keys

### Gemini AI API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add it to `server/.env` as `GEMINI_API_KEY`

### Supabase Configuration
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the Project URL and anon/service keys
5. Add them to `server/.env` only (the website app is not used)

## Security Note

**Never commit `.env` files to git!** They contain sensitive API keys and should only exist locally on your machine.