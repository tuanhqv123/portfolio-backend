# Sử dụng image Playwright chính thức với Chromium
FROM mcr.microsoft.com/playwright:focal

# Thiết lập thư mục làm việc
WORKDIR /app

# Copy package files và cài đặt dependencies
COPY package*.json ./
RUN npm install --production

# Cài đặt các thư viện hệ thống cần thiết (đã có sẵn trong image Playwright)
# Không cần chạy apt-get vì image đã bao gồm

# Copy mã nguồn
COPY . .

# Build ứng dụng
RUN npm run build

# Khởi chạy ứng dụng
CMD ["npm", "start"]
