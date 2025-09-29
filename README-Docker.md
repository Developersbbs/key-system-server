# Docker Setup for Node.js + MongoDB

This guide explains how to run your Node.js application with MongoDB using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed

## Quick Start

### Option 1: Production Setup

1. **Build and run the application with MongoDB:**
   ```bash
   docker-compose up --build
   ```

2. **Run in detached mode (background):**
   ```bash
   docker-compose up -d --build
   ```

3. **Stop the services:**
   ```bash
   docker-compose down
   ```

### Option 2: Development Setup (with hot reload)

1. **Run development environment:**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

2. **Run in detached mode:**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d --build
   ```

## Environment Variables

The Docker setup uses these environment variables:

- `MONGO_URI`: MongoDB connection string (automatically set for Docker)
- `PORT`: Application port (default: 5001)
- `NODE_ENV`: Environment mode (production/development)

### Using Custom Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.docker .env
   ```

2. Edit `.env` with your actual values:
   ```bash
   nano .env
   ```

3. Update `docker-compose.yml` to use your `.env` file:
   ```yaml
   services:
     app:
       env_file:
         - .env
   ```

## MongoDB Configuration

### Default Credentials
- **Username:** admin
- **Password:** password123
- **Database:** keydb
- **Port:** 27017

### Connecting from Host Machine

You can connect to MongoDB from your host machine using:
```bash
mongosh "mongodb://admin:password123@localhost:27017/keydb?authSource=admin"
```

### MongoDB Data Persistence

MongoDB data is persisted in Docker volumes:
- Production: `mongodb_data`
- Development: `mongodb_dev_data`

To remove all data:
```bash
docker-compose down -v
```

## Useful Commands

### View Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs app
docker-compose logs mongodb

# Follow logs
docker-compose logs -f app
```

### Execute Commands in Containers
```bash
# Access Node.js container
docker-compose exec app sh

# Access MongoDB container
docker-compose exec mongodb mongosh

# Run npm commands
docker-compose exec app npm install
docker-compose exec app npm run dev
```

### Rebuild Services
```bash
# Rebuild specific service
docker-compose build app

# Rebuild all services
docker-compose build

# Force rebuild (no cache)
docker-compose build --no-cache
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Check what's using the port
   lsof -i :5001
   lsof -i :27017
   
   # Kill the process or change ports in docker-compose.yml
   ```

2. **MongoDB connection failed:**
   - Ensure MongoDB container is running: `docker-compose ps`
   - Check MongoDB logs: `docker-compose logs mongodb`
   - Verify connection string in environment variables

3. **Application won't start:**
   - Check application logs: `docker-compose logs app`
   - Ensure all required environment variables are set
   - Verify Dockerfile builds successfully: `docker build -t test .`

4. **Permission issues:**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   ```

### Reset Everything
```bash
# Stop all containers and remove volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Clean up Docker system
docker system prune -a
```

## Production Deployment

For production deployment:

1. **Use environment-specific compose file:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Set secure passwords:**
   - Change MongoDB credentials
   - Use Docker secrets for sensitive data
   - Enable MongoDB authentication

3. **Use external MongoDB:**
   - Update `MONGO_URI` to point to external MongoDB
   - Remove MongoDB service from docker-compose.yml

## Network Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Node.js App   │    │    MongoDB      │
│   Port: 5001    │◄──►│   Port: 27017   │
│                 │    │                 │
└─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Host Machine  │
│   localhost:5001│
└─────────────────┘
```

Both services run in the same Docker network and can communicate using service names (`mongodb`, `app`).
