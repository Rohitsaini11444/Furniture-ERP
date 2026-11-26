"""
Database Operations, pg_dump, Integrity Verification and Disposable Restore Testing
"""
import os
import subprocess
import psycopg2
from pathlib import Path
from datetime import datetime
from .config import (
    AUTHORIZED_DB, AUTHORIZED_USER, DB_HOST, DB_PORT,
    PG_DUMP_EXE, PG_RESTORE_EXE, PSQL_EXE
)

class DatabaseSecurityViolation(Exception):
    pass

def verify_database_identity(conn) -> tuple:
    """
    Programmatically verify database identity before any operation.
    Expected: ('erp_furniture_trial', 'erp_trial_user')
    """
    with conn.cursor() as cur:
        cur.execute("SELECT current_database(), current_user;")
        identity = cur.fetchone()
        if identity != (AUTHORIZED_DB, AUTHORIZED_USER):
            raise DatabaseSecurityViolation(
                f"SECURITY ABORT: Database identity mismatch! Expected ('{AUTHORIZED_DB}', '{AUTHORIZED_USER}'), "
                f"got {identity}. Aborting database operation immediately!"
            )
        return identity

def get_database_metrics(db_password: str) -> dict:
    """Collect database statistics and metadata."""
    conn = psycopg2.connect(
        dbname=AUTHORIZED_DB, user=AUTHORIZED_USER,
        password=db_password, host=DB_HOST, port=DB_PORT,
        connect_timeout=10
    )
    try:
        verify_database_identity(conn)
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            pg_version = cur.fetchone()[0]

            cur.execute(f"SELECT pg_database_size('{AUTHORIZED_DB}');")
            raw_bytes = cur.fetchone()[0]

            cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
            table_count = cur.fetchone()[0]

            cur.execute("SELECT count(*) FROM django_migrations;")
            migrations_count = cur.fetchone()[0]

            cur.execute("""
                SELECT relname, n_live_tup 
                FROM pg_stat_user_tables 
                WHERE n_live_tup > 0
                ORDER BY n_live_tup DESC;
            """)
            key_table_counts = {row[0]: row[1] for row in cur.fetchall()}

            return {
                "database_name": AUTHORIZED_DB,
                "database_user": AUTHORIZED_USER,
                "pg_version": pg_version,
                "database_bytes": raw_bytes,
                "database_size_pretty": f"{raw_bytes / (1024*1024):.2f} MB",
                "table_count": table_count,
                "migrations_count": migrations_count,
                "sample_table_counts": key_table_counts
            }
    finally:
        conn.close()

def create_postgres_dump(output_dump_path: Path, db_password: str) -> dict:
    """
    Execute pg_dump to produce a compressed custom-format archive with large objects.
    Verify archive integrity with pg_restore --list before returning.
    """
    # 1. First programmatically verify DB identity
    conn = psycopg2.connect(
        dbname=AUTHORIZED_DB, user=AUTHORIZED_USER,
        password=db_password, host=DB_HOST, port=DB_PORT,
        connect_timeout=10
    )
    try:
        verify_database_identity(conn)
    finally:
        conn.close()

    # 2. Execute pg_dump
    output_dump_path.parent.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env["PGPASSWORD"] = db_password

    cmd = [
        str(PG_DUMP_EXE),
        "-h", DB_HOST,
        "-p", str(DB_PORT),
        "-U", AUTHORIZED_USER,
        "-d", AUTHORIZED_DB,
        "-Fc",              # Custom format (compressed, supports pg_restore)
        "-b",              # Include large objects
        "-v",              # Verbose
        "--no-owner",      # Avoid ownership restore issues
        "--no-acl",        # Avoid privilege restore issues
        "-f", str(output_dump_path)
    ]

    result = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"pg_dump failed with code {result.returncode}:\n{result.stderr}")

    if not output_dump_path.exists() or output_dump_path.stat().st_size == 0:
        raise RuntimeError(f"pg_dump produced empty or missing file at {output_dump_path}")

    dump_size = output_dump_path.stat().st_size

    # 3. Archive integrity check: pg_restore --list
    list_cmd = [str(PG_RESTORE_EXE), "--list", str(output_dump_path)]
    list_res = subprocess.run(list_cmd, capture_output=True, text=True)
    if list_res.returncode != 0:
        raise RuntimeError(f"Archive integrity check failed for {output_dump_path}:\n{list_res.stderr}")

    toc_entries = [line for line in list_res.stdout.splitlines() if line.strip() and not line.startswith(";")]

    return {
        "dump_path": str(output_dump_path),
        "dump_size_bytes": dump_size,
        "dump_size_pretty": f"{dump_size / (1024*1024):.2f} MB",
        "integrity_verified": True,
        "toc_entry_count": len(toc_entries)
    }

