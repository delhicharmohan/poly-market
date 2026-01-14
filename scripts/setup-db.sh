#!/bin/bash

# Database Setup Script for Indimarket
# This script helps initialize the PostgreSQL database

set -e

echo "🚀 Setting up Indimarket PostgreSQL Database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Start PostgreSQL container
echo "📦 Starting PostgreSQL container..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout=30
counter=0
until docker-compose exec -T postgres pg_isready -U indimarket > /dev/null 2>&1; do
    sleep 1
    counter=$((counter + 1))
    if [ $counter -ge $timeout ]; then
        echo "❌ PostgreSQL failed to start within $timeout seconds"
        exit 1
    fi
done

echo "✅ PostgreSQL is ready!"

# Copy init script to container
echo "📋 Copying initialization script to container..."
docker cp init-db.sql indimarket-postgres:/tmp/init-db.sql

# Initialize database schema
echo "🔧 Initializing database schema..."
if docker-compose exec -T postgres psql -U indimarket -d indimarket -f /tmp/init-db.sql; then
    echo "✅ Database schema initialized successfully!"
else
    echo "⚠️  Warning: Schema initialization had issues. Database may already be initialized."
fi

# Clean up
docker-compose exec postgres rm -f /tmp/init-db.sql

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: indimarket"
echo "  User: indimarket"
echo "  Password: indimarket123"
echo ""
echo "To connect via psql:"
echo "  docker-compose exec postgres psql -U indimarket -d indimarket"
echo ""
echo "Or use the connection string:"
echo "  postgresql://indimarket:indimarket123@localhost:5432/indimarket"


