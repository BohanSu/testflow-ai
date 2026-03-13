#!/bin/bash

cd /Users/boannn/codes/auto_workspace/testflow-ai

echo "=== TestFlow AI GitHub Push Script ==="
echo ""
echo "Repository: https://github.com/BohanSu/testflow-ai.git"
echo "PAT: ghp_i4iuYfFm3Fm20hTE2LrmznyHRon5Oelnl2lIdKr"
echo ""

git remote get-url origin > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Setting remote..."
    git remote add origin https://ghp_i4iuYfFm3Fm20hTE2LrmznyHRon5Oelnl2lIdKr@github.com/BohanSu/testflow-ai.git
fi

echo ""
echo "Current branch: $(git branch --show-current)"
echo "Commits: $(git log --oneline | wc -l)"
echo "Files tracked: $(git ls-files | wc -l)"
echo ""

echo "Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "Successfully pushed to GitHub!"
    echo "Repository: https://github.com/BohanSu/testflow-ai"
else
    echo ""
    echo "Failed to push to GitHub"
    echo ""
    echo "Try the following commands manually:"
    echo ""
    echo "cd /Users/boannn/codes/auto_workspace/testflow-ai"
    echo "git remote add origin https://ghp_i4iuYfFm3Fm20hTE2LrmznyHRon5Oelnl2lIdKr@github.com/BohanSu/testflow-ai.git"
    echo "git push -u origin main"
    echo ""
    echo "Or create the repository manually at:"
    echo "https://github.com/new"
fi
