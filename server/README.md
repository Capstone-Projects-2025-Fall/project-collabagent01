# README.md

# Flask Gemini MVP

This project is a minimal viable product (MVP) for integrating AI capabilities using the Gemini API within a Flask application. The application interacts with a mock database to summarize data and display it on the frontend.

## Project Structure

```
flask-gemini-mvp
├── src
│   ├── app.py                # Entry point of the Flask application
│   ├── config.py             # Configuration settings for the application
│   ├── database               # Database module
│   │   ├── __init__.py       # Initializes the database module
│   │   ├── mock_db.py        # Simulates a mock database
│   │   └── models.py         # Defines data models
│   ├── services               # Services module
│   │   ├── __init__.py       # Initializes the services module
│   │   └── ai_service.py      # AI service for interacting with the Gemini API
│   ├── routes                 # Routes module
│   │   ├── __init__.py       # Initializes the routes module
│   │   └── api.py            # API endpoints
│   └── utils                  # Utilities module
│       ├── __init__.py       # Initializes the utilities module
│       └── helpers.py        # Helper functions
├── tests                      # Tests module
│   ├── __init__.py           # Initializes the tests module
│   ├── test_api.py           # Unit tests for API endpoints
│   └── test_ai_service.py    # Unit tests for AI service methods
├── requirements.txt           # Project dependencies
├── .env                       # Environment variables
├── .gitignore                 # Git ignore file
└── README.md                  # Project documentation
```

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   cd flask-gemini-mvp
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   ```

3. Activate the virtual environment:
   - On Windows:
     ```
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```
     source venv/bin/activate
     ```

4. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Set up environment variables in the `.env` file.

6. Run the application:
   ```
   python src/app.py
   ```

## Usage

Once the application is running, you can access the API endpoints defined in `src/routes/api.py` to interact with the AI service and retrieve summarized data from the mock database.

## License

This project is licensed under the MIT License.