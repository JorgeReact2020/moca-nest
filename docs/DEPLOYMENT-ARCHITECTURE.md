# Deployment Architecture Summary

## Problem Solved
Your NestJS application was crashing on EC2 because it couldn't connect to PostgreSQL - the database didn't exist in the Docker container.

## Solution Implemented

### Architecture
```
┌─────────────────────────────────────┐
│          EC2 Instance               │
│                                     │
│  ┌─────────────────────────────┐  │
│  │  Docker Compose             │  │
│  │                             │  │
│  │  ┌──────────┐  ┌─────────┐ │  │
│  │  │PostgreSQL│  │ NestJS  │ │  │
│  │  │Container │◄─┤  App    │ │  │
│  │  │(Port 5432)│  │(Port 3000)│ │
│  │  └──────────┘  └─────────┘ │  │
│  │                             │  │
│  │  Volume: postgres-data      │  │
│  └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Components

1. **docker-compose.yml**
   - Orchestrates both PostgreSQL and app containers
   - Ensures database starts before app
   - Includes health checks
   - Persistent data storage with volumes

2. **.env.production**
   - Template for production environment variables
   - DB_HOST set to `postgres` (Docker Compose service name)
   - Secure credentials management

3. **Updated GitHub Actions Workflow**
   - Uses Docker Compose for deployment
   - Creates `.env` from template if missing
   - Comprehensive health checks
   - Automatic rollback on failure
   - Cleans up old Docker images

4. **Enhanced Dockerfile**
   - Added `curl` for health checks
   - Optimized for production

### Files Created/Modified

✅ `docker-compose.yml` - Multi-container orchestration
✅ `.env.production` - Production environment template
✅ `.github/workflows/main.yml` - Updated deployment workflow
✅ `Dockerfile` - Added curl for health checks
✅ `docs/EC2-SETUP.md` - Complete setup guide
✅ `README.md` - Updated with deployment instructions

### Benefits

1. **Persistent Database**: Data survives container restarts
2. **Automatic Startup**: Database starts with app
3. **Health Checks**: Ensures both services are ready
4. **Zero Downtime**: Docker Compose handles graceful restarts
5. **Easy Rollback**: Failed deployments automatically roll back
6. **Isolated Network**: Containers communicate securely
7. **Easy Backups**: Simple pg_dump commands

### Environment Variables

#### Local Development (.env)
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=oliveira
DB_PASSWORD=
DB_DATABASE=moca_nest
```

#### Production (.env on EC2)
```env
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=moca_user
DB_PASSWORD=secure_password
DB_DATABASE=moca_nest
```

### Deployment Flow

1. Push to main branch
2. GitHub Actions runs tests
3. SSH to EC2
4. Pull latest code
5. Docker Compose down (stop existing containers)
6. Build new image
7. Docker Compose up (start PostgreSQL + App)
8. Health checks (retry 6 times)
9. Success or rollback

### Next Steps

1. **On EC2**: Install Docker & Docker Compose (see EC2-SETUP.md)
2. **Setup .env**: Create and configure .env file with secure credentials
3. **First Deploy**: Run `docker-compose up -d` manually
4. **Seed Database**: Run `docker exec -it moca-container npm run seed`
5. **Configure GitHub Secrets**: Add EC2_HOST, EC2_USER, EC2_KEY
6. **Push to Main**: Automated deployments will work!

### Monitoring

```bash
# Check running services
docker-compose ps

# View app logs
docker-compose logs -f app

# View database logs
docker-compose logs -f postgres

# Check resource usage
docker stats
```

### Backup Strategy

```bash
# Daily backup (add to crontab)
0 2 * * * docker exec moca-postgres pg_dump -U moca_user moca_nest > /backup/db_$(date +\%Y\%m\%d).sql
```

### Cost Optimization

- PostgreSQL runs in a container (no RDS costs)
- Single EC2 instance for both services
- Persistent volumes prevent data loss
- Easy to migrate to RDS later if needed

## Alternative: AWS RDS

If you prefer managed database:
1. Create RDS PostgreSQL instance
2. Update .env with RDS endpoint
3. Remove postgres service from docker-compose.yml
4. Keep app service only

Cost: ~$15-30/month for small RDS instance vs free with container
