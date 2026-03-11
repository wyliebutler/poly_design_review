$Server = "192.168.2.200"
$User = "wyliebutler"
$RemotePath = "/home/wyliebutler/docker/design-portal"

Write-Host "Starting V2 Clean Deployment to $Server..." -ForegroundColor Cyan

# 1. Ensure remote directory exists and is CLEAN
Write-Host "Cleaning remote environment..." -ForegroundColor Yellow
ssh ${User}@${Server} "echo 'Ler542111!!' | sudo -S mkdir -p ${RemotePath}/uploads && echo 'Ler542111!!' | sudo -S chmod -R 777 ${RemotePath} && cd ${RemotePath} && docker compose down 2>/dev/null; echo 'Ler542111!!' | sudo -S find . -maxdepth 1 ! -name 'uploads' ! -name '.' -exec rm -rf {} +"

# 2. Copy Files
Write-Host "Copying project files..." -ForegroundColor Yellow
scp -r app components lib prisma public next.config.ts package.json tsconfig.json tailwind.config.ts postcss.config.mjs Dockerfile docker-compose.yml auth.ts .dockerignore ${User}@${Server}:${RemotePath}

# 3. Build and Start Containers
Write-Host "Building and starting containers..." -ForegroundColor Yellow
ssh ${User}@${Server} "cd ${RemotePath} && docker compose build --no-cache app && docker compose up -d"

# 4. Sync Database Schema (Using run to ensure it happens with right env)
Write-Host "Synchronizing database schema..." -ForegroundColor Yellow
ssh ${User}@${Server} "cd ${RemotePath} && docker compose run --rm -u root app npx prisma db push --accept-data-loss"

# 5. Restart app to ensure it picks up changes
Write-Host "Restarting application..." -ForegroundColor Yellow
ssh ${User}@${Server} "cd ${RemotePath} && docker compose restart app"

Write-Host "Deployment Complete! App is running on $Server:3000" -ForegroundColor Green

# 6. Clean up unused docker images and build cache to save space
Write-Host "Cleaning up dangling Docker images and build cache to prevent disk bloat..." -ForegroundColor Yellow
ssh ${User}@${Server} "docker system prune -f && docker builder prune -f"
