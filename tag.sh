if [ $# -ne 3 ]; then
    echo "Usage: tag.sh <major> <minor> <patch>"
    exit 1
fi

git tag v$1.$2.$3
git push origin v$1.$2.$3
