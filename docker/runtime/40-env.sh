#!/bin/sh
set -eu

envsubst '${VITE_API_BASE_URL} ${VITE_APP_ENV}' \
  < /opt/runtime/env.js.template \
  > /usr/share/nginx/html/env.js

