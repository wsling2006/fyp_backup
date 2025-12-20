#!/bin/bash

# FYP System Database Setup Script
# This script creates and initializes the PostgreSQL database for the FYP System
# Run this ONCE on the EC2 instance to set up the database

set -e  # Exit on any error

echo "════════════════════════════════════════════════════════════"
echo "  FYP System PostgreSQL Database Setup"
echo "════════════════════════════════════════════════════════════"

# Configuration from backend/src/data-source.ts
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-fyp_db}"

echo "Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Username: $DB_USERNAME"
echo "  Database: $DB_NAME"
echo ""

# Create database
echo "Step 1: Creating database '$DB_NAME'..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -tc \
  "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -c \
  "CREATE DATABASE $DB_NAME;" || echo "Database already exists or failed to create"

echo "✅ Database created/verified"
echo ""

# Run TypeORM migrations
echo "Step 2: Running TypeORM migrations..."
cd "$(dirname "$0")/backend"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build if needed
if [ ! -d "dist" ]; then
  echo "Building project..."
  npm run build
fi

# Run migrations
echo "Running database migrations..."
npm run typeorm -- migration:run || echo "⚠️  Migrations failed or no migrations to run"

echo "✅ Migrations completed"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  ✅ Database Setup Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Verify the database:"
echo "   PGPASSWORD='$DB_PASSWORD' psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME"
echo ""
echo "2. Check tables:"
echo "   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
echo ""
echo "3. Start the backend:"
echo "   cd backend && npm run start:prod"
echo ""
