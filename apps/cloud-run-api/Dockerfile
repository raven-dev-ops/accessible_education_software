# Use official Node.js image
FROM node:20-slim

WORKDIR /srv
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .
EXPOSE 8080
CMD ["npm", "start"]
