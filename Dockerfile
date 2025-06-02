FROM mcr.microsoft.com/playwright:v1.52.0-jammy

WORKDIR /app

COPY backend/package*.json ./

RUN npm install

COPY backend .

EXPOSE 5000

CMD ["npm", "start"]
