set OS=%1
set ABI=%2
set TYPE=%3
set VERSION=%4
set CRT=%5

cd %HOMEPATH%
echo =====[ Getting Depot Tools ]=====
powershell -command "Invoke-WebRequest https://storage.googleapis.com/chrome-infra/depot_tools.zip -O depot_tools.zip"
7z x depot_tools.zip -o*
set PATH=%CD%\depot_tools;%PATH%
set GYP_MSVS_VERSION=2019
set DEPOT_TOOLS_WIN_TOOLCHAIN=0
call gclient

mkdir v8
cd v8

echo =====[ Fetching V8 ]=====
call fetch v8
cd v8
call git checkout refs/tags/%VERSION%
cd test\test262\data
call git config --system core.longpaths true
call git restore *
cd ..\..\..\
call gclient sync

echo =====[ Building V8 ]=====
node %~dp0\build.js %OS% %ABI% %TYPE% %CRT%

echo =====[ Copy V8 header ]=====
xcopy include output\include\ /s/h/e/k/f/c
