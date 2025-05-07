#!/bin/bash

# Script for first-time deployment of the Nova Sonic Voice Assistant application
# This handles the two-phase deployment needed for Cognito environment variables

echo "=== Starting first-time deployment process ==="

# Step 1: Install dependencies
echo "=== Installing dependencies ==="
npm run installall

# Step 2: Build all components
echo "=== Building components ==="
npm run build

# Step 3: Deploy the initial infrastructure
echo "=== Deploying infrastructure (first pass) ==="
cd infra && npx cdk deploy --require-approval never
cd ..

# Step 4: Update environment variables with Cognito settings
echo "=== Updating environment variables ==="
npm run update-env

# Step 5: Rebuild with the new environment variables
echo "=== Rebuilding with updated environment variables ==="
npm run build

# Step 6: Deploy the final infrastructure
echo "=== Deploying infrastructure (final pass) ==="
cd infra && npx cdk deploy --require-approval never
cd ..

# Try to get the CloudFront URL from the stack outputs, but don't fail if it's not available
CLOUDFRONT_URL=$(aws cloudformation describe-stacks --stack-name SmartTodoNovaStack --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" --output text 2>/dev/null || echo "Check CloudFormation console for URL")

# Print a colorful success message with structured information
echo ""
echo -e "\033[1;32m┌───────────────────────────────────────────────────────────────┐\033[0m"
echo -e "\033[1;32m│                                                               │\033[0m"
echo -e "\033[1;32m│             DEPLOYMENT COMPLETED SUCCESSFULLY                 │\033[0m"
echo -e "\033[1;32m│                                                               │\033[0m"
echo -e "\033[1;32m└───────────────────────────────────────────────────────────────┘\033[0m"
echo ""
echo -e "\033[1;36m APPLICATION DETAILS \033[0m"
echo -e "\033[1;36m ───────────────────────────────────────────────────────────────\033[0m"
echo -e "\033[1;33m • Name:    \033[0m Nova Sonic Voice Assistant"
echo -e "\033[1;33m • Status:  \033[0m Ready to use"
echo -e "\033[1;33m • URL:     \033[0m ${CLOUDFRONT_URL}"
echo ""
echo -e "\033[1;36m NEXT STEPS \033[0m"
echo -e "\033[1;36m ───────────────────────────────────────────────────────────────\033[0m"
echo -e "\033[0m 1. Access the application using the CloudFront URL above"
echo -e "\033[0m 2. Sign up for a new account"
echo -e "\033[0m 3. Try out the voice assistant functionality with Amazon Nova Sonic"
echo ""
