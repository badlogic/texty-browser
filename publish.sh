#!/bin/bash

# Exit on error
set -e

# Default to badlogic if GITHUB_USER is not set
GITHUB_USER=${GITHUB_USER:-badlogic}

echo "🔍 Reading current version from manifest.json..."
current_version=$(jq -r '.version' manifest.json)
echo "Current version: $current_version"

# Increment patch version
echo "📝 Calculating new version..."
IFS='.' read -ra VERSION_PARTS <<< "$current_version"
new_version="${VERSION_PARTS[0]}.${VERSION_PARTS[1]}.$((VERSION_PARTS[2] + 1))"
echo "New version: $new_version"

# Update manifest.json
echo "✏️ Updating manifest.json..."
jq ".version = \"$new_version\"" manifest.json > manifest.json.tmp
mv manifest.json.tmp manifest.json

# Commit changes
echo "📦 Committing changes..."
git add manifest.json
git commit -m "Release v$new_version"

# Create and push tag
echo "🏷️ Creating and pushing tag v$new_version..."
git tag "v$new_version"
git push origin main "v$new_version"

echo "⏳ Waiting for GitHub release to be created..."
while true; do
    if curl --silent "https://api.github.com/repos/$GITHUB_USER/texty/releases/tags/v$new_version" | grep -q "id"; then
        echo "✅ Release v$new_version is now available!"
        break
    fi
    echo "⏳ Still waiting for release..."
    sleep 10
done