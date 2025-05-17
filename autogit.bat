chcp 65001

git add .

set /p commit_msg="commit:"
git commit -m "%commit_msg%"

git remote add origin https://github.com/Little100/Minecraft_Online_Issues.git

git push -u origin main