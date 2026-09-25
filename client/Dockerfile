FROM node:20-alpine AS build

WORKDIR /app

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY --from=build /app /app

EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]