# EC2 Setup Guide

## Prerequisites on EC2 Instance

1. **Install Docker and Docker Compose**

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install docker -y
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

2. **Clone the repository**

```bash
cd ~
git clone https://github.com/JorgeReact2020/moca-nest.git moca-hubspot
cd moca-hubspot
```

3. **Setup environment variables**

```bash
cp .env.production .env
nano .env
```

Update with secure credentials:
```
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=moca_user
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE
DB_DATABASE=moca_nest
```

4. **First deployment (manual)**

```bash
# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Seed the database (optional)
docker exec -it moca-container npm run seed
```

5. **Configure GitHub Secrets**

In your GitHub repository settings, add these secrets:
- `EC2_HOST` - Your EC2 public IP or domain
- `EC2_USER` - Usually `ec2-user`
- `EC2_KEY` - Your EC2 private key (PEM file contents)

## Security Group Settings

Make sure your EC2 Security Group allows:
- **Port 22** (SSH) - For GitHub Actions deployment
- **Port 3000** (HTTP) - For the application
- **Port 5432** (PostgreSQL) - Only if you need external database access (not recommended)

## Useful Commands

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f app
docker-compose logs -f postgres

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose down -v

# Access database
docker exec -it moca-postgres psql -U moca_user -d moca_nest

# Run seed inside container
docker exec -it moca-container npm run seed

# Access app container shell
docker exec -it moca-container sh
```

## Database Backups

### Create backup
```bash
docker exec moca-postgres pg_dump -U moca_user moca_nest > backup_$(date +%Y%m%d).sql
```

### Restore backup
```bash
cat backup_20231205.sql | docker exec -i moca-postgres psql -U moca_user -d moca_nest
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs app

# Check if database is accessible
docker exec -it moca-container ping postgres
```

### Database connection issues
```bash
# Check if postgres is running
docker-compose ps postgres

# Check postgres logs
docker-compose logs postgres

# Verify environment variables
docker exec moca-container env | grep DB_
```

### Application crashes
```bash
# Check application logs
docker-compose logs -f app

# Restart just the app
docker-compose restart app
```
