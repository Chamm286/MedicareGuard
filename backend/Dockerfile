FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/src ./src
COPY backend/scripts ./scripts
COPY database ./database

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["sh", "-c", "node scripts/migrate.js && if [ \"$SEED_ON_START\" = \"true\" ]; then node scripts/seed.js; fi && node src/index.js"]
