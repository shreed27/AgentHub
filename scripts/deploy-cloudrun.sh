#!/bin/bash

# Collesium Trading Platform - Google Cloud Run Deployment Script
# This script deploys all backend services to Google Cloud Run

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Collesium Trading Platform - Google Cloud Run Deployment        ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration - Change these for your deployment
PROJECT_ID="${GCP_PROJECT_ID:-collesium-trading}"
REGION="${GCP_REGION:-us-central1}"
PROJECT_ROOT=$(pwd)

# Service configurations
declare -A SERVICES=(
    ["gateway"]="apps/gateway|4000|1|10|512Mi|1"
    ["orchestrator"]="trading-orchestrator|4001|0|5|512Mi|1"
    ["agent-dex"]="agent-dex-main/api|3001|0|5|256Mi|1"
    ["openclaw"]="openclaw-sidex-kit-main|3003|0|5|256Mi|1"
    ["cloddsbot"]="CloddsBot-main|18789|0|3|1Gi|1"
)

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"

    # Check gcloud CLI
    if ! command -v gcloud &> /dev/null; then
        echo -e "${RED}❌ gcloud CLI not found. Please install: https://cloud.google.com/sdk/docs/install${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ gcloud CLI installed${NC}"

    # Check if logged in
    if ! gcloud auth print-identity-token &> /dev/null 2>&1; then
        echo -e "${RED}❌ Not logged in to gcloud. Please run: gcloud auth login${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ gcloud authenticated${NC}"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}⚠️  Docker not found. Cloud Build will be used instead.${NC}"
    else
        echo -e "${GREEN}✅ Docker installed${NC}"
    fi

    echo ""
}

# Setup project
setup_project() {
    echo -e "${BLUE}Setting up Google Cloud project...${NC}"

    # Set project
    gcloud config set project "$PROJECT_ID" 2>/dev/null || {
        echo -e "${YELLOW}Creating project $PROJECT_ID...${NC}"
        gcloud projects create "$PROJECT_ID" --name="Collesium Trading" 2>/dev/null || true
        gcloud config set project "$PROJECT_ID"
    }

    # Set region
    gcloud config set run/region "$REGION"

    # Enable APIs
    echo -e "${BLUE}Enabling required APIs...${NC}"
    gcloud services enable run.googleapis.com --quiet
    gcloud services enable cloudbuild.googleapis.com --quiet
    gcloud services enable artifactregistry.googleapis.com --quiet

    echo -e "${GREEN}✅ Project configured${NC}"
    echo ""
}

# Deploy a single service
deploy_service() {
    local service_name=$1
    local config=${SERVICES[$service_name]}

    # Parse config
    IFS='|' read -r service_dir port min_instances max_instances memory cpu <<< "$config"

    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🚀 Deploying $service_name${NC}"
    echo -e "${CYAN}   Directory: $service_dir${NC}"
    echo -e "${CYAN}   Port: $port | Memory: $memory | CPU: $cpu${NC}"
    echo -e "${CYAN}   Instances: $min_instances - $max_instances${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    cd "$PROJECT_ROOT/$service_dir"

    # Check if Dockerfile exists
    if [ ! -f "Dockerfile" ]; then
        echo -e "${RED}❌ Dockerfile not found in $service_dir${NC}"
        return 1
    fi

    # Deploy using gcloud run deploy with source
    gcloud run deploy "$service_name" \
        --source . \
        --port "$port" \
        --allow-unauthenticated \
        --min-instances "$min_instances" \
        --max-instances "$max_instances" \
        --memory "$memory" \
        --cpu "$cpu" \
        --set-env-vars "NODE_ENV=production,PORT=$port" \
        --timeout 300s \
        --concurrency 80 \
        --quiet

    if [ $? -eq 0 ]; then
        # Get the service URL
        local service_url=$(gcloud run services describe "$service_name" --format="value(status.url)" 2>/dev/null)
        echo -e "${GREEN}✅ $service_name deployed successfully${NC}"
        echo -e "${GREEN}   URL: $service_url${NC}"

        # Store URL for later use
        echo "$service_name=$service_url" >> "$PROJECT_ROOT/.cloudrun-urls"
    else
        echo -e "${RED}❌ Failed to deploy $service_name${NC}"
        return 1
    fi

    cd "$PROJECT_ROOT"
}

# Update service with environment variables
update_service_env() {
    local service_name=$1
    local env_vars=$2

    echo -e "${BLUE}Updating $service_name environment variables...${NC}"

    gcloud run services update "$service_name" \
        --update-env-vars "$env_vars" \
        --quiet

    echo -e "${GREEN}✅ $service_name environment updated${NC}"
}

