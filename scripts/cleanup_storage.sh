#!/bin/bash

# =====================================================
# Cosmos Application - Storage Cleanup Script
# =====================================================
# WARNING: This will DELETE ALL FILES from Supabase Storage
# Use this for development/testing only!
#
# This script removes all uploaded files from the storage bucket
# =====================================================

echo ""
echo "⚠️  WARNING: This will delete ALL files from Supabase Storage!"
echo "Press Ctrl+C within 3 seconds to cancel..."
sleep 3

echo ""
echo "🗑️  Cleaning up storage bucket..."
echo ""

# Clean up the assets bucket in Supabase Storage
# You'll need to run this via Supabase API or manually in Supabase Studio

# For local development with Supabase Docker:
STORAGE_PATH="./supabase-docker/volumes/storage"

if [ -d "$STORAGE_PATH" ]; then
  echo "📁 Found local storage at: $STORAGE_PATH"
  echo "🧹 Removing all files from assets bucket..."
  
  # Remove all files from the assets bucket
  rm -rf "$STORAGE_PATH/assets/"*
  
  echo "✅ Storage cleanup complete!"
else
  echo "❌ Local storage path not found at: $STORAGE_PATH"
  echo ""
  echo "📝 To clean storage manually:"
  echo "   1. Open Supabase Studio (http://localhost:8000)"
  echo "   2. Go to Storage section"
  echo "   3. Select 'assets' bucket"
  echo "   4. Delete all files"
  echo ""
fi

# Also clean up local public/uploads if it exists
PUBLIC_UPLOADS="./public/uploads"
if [ -d "$PUBLIC_UPLOADS" ]; then
  echo ""
  echo "🧹 Cleaning up public/uploads directory..."
  rm -rf "$PUBLIC_UPLOADS"/*
  echo "✅ Public uploads cleaned!"
fi

echo ""
echo "✨ Storage cleanup complete!"
echo ""




