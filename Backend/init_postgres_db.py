import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

try:
    conn = psycopg2.connect(
        user="postgres",
        password="Postgres@123",
        host="localhost",
        port="5432"
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