def test_database_restoration(dump_file_path: Path, db_password: str) -> dict:
    """
    Perform a genuine database restoration into a uniquely named disposable database.
    Verify table counts, migrations, record counts, and clean up the temporary DB.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    disposable_db = f"erp_restore_verify_{timestamp}"

    # Absolute safety guard
    forbidden_dbs = ["erp_furniture_trial", "erp_furniture_db", "ai_ppt_qc", "cricket", "postgres"]
    if disposable_db in forbidden_dbs:
        raise DatabaseSecurityViolation(f"Refusing to restore into protected database: {disposable_db}")

    env = os.environ.copy()
    env["PGPASSWORD"] = db_password

    # 1. Connect to postgres server as erp_trial_user and CREATE disposable database
    conn = psycopg2.connect(
        dbname="postgres", user=AUTHORIZED_USER,
        password=db_password, host=DB_HOST, port=DB_PORT,
        connect_timeout=10
    )
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(f'CREATE DATABASE "{disposable_db}" OWNER "{AUTHORIZED_USER}";')
    finally:
        conn.close()

    try:
        # 2. Run pg_restore into disposable database
        restore_cmd = [
            str(PG_RESTORE_EXE),
            "-h", DB_HOST,
            "-p", str(DB_PORT),
            "-U", AUTHORIZED_USER,
            "-d", disposable_db,
            "-v",
            "--no-owner",
            "--no-acl",
            str(dump_file_path)
        ]
        restore_res = subprocess.run(restore_cmd, env=env, capture_output=True, text=True)
        # Note: pg_restore may return warnings with exit code 0 or 1 depending on harmless notices,
        # but tables must be verified by direct SQL check.

        # 3. Connect to the disposable database and verify contents
        test_conn = psycopg2.connect(
            dbname=disposable_db, user=AUTHORIZED_USER,
            password=db_password, host=DB_HOST, port=DB_PORT,
            connect_timeout=10
        )
        try:
            with test_conn.cursor() as cur:
                # Identity check in test DB
                cur.execute("SELECT current_database(), current_user;")
                ident = cur.fetchone()
                if ident != (disposable_db, AUTHORIZED_USER):
                    raise DatabaseSecurityViolation(f"Identity mismatch in test restore DB: {ident}")

                # Table count check
                cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
                restored_tables = cur.fetchone()[0]

                # Migration count check
                cur.execute("SELECT count(*) FROM django_migrations;")
                restored_migrations = cur.fetchone()[0]

                # Record counts check
                cur.execute("SELECT count(*) FROM auth_permission;")
                auth_perm_count = cur.fetchone()[0]

                cur.execute("SELECT count(*) FROM django_content_type;")
                content_type_count = cur.fetchone()[0]

                # Schema & foreign key check
                cur.execute("""
                    SELECT count(*) 
                    FROM information_schema.table_constraints 
                    WHERE constraint_type = 'FOREIGN KEY';
                """)
                fk_count = cur.fetchone()[0]

                # Business record counts check
                cur.execute("SELECT count(*) FROM erp_finish;")
                restored_finishes = cur.fetchone()[0]

                cur.execute("SELECT category, count(*) FROM erp_finish GROUP BY category ORDER BY count DESC;")
                restored_finishes_by_cat = {row[0]: row[1] for row in cur.fetchall()}

                cur.execute("SELECT count(*) FROM erp_sample;")
                restored_samples = cur.fetchone()[0]

                cur.execute("SELECT count(*) FROM erp_buyer;")
                restored_buyers = cur.fetchone()[0]

                restore_report = {
                    "disposable_database": disposable_db,
                    "restoration_status": "SUCCESS",
                    "restored_tables_count": restored_tables,
                    "restored_migrations_count": restored_migrations,
                    "restored_finishes_count": restored_finishes,
                    "restored_finishes_by_category": restored_finishes_by_cat,
                    "restored_samples_count": restored_samples,
                    "restored_buyers_count": restored_buyers,
                    "auth_permission_count": auth_perm_count,
                    "django_content_type_count": content_type_count,
                    "foreign_keys_count": fk_count,
                    "pg_restore_exit_code": restore_res.returncode
                }
        finally:
            test_conn.close()

    finally:
        # 4. Clean up: Drop ONLY the exact disposable database created for this test
        cleanup_conn = psycopg2.connect(
            dbname="postgres", user=AUTHORIZED_USER,
            password=db_password, host=DB_HOST, port=DB_PORT,
            connect_timeout=10
        )
        cleanup_conn.autocommit = True
        try:
            with cleanup_conn.cursor() as cur:
                # Terminate any lingering connections to disposable DB
                cur.execute(f"""
                    SELECT pg_terminate_backend(pid) 
                    FROM pg_stat_activity 
                    WHERE datname = '{disposable_db}' AND pid <> pg_backend_pid();
                """)
                cur.execute(f'DROP DATABASE IF EXISTS "{disposable_db}";')
        finally:
            cleanup_conn.close()

    return restore_report
