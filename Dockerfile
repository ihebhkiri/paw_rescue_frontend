FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM nginx:stable-alpine
# Docker Desktop: Spring Boot on the host. Override for a backend container.
ENV API_UPSTREAM=http://host.docker.internal:8080
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/www /usr/share/nginx/html
EXPOSE 80
