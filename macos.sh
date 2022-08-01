ABI=$1
TYPE=$2
VERSION=$3
[ -z "$GITHUB_WORKSPACE" ] && GITHUB_WORKSPACE="$( cd "$( dirname "$0" )"/.. && pwd )"

cd ~
echo "=====[ Getting Depot Tools ]====="
git clone -q https://chromium.googlesource.com/chromium/tools/depot_tools.git
export PATH=$(pwd)/depot_tools:$PATH
gclient

mkdir v8
cd v8

echo "=====[ Fetching V8 ]====="
fetch v8
echo "target_os = ['mac']" >> .gclient
cd ~/v8/v8
git checkout refs/tags/$VERSION
gclient sync

echo "=====[ Building V8 ]====="
node $GITHUB_WORKSPACE/build.js mac $ABI $TYPE

echo "=====[ Copy V8 header ]====="
cp -r include output/include
