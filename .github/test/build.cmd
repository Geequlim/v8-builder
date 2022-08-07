set OS=%1
set ABI=%2
set TYPE=%3
set VERSION=%4
set CRT=%5

cd %HOMEPATH%
mkdir v8
cd v8
mkdir v8
cd v8
node %~dp0\build.js %OS% %ABI% %TYPE% %CRT%
