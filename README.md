# MQTT Sensor Config

A web application to configure and manage MQTT sensors for Home Assistant.

## Features

- Connect to any MQTT broker
- Discover and list MQTT sensors configured in Home Assistant
- View and edit sensor configurations
- Update or delete sensors directly from the UI

## Installation

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

ISC