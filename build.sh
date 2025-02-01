#!/bin/bash

# Cài đặt dependencies
npm install

# Cài đặt Playwright với các dependencies cần thiết
npx playwright install --with-deps

# Build dự án
npm run build
