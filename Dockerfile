FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY . .
ARG CARINSIGHT_API_ORIGIN
ENV CARINSIGHT_API_ORIGIN=$CARINSIGHT_API_ORIGIN
RUN npm run build
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
