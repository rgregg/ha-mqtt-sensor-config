# MQTT Sensor Config

A web application to configure and manage MQTT sensors for Home Assistant.

## Features

- Connect to any MQTT broker
- Discover and list MQTT sensors configured in Home Assistant
- View and edit sensor configurations
- Update or delete sensors directly from the UI

## Docker Setup

This application can be run using Docker:

### Using Docker Compose (recommended)

1. Clone this repository
2. Start the application and optional MQTT broker:
   ```bash
   docker-compose up -d
   ```
3. Access the web interface at http://localhost:3000

The docker-compose setup includes:
- The main application on port 3000
- An optional Mosquitto MQTT broker on port 1883

### Using Docker without Compose

1. Build the Docker image:
   ```bash
   docker build -t mqtt-sensor-config .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 -d mqtt-sensor-config
   ```

3. Access the web interface at http://localhost:3000

## Standard Installation

If you prefer to run the application without Docker:

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Start the application:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The application will be available at http://localhost:3000.

## Configuration

1. Connect to your MQTT broker by entering the broker URL (e.g., `mqtt://your-broker-ip:1883`)
2. The application will automatically discover MQTT sensors configured in Home Assistant
3. Use the UI to view and edit sensor configurations

## Technologies Used

- Node.js
- Express
- MQTT.js
- Bootstrap 5
- EJS templates

## License

MIT