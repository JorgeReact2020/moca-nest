# Utiliser l'image Node officielle (version LTS)
FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier package.json et package-lock.json (ou yarn.lock)
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du projet
COPY . .

# Construire l'app NestJS
RUN npm run build

# Exposer le port de l'application
EXPOSE 3000

# Commande pour lancer l'app
CMD ["node", "dist/main.js"]
