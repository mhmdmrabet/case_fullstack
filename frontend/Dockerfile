# Step 1 scaffold: plain nginx serving the placeholder index.html.
# Step 7 swaps this for a multi-stage Vite build.
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
