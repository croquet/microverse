#!/bin/bash

# .github/workflows/deploy-to-pages.yml calls "npm run build-pages" with a
# list of branches to build and deploy to GitHub Pages. This script then builds
# each branch and creates a directory in the _site directory for each branch.
# The _site directory is then deployed to GitHub Pages.

# for testing, you can run this script locally
# e.g. ./scripts/build-pages.sh main 1234-branch
# and then open _site/index.html in your browser
env
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
    # checkout the branch
    if [ "${BRANCH}" != "${CURRENT_BRANCH}" ]; then
        rm -rf .git/worktrees/${BRANCH}
        git worktree add -B ${BRANCH} .git/worktrees/${BRANCH} remotes/origin/${BRANCH}
        cd .git/worktrees/${BRANCH}
        cp ${ROOT}/apiKey.js .
    fi
    npm ci
    # build the app
    npm run build
    npm run create-version
    mv dist ${ROOT}/_site/${BRANCH}
    # build the library zip
    VERSION="microverse-library.${BRANCH}-$(git show -s --format='%ad-%h' --date=format:'%Y%m%d')"
    npm run build-lib
    mv dist $VERSION
    zip -r ${ROOT}/_site/${BRANCH}/$VERSION.zip $VERSION
    rm -rf $VERSION
    # create links for the index page
    COMMIT=$(git show -s --format='%ad %H' --date=format:'%Y-%m-%d %H:%M:%S')
    LINKS+=("<dt><a href=\"${BRANCH}/\">${BRANCH}</a></dt><dd>${COMMIT} (<a href=\"${BRANCH}/${VERSION}.zip\">lib</a>)</dd>")
    if [ "${BRANCH}" != "${CURRENT_BRANCH}" ]; then
        cd ${ROOT}
        git worktree remove --force .git/worktrees/${BRANCH}
    fi
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
    <script>
        const {search, hash} = window.location;
        const links = document.getElementsByTagName('a');
        for (const link of links) {
            const url = new URL(link.href);
            url.search = search;
            url.hash = hash;
            link.href = url.toString();
        }
    </script>
</body>
</html>
EOF
