#!/bin/bash

# Default commit message
params="$*"
commit_message=${params:-"Auto update $(date +'%Y-%m-%d %H:%M:%S')"}

echo "Adding all changes..."
git add .

echo "Committing with message: '$commit_message'"
git commit -m "$commit_message"

echo "Pushing to origin main..."
git push origin main

echo "Done!"
