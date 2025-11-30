FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies for the monorepo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci

# Copy the full source and build the web app
COPY . .
RUN npm --workspace apps/web run build

FROM node:18-alpine

WORKDIR /app
ENV NODE_ENV=production

# Copy the built app and node_modules from the builder
COPY --from=builder /app ./

# Cloud Run and Kubernetes both pass the port via $PORT
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "--workspace", "apps/web", "run", "start", "--", "-H", "0.0.0.0", "-p", "8080"]

