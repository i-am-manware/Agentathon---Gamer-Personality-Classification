FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p /app/data && chown node:node /app/data
USER node
ENV HOST=0.0.0.0 PORT=3000 DATABASE_PATH=/app/data/atlas.sqlite
EXPOSE 3000
CMD ["node", "--experimental-sqlite", "server.mjs"]