# Deploy all services
deploy_all() {
    # Remove old URLs file
    rm -f "$PROJECT_ROOT/.cloudrun-urls"

    # Deploy in order (gateway first as primary, then others)
    local deploy_order=("gateway" "orchestrator" "agent-dex" "openclaw" "cloddsbot")

    for service in "${deploy_order[@]}"; do
        deploy_service "$service"
    done
}

# Configure service URLs (after all services are deployed)
configure_service_urls() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Configuring service URLs...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Read URLs
    local gateway_url=$(gcloud run services describe gateway --format="value(status.url)" 2>/dev/null)
    local orchestrator_url=$(gcloud run services describe orchestrator --format="value(status.url)" 2>/dev/null)
    local cloddsbot_url=$(gcloud run services describe cloddsbot --format="value(status.url)" 2>/dev/null)
    local agent_dex_url=$(gcloud run services describe agent-dex --format="value(status.url)" 2>/dev/null)
    local openclaw_url=$(gcloud run services describe openclaw --format="value(status.url)" 2>/dev/null)

    # Update gateway with all service URLs
    if [ -n "$gateway_url" ]; then
        update_service_env "gateway" "\
ORCHESTRATOR_URL=$orchestrator_url,\
CLODDSBOT_URL=$cloddsbot_url,\
AGENT_DEX_URL=$agent_dex_url,\
OPENCLAW_URL=$openclaw_url,\
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com"
    fi

    # Update orchestrator
    if [ -n "$orchestrator_url" ]; then
        update_service_env "orchestrator" "\
CLODDSBOT_URL=$cloddsbot_url,\
AGENT_DEX_URL=$agent_dex_url,\
OPENCLAW_URL=$openclaw_url,\
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com"
    fi

    echo ""
}

# Print summary
print_summary() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    Deployment Complete! 🎉                         ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    echo -e "${GREEN}Deployed Services:${NC}"
    echo ""

    gcloud run services list --format="table(SERVICE,REGION,URL,LAST_DEPLOYED_BY)"

    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "  1. Set sensitive environment variables (API keys, secrets):"
    echo "     gcloud run services update <service> --set-env-vars KEY=VALUE"
    echo ""
    echo "  2. Deploy frontend to Vercel:"
    echo "     cd trading-frontend && npx vercel --prod"
    echo ""
    echo "  3. Configure Vercel environment variables:"
    local gateway_url=$(gcloud run services describe gateway --format="value(status.url)" 2>/dev/null)
    echo "     NEXT_PUBLIC_GATEWAY_URL=$gateway_url"
    echo "     NEXT_PUBLIC_WS_URL=${gateway_url/https:/wss:}"
    echo ""
    echo "  4. Test health endpoints:"
    echo "     curl $gateway_url/api/v1/health"
    echo ""
    echo -e "${BLUE}See DEPLOYMENT-CLOUDRUN.md for detailed documentation.${NC}"
}

# Show help
show_help() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  all         Deploy all services (default)"
    echo "  setup       Setup project and enable APIs only"
    echo "  service     Deploy a single service"
    echo "  urls        Configure service URLs"
    echo "  status      Show deployment status"
    echo "  logs        View service logs"
    echo "  help        Show this help"
    echo ""
    echo "Options:"
    echo "  --project   GCP project ID (default: collesium-trading)"
    echo "  --region    GCP region (default: us-central1)"
    echo ""
    echo "Examples:"
    echo "  $0 all                           # Deploy all services"
    echo "  $0 service gateway               # Deploy only gateway"
    echo "  $0 status                        # Show deployment status"
    echo "  $0 logs gateway --limit 50       # View gateway logs"
    echo ""
}

# View logs
view_logs() {
    local service=$1
    shift
    gcloud run logs read "$service" "$@"
}

# Show status
show_status() {
    echo -e "${BLUE}Cloud Run Services Status:${NC}"
    echo ""
    gcloud run services list --format="table(SERVICE,REGION,URL,STATUS)"
}

# Main
main() {
    local command=${1:-all}
    shift || true

    case $command in
        all)
            check_prerequisites
            setup_project
            deploy_all
            configure_service_urls
            print_summary
            ;;
        setup)
            check_prerequisites
            setup_project
            ;;
        service)
            check_prerequisites
            deploy_service "$1"
            ;;
        urls)
            configure_service_urls
            ;;
        status)
            show_status
            ;;
        logs)
            view_logs "$@"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}Unknown command: $command${NC}"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
