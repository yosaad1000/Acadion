# Fix hardcoded localhost URLs in frontend
Write-Host "🔧 Fixing hardcoded localhost URLs..." -ForegroundColor Green

# Define the API base URL variable
$apiBaseVar = "import.meta.env.VITE_API_URL || 'http://localhost:8000'"

# Files to fix
$files = @(
    "frontend/src/pages/ViewStudents.tsx",
    "frontend/src/pages/TakeAttendance.tsx", 
    "frontend/src/pages/Students.tsx",
    "frontend/src/pages/StudentRegister.tsx",
    "frontend/src/pages/AttendanceUpload.tsx",
    "frontend/src/pages/AttendanceReports.tsx",
    "frontend/src/pages/AttendanceDashboard.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "📝 Fixing $file..." -ForegroundColor Yellow
        
        # Read content
        $content = Get-Content $file -Raw
        
        # Replace hardcoded URLs with template literals using environment variable
        $content = $content -replace "fetch\('http://localhost:8000/api/", "fetch(`$($apiBaseVar)/api/"
        $content = $content -replace "fetch\(`http://localhost:8000/api/", "fetch(`$($apiBaseVar)/api/"
        $content = $content -replace 'url = ''http://localhost:8000/api/', "url = `$($apiBaseVar)/api/"
        
        # Write back
        Set-Content $file -Value $content -NoNewline
        
        Write-Host "✅ Fixed $file" -ForegroundColor Green
    }
}

Write-Host "🎯 All hardcoded URLs have been replaced with environment variables!" -ForegroundColor Green
Write-Host "Now redeploy to Vercel: vercel --prod" -ForegroundColor Cyan