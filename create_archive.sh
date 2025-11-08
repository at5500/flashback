#!/bin/bash

# Script to create an archive with code without confidential data

# Archive name with date
ARCHIVE_NAME="flashback_code_$(date +%Y%m%d_%H%M%S).tar.gz"

# Temporary directory for preparing files
TEMP_DIR="temp_archive"
PROJECT_DIR="FlashBack"

echo "Creating archive $ARCHIVE_NAME..."

# Create temporary directory with project name
mkdir -p "$TEMP_DIR/$PROJECT_DIR"

# Copy all files except exclusions
rsync -av --progress \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='target' \
  --exclude='dist' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='*.db' \
  --exclude='*.sqlite' \
  --exclude='.idea' \
  --exclude='.vscode' \
  --exclude='*.log' \
  --exclude='.env' \
  --exclude='.DS_Store' \
  --exclude='Thumbs.db' \
  --exclude='Cargo.lock' \
  --exclude="$TEMP_DIR" \
  --exclude="*.tar.gz" \
  --exclude="temp" \
  --exclude="tmp" \
  . "$TEMP_DIR/$PROJECT_DIR/"

# Create archive (COPYFILE_DISABLE=1 prevents adding ._ files on macOS)
# --no-mac-metadata prevents macOS extended attributes warnings (macOS only)
if tar --version 2>&1 | grep -q "bsdtar"; then
  # macOS BSD tar - use --no-mac-metadata
  COPYFILE_DISABLE=1 tar --no-mac-metadata -czf "$ARCHIVE_NAME" -C "$TEMP_DIR" "$PROJECT_DIR"
else
  # GNU tar or other - use standard flags
  COPYFILE_DISABLE=1 tar -czf "$ARCHIVE_NAME" -C "$TEMP_DIR" "$PROJECT_DIR"
fi

# Remove temporary directory
rm -rf "$TEMP_DIR"

echo "Archive $ARCHIVE_NAME created successfully!"
echo "Archive size: $(du -h "$ARCHIVE_NAME" | cut -f1)"