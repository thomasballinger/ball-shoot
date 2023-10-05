#!/bin/bash
set -e

if [[ $VERCEL_ENV == "preview"  ]] ; then 
  export NEXT_PUBLIC_CONVEX_URL=$(npx convex preview $VERCEL_GIT_COMMIT_REF) && next build
elif [[ $VERCEL_ENV == "production" ]]; then
  next build && npx convex deploy
else
  # Command for dev if relevant
  echo "No dev command"
fi
