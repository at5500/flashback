.PHONY: help start start-prod stop stop-prod restart restart-prod logs logs-backend logs-frontend logs-postgres build build-backend build-frontend push push-backend push-frontend pull clean clean-all

SHELL := /bin/bash

# Detect docker-compose command (v1 or v2)
DC := $(shell if docker compose version &>/dev/null; then echo "docker compose"; else echo "docker-compose"; fi)

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
	@echo -e "$(GREEN)Starting FlashBack (development mode)...$(NC)"
	@if [ ! -f .env ]; then \
		echo -e "$(YELLOW)Creating .env from .env.example...$(NC)"; \
		cp .env.example .env; \
	fi
	@$(DC) build
	@$(DC) up -d
	@echo -e "$(GREEN)✓ FlashBack is running!$(NC)"
	@echo "  Frontend:  http://0.0.0.0:8080 (or http://<your-server-ip>:8080)"
	@echo "  Backend:   http://0.0.0.0:3000 (or http://<your-server-ip>:3000)"
	@echo "  WebSocket: ws://0.0.0.0:3000"
	@echo ""
	@echo "Default credentials: op@example.com / 123456"

stop: ## Stop application (development)
	@echo -e "$(YELLOW)Stopping FlashBack (development)...$(NC)"
	@$(DC) down
	@echo -e "$(GREEN)✓ Stopped$(NC)"

restart: ## Restart application (development)
	@echo -e "$(YELLOW)Restarting FlashBack (development)...$(NC)"
	@$(DC) down
	@$(DC) build
	@$(DC) up -d
	@echo -e "$(GREEN)✓ Restarted$(NC)"

##@ Production (Pre-built Images)

start-prod: ## Start application with pre-built images from Docker Hub
	@echo -e "$(GREEN)Starting FlashBack (production mode)...$(NC)"
	@if [ ! -f .env ]; then \
		echo -e "$(YELLOW)Creating .env from .env.example...$(NC)"; \
		cp .env.example .env; \
	fi
	@echo -e "$(YELLOW)Pulling latest images from Docker Hub...$(NC)"
	@$(DC) -f docker-compose.prod.yml pull
	@$(DC) -f docker-compose.prod.yml up -d
	@echo -e "$(GREEN)✓ FlashBack is running!$(NC)"
	@echo "  Frontend:  http://0.0.0.0:8080 (or http://<your-server-ip>:8080)"
	@echo "  Backend:   http://0.0.0.0:3000 (or http://<your-server-ip>:3000)"
	@echo "  WebSocket: ws://0.0.0.0:3000"
	@echo ""
	@echo "Default credentials: op@example.com / 123456"

stop-prod: ## Stop application (production)
	@echo -e "$(YELLOW)Stopping FlashBack (production)...$(NC)"
	@$(DC) -f docker-compose.prod.yml down
	@echo -e "$(GREEN)✓ Stopped$(NC)"

restart-prod: ## Restart application with latest images (production)
	@echo -e "$(YELLOW)Restarting FlashBack (production)...$(NC)"
	@$(DC) -f docker-compose.prod.yml down
	@echo -e "$(YELLOW)Pulling latest images...$(NC)"
	@$(DC) -f docker-compose.prod.yml pull
	@$(DC) -f docker-compose.prod.yml up -d
	@echo -e "$(GREEN)✓ Restarted with latest images$(NC)"

##@ Logs

logs: ## View logs from all services
	@$(DC) logs -f

logs-backend: ## View backend logs only
	@$(DC) logs -f backend

logs-frontend: ## View frontend logs only
	@$(DC) logs -f frontend

logs-postgres: ## View PostgreSQL logs only
	@$(DC) logs -f postgres

##@ Docker Images

build: build-backend build-frontend ## Build all Docker images

build-backend: ## Build backend Docker image
	@echo -e "$(GREEN)Building backend image...$(NC)"
	@docker build -t $(BACKEND_IMAGE) -f backend/Dockerfile .
	@echo -e "$(GREEN)✓ Backend image built$(NC)"

build-frontend: ## Build frontend Docker image
	@echo -e "$(GREEN)Building frontend image...$(NC)"
	@docker build -t $(FRONTEND_IMAGE) -f frontend/Dockerfile .
	@echo -e "$(GREEN)✓ Frontend image built$(NC)"

push: push-backend push-frontend ## Push all Docker images to Docker Hub

push-backend: ## Push backend image to Docker Hub
	@echo -e "$(GREEN)Pushing backend image to Docker Hub...$(NC)"
	@docker push $(BACKEND_IMAGE)
	@echo -e "$(GREEN)✓ Backend image pushed$(NC)"

push-frontend: ## Push frontend image to Docker Hub
	@echo -e "$(GREEN)Pushing frontend image to Docker Hub...$(NC)"
	@docker push $(FRONTEND_IMAGE)
	@echo -e "$(GREEN)✓ Frontend image pushed$(NC)"

pull: ## Pull latest images from Docker Hub
	@echo -e "$(GREEN)Pulling latest images from Docker Hub...$(NC)"
	@docker pull $(BACKEND_IMAGE)
	@docker pull $(FRONTEND_IMAGE)
	@echo -e "$(GREEN)✓ Images pulled$(NC)"

##@ Cleanup

clean: ## Stop and remove containers (keep volumes)
	@echo -e "$(YELLOW)Cleaning up containers...$(NC)"
	@$(DC) down || true
	@$(DC) -f docker-compose.prod.yml down || true
	@echo -e "$(GREEN)✓ Cleanup complete$(NC)"

clean-all: ## Stop and remove containers and volumes (WARNING: deletes database!)
	@echo -e "$(RED)WARNING: This will delete all data including the database!$(NC)"
	@echo -n "Are you sure? [y/N] " && read ans && [ $${ans:-N} = y ]
	@$(DC) down -v
	@$(DC) -f docker-compose.prod.yml down -v
	@echo -e "$(GREEN)✓ Complete cleanup done$(NC)"

##@ Utilities

status: ## Show status of all containers
	@echo -e "$(GREEN)Development containers:$(NC)"
	@$(DC) ps || true
	@echo ""
	@echo -e "$(GREEN)Production containers:$(NC)"
	@$(DC) -f docker-compose.prod.yml ps || true

archive: ## Create project archive without sensitive data
	@./create_archive.sh