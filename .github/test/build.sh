OS=$1
ABI=$2
TYPE=$3
VERSION=$4
[ -z "$GITHUB_WORKSPACE" ] && GITHUB_WORKSPACE="$( cd "$( dirname "$0" )"/.. && pwd )"

cd ~
mkdir -p v8/v8
cd ~/v8/v8
node $GITHUB_WORKSPACE/.github/test/build.js $OS $ABI $TYPE
