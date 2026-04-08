@echo off
REM Syncademy PostgreSQL Diagnostic and Startup Script
REM Run this as Administrator

echo.
echo ======================================
echo  Syncademy PostgreSQL Diagnostic
echo ======================================
echo.

REM Check if PowerShell is available
powershell -NoProfile -ExecutionPolicy Bypass -Command "Write-Host 'PowerShell available'; exit 0" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PowerShell is required but not found
    exit /b 1
)

echo [1/4] Checking if PostgreSQL is installed...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Command psql -ErrorAction SilentlyContinue | Out-Null; if ($?) { Write-Host 'OK: PostgreSQL found'; exit 0 } else { Write-Host 'ERROR: PostgreSQL not found'; exit 1 }"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo PostgreSQL is not installed or not in PATH
    echo.
    echo Options:
    echo  1. Download PostgreSQL: https://www.postgresql.org/download/windows/
    echo  2. Run installer (choose default options)
    echo  3. Remember your password
    echo  4. Run this script again
    echo.
    pause
    exit /b 1
)

echo.
echo [2/4] Checking PostgreSQL service status...
powershell -NoProfile -ExecutionPolicy Bypass -Command "
    \$services = Get-Service postgresql* -ErrorAction SilentlyContinue | Where-Object {-not \$_.DisplayName.Contains('cluster')}
    if (\$services) {
        foreach (\$svc in \$services) {
            Write-Host \"Found: \$(\$svc.Name) - Status: \$(\$svc.Status)\"
        }
    } else {
        Write-Host 'No PostgreSQL service found'
    }
"

echo.
echo [3/4] Checking if PostgreSQL is accepting connections...
powershell -NoProfile -ExecutionPolicy Bypass -Command "
    \$result = @()
    \$result = pg_isready -h localhost -p 5432 2>&1
    if (\$LASTEXITCODE -eq 0) {
        Write-Host 'OK: PostgreSQL is accepting connections'
        exit 0
    } else {
        Write-Host 'PostgreSQL is NOT accepting connections'
        exit 1
    }
" >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo OK: PostgreSQL is accepting connections
    goto :check_database
) else (
    echo PostgreSQL not accessible. Attempting to start...
    goto :start_postgres
)

:start_postgres
echo.
echo [Attempting to start PostgreSQL service...]
powershell -NoProfile -ExecutionPolicy Bypass -Command "
    \$services = Get-Service postgresql* -ErrorAction SilentlyContinue | Where-Object {-not \$_.DisplayName.Contains('cluster') -and \$_.Status -ne 'Running'}
    if (\$services) {
        foreach (\$svc in \$services) {
            Write-Host \"Starting: \$(\$svc.Name)...\"
            Start-Service -Name \$svc.Name -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            \$updated = Get-Service -Name \$svc.Name
            if (\$updated.Status -eq 'Running') {
                Write-Host \"✓ Successfully started: \$(\$svc.Name)\"
            } else {
                Write-Host \"✗ Failed to start: \$(\$svc.Name)\"
                Write-Host \"  Try running as Administrator or start via services.msc\"
            }
        }
    } else {
        Write-Host 'No stopped PostgreSQL service found'
    }
"

timeout /t 3

echo.
echo [4/4] Verifying connection after startup...
powershell -NoProfile -ExecutionPolicy Bypass -Command "
    Start-Sleep -Seconds 2
    pg_isready -h localhost -p 5432 2>&1
    if (\$LASTEXITCODE -eq 0) {
        Write-Host 'OK: PostgreSQL is now accepting connections'
        exit 0
    } else {
        Write-Host 'PostgreSQL still not accessible'
        exit 1
    }
" >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo ✓ PostgreSQL is ready!
    goto :check_database
) else (
    echo ✗ PostgreSQL is still not running
    echo.
    echo SOLUTION:
    echo 1. Open Services: services.msc
    echo 2. Find "postgresql-x64-XX" (where XX is version number)
    echo 3. Right-click and select "Start"
    echo 4. Wait 5 seconds
    echo 5. Run this script again
    echo.
    pause
    exit /b 1
)

:check_database
echo.
echo ======================================
echo  Creating Database
echo ======================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "
    \$databases = psql -U postgres -d postgres -c \"SELECT datname FROM pg_database WHERE datname='syncademy'\" 2>&1 | Select-String 'syncademy'
    if (\$databases) {
        Write-Host 'Database syncademy already exists'
    } else {
        Write-Host 'Creating syncademy database...'
        psql -U postgres -d postgres -c \"CREATE DATABASE syncademy;\" 2>&1
        if (\$LASTEXITCODE -eq 0) {
            Write-Host 'Database created successfully'
        } else {
            Write-Host 'Failed to create database'
            Write-Host 'Using default password: postgres'
        }
    }
"

echo.
echo ======================================
echo  Setup Complete!
echo ======================================
echo.
echo Next steps:
echo 1. Open terminal in Syncademy folder
echo 2. Run: npm run db:setup
echo 3. Run: npm run dev
echo 4. Open: http://localhost:5173
echo.
pause
