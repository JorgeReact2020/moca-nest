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
cp .env.production.example .env
nano .env
```

Update with your credentials:

```
HUBSPOT_API_KEY=your_hubspot_api_key
HUBSPOT_WEBHOOK_SECRET=your_webhook_secret
MOCA_API_KEY=your_moca_api_key
APP_ID=your_app_id
```

4. **First deployment (manual)**

```bash
# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
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

## Useful Commands

```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f app

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Access app container shell
docker exec -it moca-container sh
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs app
```

### Application crashes

```bash
# Check application logs
docker-compose logs -f app

# Restart the app
docker-compose restart app
```
