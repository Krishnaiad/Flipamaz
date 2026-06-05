FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN if [ -d prisma ]; then npx prisma generate; fi

EXPOSE 4006

CMD ["node", "server.js"]
