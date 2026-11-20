@echo off
cd /d "%~dp0"
echo Installing helpers...
python -m pip install --quiet beautifulsoup4 lxml
echo Crawling Fannie Mae Selling Guide (a few minutes)...
python crawl_fannie.py
echo Downloading HUD Handbook 4000.1...
if not exist guides mkdir guides
curl -L -o guides\hud-4000.1.pdf "https://www.hud.gov/sites/default/files/Housing/documents/40001-hsgh-Update-18.pdf"
del guides\hud.txt 2>nul
echo Building the index...
python build_index.py
echo Done. Open index.html
pause
