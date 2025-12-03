#!/bin/bash

# =====================================================
# Cosmos Application - Complete Cleanup Script
# =====================================================
# WARNING: This will DELETE EVERYTHING!
# - All database data
# - All auth users
# - All uploaded files
#
# Use this for a complete reset in development/testing
# =====================================================

set -e  # Exit on error

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  🧹 COSMOS COMPLETE DATABASE & STORAGE CLEANUP 🧹     ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "⚠️  WARNING: This will DELETE EVERYTHING:"
echo "    • All database records (users, assets, streams, etc.)"
echo "    • All Supabase Auth users"
echo "    • All uploaded files in storage"
echo ""
echo "This action CANNOT be undone!"
echo ""
read -p "Type 'DELETE EVERYTHING' to confirm: " confirmation

if [ "$confirmation" != "DELETE EVERYTHING" ]; then
  echo ""
  echo "❌ Cleanup cancelled."
  exit 0
fi

echo ""
echo "🚀 Starting complete cleanup..."
echo ""

# Step 1: Clean database tables
echo "Step 1/3: Cleaning database tables..."
docker-compose -f supabase-docker/docker-compose.yml exec -T db psql -U postgres -d postgres < scripts/cleanup_database.sql

if [ $? -ne 0 ]; then
  echo "❌ Database cleanup failed!"
  exit 1
fi

echo ""
echo "✅ Database tables cleaned!"
echo ""

# Step 2: Clean auth users
echo "Step 2/3: Cleaning auth users..."
docker-compose -f supabase-docker/docker-compose.yml exec -T db psql -U postgres -d postgres < scripts/cleanup_auth.sql

if [ $? -ne 0 ]; then
  echo "❌ Auth cleanup failed!"
  exit 1
fi

echo ""
echo "✅ Auth users cleaned!"
echo ""

# Step 3: Clean storage
echo "Step 3/3: Cleaning storage..."
bash scripts/cleanup_storage.sh

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  ✨ CLEANUP COMPLETE! ✨                              ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Your database and storage are now completely clean!"
echo ""
echo "📝 Next steps:"
echo "   1. Create a new account at: http://localhost:3000/auth/signup"
echo "   2. Upload your first asset"
echo "   3. Enjoy the fresh start! 🎉"
echo ""



