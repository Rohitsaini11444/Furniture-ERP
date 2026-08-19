import os
from pathlib import Path
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

try:
    conn = psycopg2.connect(
        user=os.environ.get('DB_USER', 'postgres'),
        password=os.environ.get('DB_PASSWORD'),
        host=os.environ.get('DB_HOST', 'localhost'),
        port=os.environ.get('DB_PORT', '5432')
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Check if database exists
    cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'erp_furniture_db'")
    exists = cursor.fetchone()
    
    if not exists:
        cursor.execute("CREATE DATABASE erp_furniture_db WITH OWNER = postgres ENCODING = 'UTF8'")
        print("Database 'erp_furniture_db' created successfully in PostgreSQL!")
    else:
        print("Database 'erp_furniture_db' already exists in PostgreSQL.")
        
    cursor.close()
    conn.close()
except Exception as e:
    print("PostgreSQL connection error:", e)
