@echo off
start /min cmd /k "sass --watch ./scss:./css"
start /min cmd /k "cd ts && tsc --pretty --watch"
start http://127.0.0.1:3000
php -S 0.0.0.0:3000