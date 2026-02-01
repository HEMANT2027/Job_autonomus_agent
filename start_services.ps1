Write-Host "Starting AI Impact Summit Services..." -ForegroundColor Green

# 1. Backend Server (Port 8000)
Write-Host "Launching Backend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; uvicorn app.main:app --reload --port 8000"

# 2. Sandbox Portal (Port 8001)
Write-Host "Launching Sandbox Portal..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd sandbox-portal; uvicorn main:app --reload --port 8001"

# 3. Main Frontend
Write-Host "Launching Main Frontend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

# 4. Sandbox Frontend
Write-Host "Launching Sandbox Frontend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd sandbox-frontend; npm run dev"

Write-Host "All services have been launched in separate windows!" -ForegroundColor Cyan
