#!/usr/bin/env python3
"""Database migration utility script with Alembic integration."""

import asyncio
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.core.config import settings
from app.core.database import init_database, close_database
from app.core.observability import setup_logging, get_logger

# Setup logging
setup_logging()
logger = get_logger("migrate")


class MigrationManager:
    """Manage database migrations with Alembic."""
    
    def __init__(self):
        self.project_root = project_root
        self.alembic_ini = self.project_root / "alembic.ini"
        
    def run_alembic_command(self, command: list[str]) -> bool:
        """Run an Alembic command."""
        try:
            os.chdir(self.project_root)
            
            cmd = ["alembic"] + command
            logger.info(f"Running: {' '.join(cmd)}")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            if result.stdout:
                print(result.stdout)
            
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Alembic command failed: {e}")
            if e.stdout:
                print("STDOUT:", e.stdout)
            if e.stderr:
                print("STDERR:", e.stderr)
            return False
        except Exception as e:
            logger.error(f"Failed to run Alembic command: {e}")
            return False
    
    async def check_database_connection(self) -> bool:
        """Check if database is accessible."""
        try:
            logger.info("Checking database connection...")
            await init_database()
            await close_database()
            logger.info("✓ Database connection successful")
            return True
        except Exception as e:
            logger.error(f"✗ Database connection failed: {e}")
            logger.error("Please ensure your database is running and DATABASE_URL is configured")
            return False
    
    def init_migrations(self) -> bool:
        """Initialize Alembic migrations."""
        logger.info("Initializing Alembic migrations...")
        
        if self.alembic_ini.exists():
            logger.warning("Alembic already initialized (alembic.ini exists)")
            return True
        
        return self.run_alembic_command(["init", "alembic"])
    
    def create_migration(self, message: Optional[str] = None, auto: bool = True) -> bool:
        """Create a new migration."""
        if not message:
            message = input("Enter migration message: ").strip()
            if not message:
                logger.error("Migration message is required")
                return False
        
        logger.info(f"Creating migration: {message}")
        
        command = ["revision", "-m", message]
        if auto:
            command.append("--autogenerate")
        
        return self.run_alembic_command(command)
    
    def upgrade_database(self, revision: str = "head") -> bool:
        """Upgrade database to specified revision."""
        logger.info(f"Upgrading database to {revision}...")
        return self.run_alembic_command(["upgrade", revision])
    
    def downgrade_database(self, revision: str = "-1") -> bool:
        """Downgrade database to specified revision."""
        logger.info(f"Downgrading database to {revision}...")
        return self.run_alembic_command(["downgrade", revision])
    
    def show_current_revision(self) -> bool:
        """Show current database revision."""
        logger.info("Current database revision:")
        return self.run_alembic_command(["current"])
    
    def show_migration_history(self) -> bool:
        """Show migration history."""
        logger.info("Migration history:")
        return self.run_alembic_command(["history", "--verbose"])
    
    def show_pending_migrations(self) -> bool:
        """Show pending migrations."""
        logger.info("Pending migrations:")
        return self.run_alembic_command(["show", "head"])


async def create_initial_superuser():
    """Create initial superuser if it doesn't exist."""
    try:
        from app.models.user import User
        from app.core.database import database
        from app.core.security import password_manager
        
        logger.info("Checking for initial superuser...")
        
        async with database.session() as session:
            # Check if any superuser exists
            superusers = await User.get_superusers(session)
            
            if superusers:
                logger.info(f"Found {len(superusers)} existing superuser(s)")
                return True
            
            logger.info("No superusers found. Creating initial superuser...")
            
            # Get superuser details
            email = os.getenv("SUPERUSER_EMAIL") or input("Superuser email: ").strip()
            username = os.getenv("SUPERUSER_USERNAME") or input("Superuser username: ").strip()
            password = os.getenv("SUPERUSER_PASSWORD") or input("Superuser password: ").strip()
            
            if not all([email, username, password]):
                logger.error("Email, username, and password are required")
                return False
            
            # Create superuser
            user_data = {
                "email": email,
                "username": username,
                "full_name": "System Administrator",
                "hashed_password": password_manager.hash_password(password),
                "is_active": True,
                "is_superuser": True,
                "email_verified": True,
            }
            
            user = await User.create(session, **user_data)
            logger.info(f"Created superuser: {user.email} (ID: {user.id})")
            
            return True
            
    except Exception as e:
        logger.error(f"Failed to create superuser: {e}")
        return False


