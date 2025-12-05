# CollabAgent Backend

Flask-based backend server for the CollabAgent VS Code extension. Provides AI-powered code analysis, team collaboration features, and Jira integration using Google's Gemini API.

## Tech Stack

- **Flask 3.1.2** - Web framework
- **Google Gemini API** - AI-powered code summaries and task suggestions
- **Supabase** - PostgreSQL database and authentication
- **Gunicorn** - Production WSGI server

## Prerequisites

- Python 3.11+ (3.12 recommended)
- pip (Python package manager)
- Supabase account ([sign up here](https://supabase.com))
- Google Gemini API key ([get one here](https://makersuite.google.com/app/apikey))

## Quick Start

### 1. Set Up Environment Variables

Copy the example environment file and fill in your credentials:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**
```bash
cp .env.example .env
```

Edit `.env` and add your actual keys:

```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key

# Optional (defaults provided)
PORT=5000
SIMPLE_MODEL=gemini-2.5-flash
ADVANCE_MODEL=gemini-2.5-pro
```

**Where to find these:**
- **Supabase URL & Key**: [Project Settings > API](https://app.supabase.com/project/_/settings/api)
  - Use the `service_role` key (not `anon` key)
- **Gemini API Key**: [Google AI Studio](https://makersuite.google.com/app/apikey)

### 2. Set Up Virtual Environment

This project uses a virtual environment located in the **project root** (not in the server folder).

**Windows (PowerShell):**
```powershell
# Navigate to project root (if not already there)
cd ..

# Create virtual environment (if it doesn't exist)
python -m venv .venv

# Activate the virtual environment
.venv\Scripts\Activate.ps1
```

**macOS/Linux:**
```bash
# Navigate to project root (if not already there)
cd ..

# Create virtual environment (if it doesn't exist)
python -m venv .venv

# Activate the virtual environment
source .venv/bin/activate
```

You should see `(.venv)` at the beginning of your command prompt, indicating the virtual environment is active.

### 3. Install Dependencies

With the virtual environment activated, install the server dependencies:

**Windows (PowerShell):**
```powershell
cd server
pip install -r requirements.txt
```

**macOS/Linux:**
```bash
cd server
pip install -r requirements.txt
```

### 4. Run the Server

From the `server` directory (with `.venv` still activated):

```powershell
python -m src.app
```

The server will start on `http://localhost:5000` (or the PORT specified in your `.env` file)

### 5. Verify Setup

Open a browser or use curl to check if the server is running:

**Browser:** Navigate to `http://localhost:5000/health`

**PowerShell:**
```powershell
Invoke-WebRequest -Uri http://localhost:5000/health
```

**macOS/Linux:**
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{"status": "healthy", "service": "collab-agent-backend"}
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### AI Features
- `POST /api/ai/process_snapshot` - Process code snapshot and generate AI summary
- `POST /api/ai/feed` - Get team activity feed
- `POST /api/ai/task_recommendations` - AI-powered task suggestions
- `POST /api/ai/live_share_summary` - Generate Live Share session summary

### User Management
- `GET /users/<user_id>` - Get user by ID

### Jira Integration
- `POST /api/jira/config` - Save Jira configuration
- `GET /api/jira/config/<team_id>` - Get Jira config for team
- `DELETE /api/jira/config/<team_id>` - Delete Jira config

### Profile & Notes
- `GET /api/profile/` - Get user profile
- `PUT /api/profile/` - Update user profile
- `POST /api/notes/` - Create note/snapshot
- `GET /api/notes/` - Get user notes

### Account
- `DELETE /api/account/delete` - Delete user account

## Deployment (Production)

This backend is configured for deployment on [Render.com](https://render.com).

**Deploy to Render:**

1. Fork/clone this repository to your GitHub account
2. Sign up for [Render.com](https://render.com) (free tier available)
3. Create a new **Web Service** on Render
4. Connect your GitHub repository
5. Render will auto-detect the `render.yaml` configuration from the project root
6. Add environment variables in the Render dashboard:
   - `GEMINI_API_KEY` - Your Google Gemini API key
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
7. Deploy!

**Production build command (automated by Render):**
```bash
cd server && pip install -r requirements.txt
```

**Production start command (automated by Render):**
```bash
cd server && gunicorn -w 4 -b 0.0.0.0:$PORT src.app:app --timeout 120
```

The service will automatically redeploy on every push to your main branch.

## Development

### Running Tests

From the server directory:

**Windows (PowerShell):**
```powershell
python -m unittest discover tests -v
```

**macOS/Linux:**
```bash
python -m unittest discover tests -v
```

To run a specific test file:
```powershell
python -m unittest tests.test_api -v
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT License - see LICENSE file for details
