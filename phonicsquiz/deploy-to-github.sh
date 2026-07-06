#!/usr/bin/env bash
set -euo pipefail

# Deploy Phonics Quest to a NEW GitHub account as a standalone repo.
#
# Usage:
#   ./deploy-to-github.sh <github-username> [repo-name]
#
# Examples:
#   ./deploy-to-github.sh myphonics phonicsquest
#     → https://myphonics.github.io/phonicsquest/
#
#   ./deploy-to-github.sh myphonics myphonics.github.io
#     → https://myphonics.github.io/   (root URL, recommended for mobile)

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <github-username> [repo-name]"
  echo ""
  echo "  repo-name defaults to 'phonicsquest'"
  echo "  use '<username>.github.io' for a root Pages URL"
  exit 1
fi

GITHUB_USER="$1"
REPO_NAME="${2:-phonicsquest}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$BUILD_DIR"
}
trap cleanup EXIT

echo "→ Preparing standalone repo in temp folder..."
rsync -a \
  --exclude '.git' \
  --exclude 'deploy-to-github.sh' \
  "$SCRIPT_DIR/" "$BUILD_DIR/"

cd "$BUILD_DIR"
git init -b main
git add .
git commit -m "Initial commit: Phonics Quest"

REMOTE="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
echo ""
echo "→ Next steps (run with your NEW GitHub account logged in):"
echo ""
echo "  1. Create empty repo on GitHub:"
echo "     https://github.com/new"
echo "     Repository name: ${REPO_NAME}"
echo "     Public, no README / .gitignore / license"
echo ""
echo "  2. Push code:"
echo "     git remote add origin ${REMOTE}"
echo "     git push -u origin main"
echo ""
echo "  3. Enable GitHub Pages:"
echo "     Settings → Pages → Build and deployment → Source: GitHub Actions"
echo ""
if [[ "$REPO_NAME" == "${GITHUB_USER}.github.io" ]]; then
  echo "  4. Your app URL:"
  echo "     https://${GITHUB_USER}.github.io/"
else
  echo "  4. Your app URL:"
  echo "     https://${GITHUB_USER}.github.io/${REPO_NAME}/"
fi
echo ""
echo "  5. Actions tab → 'Deploy to GitHub Pages' workflow should run automatically."
echo ""

read -r -p "Create GitHub repo and push now? [y/N] " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "Build folder kept at: $BUILD_DIR"
  trap - EXIT
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) not found. Follow the manual steps above."
  trap - EXIT
  exit 0
fi

echo "→ Checking GitHub login..."
gh auth status

echo "→ Creating repo ${GITHUB_USER}/${REPO_NAME}..."
gh repo create "${GITHUB_USER}/${REPO_NAME}" --public --source=. --remote=origin --push

echo ""
echo "✓ Pushed! Now enable Pages:"
echo "  https://github.com/${GITHUB_USER}/${REPO_NAME}/settings/pages"
echo "  Source → GitHub Actions"
echo ""
if [[ "$REPO_NAME" == "${GITHUB_USER}.github.io" ]]; then
  echo "App URL: https://${GITHUB_USER}.github.io/"
else
  echo "App URL: https://${GITHUB_USER}.github.io/${REPO_NAME}/"
fi
