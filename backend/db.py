import mysql.connector
from config import Config


def get_db_connection():
    """Open a fresh MySQL connection. Each request grabs its own connection
    and closes it when done -- simple and safe enough for an MVP's traffic."""
    return mysql.connector.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
    )
