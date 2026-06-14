# Risk Assessment Tool — Vercel Deployment Script
# Run this in PowerShell from: c:\software engineering\RiskAssessmentTool

# Step 1: Login (browser will open)
Write-Host "🔐 Logging into Vercel..." -ForegroundColor Cyan
vercel login

# Step 2: Set all environment variables for Production
Write-Host "`n📦 Setting Environment Variables on Vercel..." -ForegroundColor Cyan

$env_vars = @{
    "VITE_SUPABASE_URL"          = "https://qonedsvysgxxulbbfnhf.supabase.co"
    "VITE_SUPABASE_ANON_KEY"     = "sb_publishable_SflZjW2GjXHIurzIJaf6zw_UGLv81yI"
    "DATABASE_URL"               = "postgresql://postgres.qonedsvysgxxulbbfnhf:govardhan%4026@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres"
    "SUPABASE_URL"               = "https://qonedsvysgxxulbbfnhf.supabase.co"
    "SUPABASE_ANON_KEY"          = "sb_publishable_SflZjW2GjXHIurzIJaf6zw_UGLv81yI"
    "SUPABASE_SERVICE_KEY"       = "sb_secret_o8F7RvOcDxkXcV0XQfFlRg_6S7gfky4"
    "SECRET_KEY"                 = "risk-assessment-secret-key-2025"
    "JWT_SECRET_KEY"             = "jwt-risk-secret-key-2025"
}

foreach ($key in $env_vars.Keys) {
    $value = $env_vars[$key]
    Write-Host "  Setting $key..." -ForegroundColor Yellow
    vercel env add $key production --value "$value" --force 2>&1 | Out-Null
    vercel env add $key preview --value "$value" --force 2>&1 | Out-Null
}

Write-Host "`n✅ All env vars set!" -ForegroundColor Green

# Step 3: Deploy to production
Write-Host "`n🚀 Deploying to Vercel Production..." -ForegroundColor Cyan
vercel --prod

Write-Host "`n🎉 Deployment complete!" -ForegroundColor Green
