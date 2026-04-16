#!/bin/bash
echo "🔨 Building Lunja CRM..."
npm run build

echo "📦 Zipping dist folder..."
cd dist
zip -r ../lunja-crm-deploy.zip .
cd ..

echo "✅ Done! Upload lunja-crm-deploy.zip to Hostinger:"
echo "   hPanel → File Manager → subdomain folder → Upload & Extract"
echo ""
echo "File ready: lunja-crm-deploy.zip"
