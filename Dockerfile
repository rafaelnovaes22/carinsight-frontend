FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts || npm install --ignore-scripts
COPY . .
RUN npm install -g serve
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["npx", "serve", ".", "-l", "8080"]
