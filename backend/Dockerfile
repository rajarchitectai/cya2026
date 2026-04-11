FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Railway injects PORT dynamically — no hardcoded EXPOSE
CMD ["node", "src/server.js"]
