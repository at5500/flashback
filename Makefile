.PHONY: help start start-prod stop stop-prod restart restart-prod logs logs-backend logs-frontend logs-postgres build build-backend build-frontend push push-backend push-frontend pull clean clean-all

# Detect docker-compose command (v1 or v2)
ifeq ($(shell docker compose version 2>/dev/null),)
	DOCKER_COMPOSE := docker-compose
else
	DOCKER_COMPOSE := docker compose
endif

# Docker image names
BACKEND_IMAGE := at5500/flashback-backend:latest
FRONTEND_IMAGE := at5500/flashback-frontend:latest

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m

##@ General

help: ## Display this help
	@echo "FlashBack - Telegram Support System"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development (Build from Source)

start: ## Start application (build from source)
	@echo "$(GREEN)Starting FlashBack (development mode)...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env from .env.example...$(NC)"; \
		cp .env.example .env; \
	fi
	@$(DOCKER_COMPOSE) build
	@$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)✓ FlashBack is running!$(NC)"
	@echo "  Frontend:  http://localhost:8080"
	@echo "  Backend:   http://localhost:3000"
	@echo "  WebSocket: ws://localhost:3000"
	@echo ""
	@echo "Default credentials: op@example.com / 123456"

stop: ## Stop application (development)
	@echo "$(YELLOW)Stopping FlashBack (development)...$(NC)"
	@$(DOCKER_COMPOSE) down
	@echo "$(GREEN)✓ Stopped$(NC)"

restart: ## Restart application (development)
	@echo "$(YELLOW)Restarting FlashBack (development)...$(NC)"
	@$(DOCKER_COMPOSE) down
	@$(DOCKER_COMPOSE) build
	@$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)✓ Restarted$(NC)"

##@ Production (Pre-built Images)

start-prod: ## Start application with pre-built images from Docker Hub
	@echo "$(GREEN)Starting FlashBack (production mode)...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env from .env.example...$(NC)"; \
		cp .env.example .env; \
	fi
	@echo "$(YELLOW)Pulling latest images from Docker Hub...$(NC)"
	@$(DOCKER_COMPOSE) -f docker-compose.prod.yml pull
	@$(DOCKER_COMPOSE) -f docker-compose.prod.yml up -d
	@echo "$(GREEN)✓ FlashBack is running!$(NC)"
	@echo "  Frontend:  http://localhost:8080"
	@echo "  Backend:   http://localhost:3000"
	@echo "  WebSocket: ws://localhost:3000"
	@echo ""
	@echo "Default credentials: op@example.com / 123456"

stop-prod: ## Stop application (production)
	@echo "$(YELLOW)Stopping FlashBack (production)...$(NC)"
	@$(DOCKER_COMPOSE) -f docker-compose.prod.yml down
	@echo "$(GREEN)✓ Stopped$(NC)"

restart-prod: ## Restart application with latest images (production)
	@echo "$(YELLOW)Restarting FlashBack (production)...$(NC)"
	@$(DOCKER_COMPOSE) -f docker-compose.prod.yml down
	@echo "$(YELLOW)Pulling latest images...$(NC)"
	@$(DOCKER_COMPOSE) -f docker-compose.prod.yml pull
	@$(DOCKER_COMPOSE) -f docker-compose.prod.yml up -d
	@echo "$(GREEN)✓ Restarted with latest images$(NC)"

##@ Logs

logs: ## View logs from all services
	@$(DOCKER_COMPOSE) logs -f

logs-backend: ## View backend logs only
	@$(DOCKER_COMPOSE) logs -f backend

logs-frontend: ## View frontend logs only
	@$(DOCKER_COMPOSE) logs -f frontend

logs-postgres: ## View PostgreSQL logs only
	@$(DOCKER_COMPOSE) logs -f postgres

##@ Docker Images

build: build-backend build-frontend ## Build all Docker images

build-backend: ## Build backend Docker image
	@echo "$(GREEN)Building backend image...$(NC)"
	@docker build -t $(BACKEND_IMAGE) -f backend/Dockerfile .
	@echo "$(GREEN)✓ Backend image built$(NC)"

build-frontend: ## Build frontend Docker image
	@echo "$(GREEN)Building frontend image...$(NC)"
	@docker build -t $(FRONTEND_IMAGE) -f frontend/Dockerfile .
	@echo "$(GREEN)✓ Frontend image built$(NC)"

push: push-backend push-frontend ## Push all Docker images to Docker Hub

push-backend: ## Push backend image to Docker Hub
	@echo "$(GREEN)Pushing backend image to Docker Hub...$(NC)"
	@docker push $(BACKEND_IMAGE)
	@echo "$(GREEN)✓ Backend image pushed$(NC)"

push-frontend: ## Push frontend image to Docker Hub
	@echo "$(GREEN)Pushing frontend image to Docker Hub...$(NC)"
	@docker push $(FRONTEND_IMAGE)
	@echo "$(GREEN)✓ Frontend image pushed$(NC)"

pull: ## Pull latest images from Docker Hub
	@echo "$(GREEN)Pulling latest images from Docker Hub...$(NC)"
	@docker pull $(BACKEND_IMAGE)
	@docker pull $(FRONTEND_IMAGE)
	@echo "$(GREEN)✓ Images pulled$(NC)"

##@ Cleanup

clean: ## Stop and remove containers (keep volumes)
	@echo "$(YELLOW)Cleaning up containers...$(NC)"
	@$(DOCKER_COMPOSE) down
	@$(DOCKER_COMPOSE) -f docker-compose.prod.yml down
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

clean-all: ## Stop and remove containers and volumes (WARNING: deletes database!)
	@echo "$(RED)WARNING: This will delete all data including the database!$(NC)"
	@echo -n "Are you sure? [y/N] " && read ans && [ $${ans:-N} = y ]
	@$(DOCKER_COMPOSE) down -v
	@$(DOCKER_COMPOSE) -f docker-compose.prod.yml down -v
	@echo "$(GREEN)✓ Complete cleanup done$(NC)"

##@ Utilities

status: ## Show status of all containers
	@echo "$(GREEN)Development containers:$(NC)"
	@$(DOCKER_COMPOSE) ps || true
	@echo ""
	@echo "$(GREEN)Production containers:$(NC)"
	@$(DOCKER_COMPOSE) -f docker-compose.prod.yml ps || true

archive: ## Create project archive without sensitive data
	@./create_archive.sh