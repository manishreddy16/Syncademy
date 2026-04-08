# Syncademy PostgreSQL Diagnostic and Startup Script (PowerShell)
# Run as Administrator for best results

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Syncademy PostgreSQL Diagnostic" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "⚠️  WARNING: Not running as Administrator" -ForegroundColor Yellow
    Write-Host "     Database operations may fail" -ForegroundColor Yellow
    Write-Host "     Consider running: right-click PowerShell → Run as Administrator" -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Check if PostgreSQL is installed
Write-Host "[1/5] Checking if PostgreSQL is installed..." -ForegroundColor Yellow
$psqlCommand = Get-Command psql -ErrorAction SilentlyContinue
if ($psqlCommand) {
    Write-Host "✓ PostgreSQL found at: $($psqlCommand.Source)" -ForegroundColor Green
} else {
    Write-Host "✗ PostgreSQL not found in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUTION:" -ForegroundColor Yellow
    Write-Host "1. Download PostgreSQL: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "2. Run the installer with default settings" -ForegroundColor White
    Write-Host "3. Remember the password you set" -ForegroundColor White
    Write-Host "4. Restart this script" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 2: Check PostgreSQL service status
Write-Host ""
Write-Host "[2/5] Checking PostgreSQL service status..." -ForegroundColor Yellow
$pgServices = Get-Service postgresql* -ErrorAction SilentlyContinue | Where-Object { -not $_.DisplayName.Contains('cluster') }

if ($pgServices) {
    foreach ($svc in $pgServices) {
        $statusIcon = if ($svc.Status -eq 'Running') { "✓" } else { "✗" }
        $statusColor = if ($svc.Status -eq 'Running') { "Green" } else { "Red" }
        Write-Host "$statusIcon $($svc.Name): $($svc.Status)" -ForegroundColor $statusColor
    }
} else {
    Write-Host "✗ No PostgreSQL service found" -ForegroundColor Red
    Write-Host "   PostgreSQL may have been installed but not as a service" -ForegroundColor Yellow
}

# Step 3: Check if PostgreSQL is accepting connections
Write-Host ""
Write-Host "[3/5] Testing PostgreSQL connection..." -ForegroundColor Yellow
$connectionTest = & pg_isready -h localhost -p 5432 2>&1
$connectionStatus = $LASTEXITCODE

if ($connectionStatus -eq 0) {
    Write-Host "✓ PostgreSQL is accepting connections" -ForegroundColor Green
} else {
    Write-Host "✗ PostgreSQL is NOT accepting connections" -ForegroundColor Red
    Write-Host "   Attempting to start PostgreSQL service..." -ForegroundColor Yellow
    
    # Try to start PostgreSQL
    $stoppedServices = Get-Service postgresql* -ErrorAction SilentlyContinue | Where-Object { $_.Status -ne 'Running' -and -not $_.DisplayName.Contains('cluster') }
    
    if ($stoppedServices) {
        foreach ($svc in $stoppedServices) {
            Write-Host "   Starting $($svc.Name)..." -ForegroundColor Yellow
            try {
                Start-Service -Name $svc.Name -ErrorAction Stop
                Start-Sleep -Seconds 2
                $updated = Get-Service -Name $svc.Name
                if ($updated.Status -eq 'Running') {
                    Write-Host "✓ Successfully started $($svc.Name)" -ForegroundColor Green
                } else {
                    Write-Host "✗ Failed to start $($svc.Name)" -ForegroundColor Red
                }
            } catch {
                Write-Host "✗ Error starting service: $($_.Exception.Message)" -ForegroundColor Red
                Write-Host ""
                Write-Host "SOLUTION:" -ForegroundColor Yellow
                Write-Host "1. Press Windows key and type 'services.msc'" -ForegroundColor White
                Write-Host "2. Find 'postgresql-x64-XX' in the list" -ForegroundColor White
                Write-Host "3. Right-click and select 'Start'" -ForegroundColor White
                Write-Host "4. Run this script again" -ForegroundColor White
            }
        }
        
        # Wait and retest
        Write-Host "   Waiting for PostgreSQL to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        $connectionTest = & pg_isready -h localhost -p 5432 2>&1
        $connectionStatus = $LASTEXITCODE
        
        if ($connectionStatus -eq 0) {
            Write-Host "✓ PostgreSQL is now accepting connections" -ForegroundColor Green
        } else {
            Write-Host "✗ PostgreSQL is still not responding" -ForegroundColor Red
        }
    }
}

# Step 4: Check/Create database
Write-Host ""
Write-Host "[4/5] Checking/Creating database..." -ForegroundColor Yellow

$dbCheck = psql -U postgres -d postgres -c "SELECT datname FROM pg_database WHERE datname='syncademy';" 2>&1 | Select-String 'syncademy'

if ($dbCheck) {
    Write-Host "✓ Database 'syncademy' already exists" -ForegroundColor Green
} else {
    Write-Host "Creating database 'syncademy'..." -ForegroundColor Yellow
    try {
        psql -U postgres -d postgres -c "CREATE DATABASE syncademy;" 2>&1 | Out-Null
        Write-Host "✓ Database created successfully" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to create database: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   The database may need to be created manually or requires a different password" -ForegroundColor Yellow
    }
}

# Step 5: Summary
Write-Host ""
Write-Host "[5/5] Summary" -ForegroundColor Yellow
Write-Host ""
Write-Host "✓ PostgreSQL diagnostic complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. cd c:\Users\manis\OneDrive\Desktop\Syncademy-main" -ForegroundColor White
Write-Host "2. npm run db:setup" -ForegroundColor White
Write-Host "3. npm run dev" -ForegroundColor White
Write-Host "4. Open http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "If you encounter password errors:" -ForegroundColor Yellow
Write-Host "- Update DATABASE_URL in .env" -ForegroundColor White
Write-Host "- Format: postgresql://postgres:YourPassword@localhost:5432/syncademy" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"
