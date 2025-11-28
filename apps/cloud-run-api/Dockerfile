# Use official Node.js image
FROM node:20-slim

WORKDIR /srv
COPY package.json package-lock.json* ./
# Use npm install here to avoid requiring a local lockfile in the build context.
RUN npm install --omit=dev

COPY . .
EXPOSE 8080
CMD ["npm", "start"]
