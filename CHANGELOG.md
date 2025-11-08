# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of FlashBack - Telegram Support System
- Backend server built with Rust/Axum framework
- Telegram bot integration using teloxide library
- PostgreSQL database with StoreHaus ORM
- Real-time WebSocket communication via Watchtower
- React 18 + TypeScript frontend with shadcn/ui components
- Operator web interface for managing conversations
- Message templates system for quick responses
- JWT-based authentication and authorization
- Multi-language support (English/Russian)
- Docker Compose infrastructure setup
- Comprehensive documentation in English
- PWA support for mobile devices
- Admin panel for system configuration
- User profile management
- Conversation tagging and filtering
- Real-time notifications
- Message history with full context
- Archive creation script for code distribution

### Infrastructure
- PostgreSQL 15+ database
- Docker containerization
- Nginx for frontend serving
- Automated database migrations via StoreHaus
- Development and production configurations
- Pre-built Docker images on Docker Hub
  - `at5500/flashback-backend:latest`
  - `at5500/flashback-frontend:latest`
- Production deployment with `docker-compose.prod.yml`
- Makefile for unified command interface
  - Automatic docker-compose command detection (v1/v2 compatibility)
  - Organized targets for development and production workflows

### Documentation
- README with quick start guide
- API documentation (REST + WebSocket)
- System architecture overview
- Database schema documentation
- Tech stack details
- Quick start guide

[Unreleased]: https://github.com/yourusername/flashback/compare/v0.1.0...HEAD