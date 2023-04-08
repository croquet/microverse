#!/bin/bash
BRANCHES=${@}

# make sure "main" is in the list of branches
if [[ ! " ${BRANCHES[@]} " =~ "main" ]]; then
    BRANCHES+=("main")
fi

echo "Building pages for branches:${BRANCHES[@]}"

ROOT=$(git rev-parse --show-toplevel)
cd ${ROOT}

# pages are deployed from the _site directory
if [ -d _site ]; then
    rm -rf _site
fi
mkdir _site

LINKS=()
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
for BRANCH in ${BRANCHES[@]}; do
    echo "Building branch: ${BRANCH}"
    if [ "${BRANCH}" != "${CURRENT_BRANCH}" ]; then
        rm -rf .git/worktrees/${BRANCH}
        git worktree add -B ${BRANCH} .git/worktrees/${BRANCH} ${BRANCH}
        cd .git/worktrees/${BRANCH}
        cp ${ROOT}/apiKey.js .
    fi
    npm ci
    npm run build
    npm run create-version
    mv dist ${ROOT}/_site/${BRANCH}
    COMMIT=$(git show -s --format='%ad %H' --date=format:'%Y-%m-%d %H:%M:%S')
    LINKS+=("<dt><a href=\"${BRANCH}/\">${BRANCH}</a></dt><dd>${COMMIT}</dd>")
done

cd ${ROOT}

echo "Building index page"
cat > _site/index.html <<EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Microverse Builds</title>
</head>
<body style="font-family:monospace">
    <h1>Microverse Builds</h1>
    <dl>
        ${LINKS[@]}
    </dl>
</body>
</html>
EOF
