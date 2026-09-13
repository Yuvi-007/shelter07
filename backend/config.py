import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")

    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", 3306))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "shelterx")

    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", 12))
    # Accept a comma-separated list so Vite works whether it is opened through
    # localhost or 127.0.0.1 during local development.
    FRONTEND_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]
