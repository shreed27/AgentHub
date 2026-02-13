#!/bin/bash

# Collesium Trading Platform - Full Google Cloud Run Deployment Script
# This script deploys ALL services including frontend to Google Cloud Run

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
echo -e "${CYAN}║   Collesium Trading Platform - Full Cloud Run Deployment          ║${NC}"
echo -e "${CYAN}║              (Backend + Frontend on Google Cloud)                  ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration - Change these for your deployment
PROJECT_ID="${GCP_PROJECT_ID:-collesium-trading}"
REGION="${GCP_REGION:-us-central1}"
PROJECT_ROOT=$(pwd)

# Service configurations: service_name|directory|port|min_instances|max_instances|memory|cpu
SERVICES=(
    "gateway|apps/gateway|4000|1|10|1Gi|2"
    "orchestrator|trading-orchestrator|4001|0|5|1Gi|2"
    "agent-dex|agent-dex-main/api|3001|0|5|256Mi|1"
    "openclaw|openclaw-sidex-kit-main|3003|0|5|256Mi|1"
    "cloddsbot|CloddsBot-main|18789|0|3|1Gi|2"
    "frontend|trading-frontend|3000|1|10|1Gi|1"
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
    # This check can be flaky depending on versions, so just warn if fails
    if ! gcloud auth print-identity-token &> /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Not logged in to gcloud or auth check failed. Please run 'gcloud auth login' if deployment fails.${NC}"
    else
        echo -e "${GREEN}✅ gcloud authenticated${NC}"
    fi

    echo ""
}

# Setup project
setup_project() {
    echo -e "${BLUE}Setting up Google Cloud project...${NC}"

    # Set project (try to create if doesn't exist, ignore if it does or if user lacks permissions)
    if gcloud projects describe "$PROJECT_ID" &>/dev/null; then
        echo -e "${GREEN}✅ Project $PROJECT_ID exists${NC}"
    else
        echo -e "${YELLOW}Creating project $PROJECT_ID...${NC}"
        gcloud projects create "$PROJECT_ID" --name="Collesium Trading" 2>/dev/null || echo -e "${YELLOW}⚠️  Could not create project. Assuming it exists or permissions restricted.${NC}"
    fi
    
    gcloud config set project "$PROJECT_ID"
    
    # Set region
    gcloud config set run/region "$REGION"

    # Enable APIs
    echo -e "${BLUE}Enabling required APIs...${NC}"
    gcloud services enable run.googleapis.com --quiet || echo -e "${YELLOW}⚠️  Failed to enable run API. Proceeding anyway...${NC}"
    gcloud services enable cloudbuild.googleapis.com --quiet || echo -e "${YELLOW}⚠️  Failed to enable cloudbuild API. Proceeding anyway...${NC}"
    gcloud services enable artifactregistry.googleapis.com --quiet || echo -e "${YELLOW}⚠️  Failed to enable artifactregistry API. Proceeding anyway...${NC}"

    echo -e "${GREEN}✅ Project configured${NC}"
    echo ""
}

# Get config for a service name
get_service_config() {
    local target_name=$1
    for config in "${SERVICES[@]}"; do
        IFS='|' read -r s_name s_dir s_port s_min s_max s_mem s_cpu <<< "$config"
        if [ "$s_name" == "$target_name" ]; then
            echo "$config"
            return
        fi
    done
}

# Deploy a single service
deploy_service() {
    local service_name=$1
    local config=$(get_service_config "$service_name")
    
    if [ -z "$config" ]; then
        echo -e "${RED}❌ Configuration not found for service: $service_name${NC}"
        return 1
    fi

    # Parse config
    IFS='|' read -r s_name service_dir port min_instances max_instances memory cpu <<< "$config"

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
        cd "$PROJECT_ROOT"
        return 1
    fi

    # Prepare env vars
    local env_vars="NODE_ENV=production"
    
    if [ "$service_name" == "gateway" ]; then
        env_vars="$env_vars,SOLANA_RPC_URL=https://api.mainnet-beta.solana.com,ESCROW_WALLET_ADDRESS=11111111111111111111111111111111,TREASURY_WALLET_ADDRESS=11111111111111111111111111111111,ESCROW_PRIVATE_KEY=382ssqW2c2yv3tq2s1q2s1q2s1q2s1q2,JWT_SECRET=temporary_secret_key_change_me"
    elif [ "$service_name" == "cloddsbot" ]; then
        env_vars="$env_vars,ANTHROPIC_API_KEY=sk-ant-placeholder"
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
        --set-env-vars "$env_vars" \
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
        cd "$PROJECT_ROOT"
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

    # Deploy in order
    local deploy_order=("gateway" "orchestrator" "agent-dex" "openclaw" "cloddsbot" "frontend")

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
    local frontend_url=$(gcloud run services describe frontend --format="value(status.url)" 2>/dev/null)

    # Update gateway with all service URLs and frontend CORS
    if [ -n "$gateway_url" ]; then
        update_service_env "gateway" "\
ORCHESTRATOR_URL=$orchestrator_url,\
CLODDSBOT_URL=$cloddsbot_url,\
AGENT_DEX_URL=$agent_dex_url,\
OPENCLAW_URL=$openclaw_url,\
CORS_ORIGINS=$frontend_url,\
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

    # Update frontend with gateway URL
    if [ -n "$frontend_url" ] && [ -n "$gateway_url" ]; then
        local ws_url="${gateway_url/https:/wss:}"
        update_service_env "frontend" "\
NEXT_PUBLIC_GATEWAY_URL=$gateway_url,\
NEXT_PUBLIC_WS_URL=$ws_url,\
NEXT_PUBLIC_DEMO_MODE=false"
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
    local frontend_url=$(gcloud run services describe frontend --format="value(status.url)" 2>/dev/null)
    local gateway_url=$(gcloud run services describe gateway --format="value(status.url)" 2>/dev/null)
    
    echo -e "${GREEN}🌐 Your Application URLs:${NC}"
    echo -e "${CYAN}   Frontend:${NC} $frontend_url"
    echo -e "${CYAN}   Gateway API:${NC} $gateway_url"
    echo ""
    
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "  1. Set sensitive environment variables (API keys, secrets):"
    echo "     gcloud run services update cloddsbot --set-env-vars ANTHROPIC_API_KEY=sk-ant-xxx"
    echo "     gcloud run services update orchestrator --set-env-vars SOLANA_PRIVATE_KEY=xxx"
    echo ""
    echo "  2. Test your application:"
    echo "     Frontend: $frontend_url"
    echo "     Health:   curl $gateway_url/api/v1/health"
    echo ""
    echo "  3. Monitor costs:"
    echo "     gcloud billing budgets list"
    echo ""
    echo -e "${BLUE}See DEPLOYMENT-CLOUDRUN.md for detailed documentation.${NC}"
}

# Show help
show_help() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  all         Deploy all services including frontend (default)"
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
    echo "  $0 all                           # Deploy all services + frontend"
    echo "  $0 service frontend              # Deploy only frontend"
    echo "  $0 status                        # Show deployment status"
    echo "  $0 logs frontend --limit 50      # View frontend logs"
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
