#!/bin/sh

# Exit on error
set -e

# Install dependencies
npm ci

# linting
npm run lint

# Run tests
npm test

#get type of release (can be specified in the -r flag)
while getopts r: flag
do
    case "${flag}" in
        r) releaseType=${OPTARG};;
    esac
done
if [ -z "$releaseType" ]; then
    echo "What type of release is this? (major, minor, patch, none)"
    read releaseType
fi

# Bump version if needed
if [ "$releaseType" != "none" ]; then
  npm version $releaseType
fi

# Push to GitHub
git push --follow-tags

# Publish to npm
npm publish