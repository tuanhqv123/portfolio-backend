# Sử dụng image chính thức của Playwright với Chromium đã được cài đặt
FROM mcr.microsoft.com/playwright:focal

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy toàn bộ mã nguồn
COPY . .

# Build ứng dụng (nếu cần)
RUN npm run build

# Khởi chạy ứng dụng
CMD ["npm", "start"]
