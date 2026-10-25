FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_MOCK=1
ENV NEXT_PUBLIC_MOCK=$NEXT_PUBLIC_MOCK
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
