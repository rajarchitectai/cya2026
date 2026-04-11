FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cache layer)
COPY package.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
