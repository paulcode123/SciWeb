# Use an official Python runtime as the parent image
FROM python:3.8-slim

# Set the working directory in the container to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install any Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Define environment variable for Puppeteer
# Add --no-sandbox option for Puppeteer
# ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
# ENV PUPPETEER_ARGS='--no-sandbox,--disable-setuid-sandbox'


# Install Node.js and npm
# Install Node.js, npm, and system dependencies for Chromium
RUN apt-get update && \
    apt-get install -y wget gnupg ca-certificates procps libxss1 \
      libappindicator3-1 libasound2 libatk-bridge2.0-0 \
      libatspi2.0-0 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 \
      libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils \
      fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils \
      nodejs npm chromium --no-install-recommends && \
    npm install -g npm@latest && \
    npm install -g jupiter-api && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*



# Install Puppeteer package globally without its own Chromium
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD should be set to 'true' to skip Puppeteer's Chromium download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
RUN npm install -g puppeteer





# Make port 5000 available to the world outside this container
EXPOSE 5000

# Define environment variable for Puppeteer

RUN useradd -m myuser
# Switch to the new user
USER myuser

# Run app.py when the container launches
ENV FLASK_APP=main.py
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