def print_help():
    """Print help information."""
    print("""
🗃️  Database Migration Utility

USAGE:
    python scripts/migrate.py [COMMAND] [OPTIONS]

COMMANDS:
    init                    Initialize Alembic migrations
    create [message]        Create new migration (auto-generate)
    create-empty [message]  Create empty migration template
    upgrade [revision]      Upgrade to revision (default: head)
    downgrade [revision]    Downgrade to revision (default: -1)
    current                 Show current revision
    history                 Show migration history
    pending                 Show pending migrations
    reset                   Reset database (DANGEROUS!)
    seed                    Create initial superuser
    check                   Check database connection
    help                    Show this help

EXAMPLES:
    python scripts/migrate.py create "Add user table"
    python scripts/migrate.py upgrade
    python scripts/migrate.py downgrade -1
    python scripts/migrate.py current
    python scripts/migrate.py seed

ENVIRONMENT VARIABLES:
    DATABASE_URL           Database connection string
    SUPERUSER_EMAIL        Initial superuser email
    SUPERUSER_USERNAME     Initial superuser username  
    SUPERUSER_PASSWORD     Initial superuser password
""")


async def main():
    """Main entry point for migration utility."""
    args = sys.argv[1:]
    
    if not args or args[0] in ["help", "-h", "--help"]:
        print_help()
        return
    
    command = args[0]
    migration_manager = MigrationManager()
    
    # Commands that don't require database connection
    if command == "init":
        success = migration_manager.init_migrations()
        sys.exit(0 if success else 1)
    
    if command == "help":
        print_help()
        return
    
    # Check database connection for other commands
    if not await migration_manager.check_database_connection():
        logger.error("Cannot proceed without database connection")
        sys.exit(1)
    
    # Execute commands
    success = False
    
    if command == "create":
        message = args[1] if len(args) > 1 else None
        success = migration_manager.create_migration(message, auto=True)
        
    elif command == "create-empty":
        message = args[1] if len(args) > 1 else None
        success = migration_manager.create_migration(message, auto=False)
        
    elif command == "upgrade":
        revision = args[1] if len(args) > 1 else "head"
        success = migration_manager.upgrade_database(revision)
        
    elif command == "downgrade":
        revision = args[1] if len(args) > 1 else "-1"
        success = migration_manager.downgrade_database(revision)
        
    elif command == "current":
        success = migration_manager.show_current_revision()
        
    elif command == "history":
        success = migration_manager.show_migration_history()
        
    elif command == "pending":
        success = migration_manager.show_pending_migrations()
        
    elif command == "check":
        success = await migration_manager.check_database_connection()
        
    elif command == "seed":
        # First upgrade database, then create superuser
        if migration_manager.upgrade_database():
            success = await create_initial_superuser()
        
    elif command == "reset":
        confirm = input("⚠️  This will reset the database. Type 'yes' to continue: ")
        if confirm.lower() == "yes":
            logger.info("Resetting database...")
            success = migration_manager.downgrade_database("base")
            if success:
                success = migration_manager.upgrade_database()
        else:
            logger.info("Database reset cancelled")
            success = True
            
    else:
        logger.error(f"Unknown command: {command}")
        print_help()
        sys.exit(1)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    try:
        # Ensure we're in the right directory
        os.chdir(project_root)
        
        # Run the migration utility
        asyncio.run(main())
        
    except KeyboardInterrupt:
        print("\n👋 Migration utility stopped")
    except Exception as e:
        logger.error(f"Migration utility error: {e}")
        sys.exit(1)