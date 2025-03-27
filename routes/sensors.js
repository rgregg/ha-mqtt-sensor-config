const express = require('express');
const mqtt = require('mqtt');
const router = express.Router();

// MQTT client connection
let client;
let mqttConnected = false;
let brokerUrl = '';

// MQTT connection function
function connectMQTT(url) {
  if (client) {
    client.end();
  }
  
  brokerUrl = url;
  console.log('Connecting to MQTT broker:', url);
  client = mqtt.connect(url, {
    keepalive: 60,
    reconnectPeriod: 5000,
    clean: true,
    clientId: `mqtt-sensor-config-${Math.random().toString(16).substring(2, 8)}`
  });
  
  client.on('connect', () => {
    mqttConnected = true;
    console.log('Connected to MQTT broker');
    
    // Subscribe to Home Assistant discovery topics
    client.subscribe('homeassistant/+/+/config', { qos: 1 }, (err) => {
      if (err) {
        console.error('Error subscribing to topics:', err);
      } else {
        console.log('Subscribed to homeassistant/+/+/config');
      }
    });
    
    client.subscribe('homeassistant/+/+/+/config', { qos: 1 }, (err) => {
      if (err) {
        console.error('Error subscribing to topics:', err);
      } else {
        console.log('Subscribed to homeassistant/+/+/+/config');
      }
    });
  });
  
  client.on('error', (err) => {
    mqttConnected = false;
    console.error('MQTT connection error:', err);
  });
  
  client.on('close', () => {
    mqttConnected = false;
    console.log('MQTT connection closed');
  });
  
  client.on('reconnect', () => {
    console.log('Attempting to reconnect to MQTT broker');
  });
  
  client.on('offline', () => {
    mqttConnected = false;
    console.log('MQTT client is offline');
  });
  
  // Setup message handler
  setupMessageHandler();
}

// Store for discovered sensors
const discoveredSensors = {};

// Handle incoming MQTT messages
function setupMessageHandler() {
  if (client) {
    client.on('message', (topic, message) => {
      console.log('Received message:', topic, message.toString());
      if (topic.includes('homeassistant') && topic.includes('/config')) {
        try {
          if (message.toString().trim() === '') {
            console.log('Empty config received (delete operation), ignoring');
            return;
          }
          
          const config = JSON.parse(message.toString());
          const topicParts = topic.split('/');
          var deviceType, deviceId, sensorName;
          
          if (topicParts.length == 4) {
            deviceType = topicParts[1]; // sensor, binary_sensor, etc.
            deviceId = topicParts[2];   // unique_id part
          } else if (topicParts.length == 5) {
            deviceType = topicParts[1]; // sensor, binary_sensor, etc.
            deviceId = topicParts[2];   // unique_id part
            sensorName = topicParts[3]; // name part
          }
          
          const sensorId = `${deviceType}_${deviceId}`;
          console.log(`Adding/updating sensor ${sensorId} to discoveredSensors`);
          
          discoveredSensors[sensorId] = {
            id: sensorId,
            deviceType,
            deviceId,
            config,
            topic,
            sensorName
          };
          
          console.log('Current discovered sensors:', Object.keys(discoveredSensors));
        } catch (err) {
          console.error('Error parsing sensor config:', err);
        }
      }
    });
  }
}

// Get connection status
router.get('/connection', (req, res) => {
  res.json({ connected: mqttConnected, broker: brokerUrl });
});

// Connect to MQTT broker
router.post('/connect', (req, res) => {
  const { broker } = req.body;
  
  if (!broker) {
    return res.status(400).json({ error: 'Broker URL is required' });
  }
  
  try {
    connectMQTT(broker);
    res.json({ success: true, message: 'Connection initiated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to connect', details: err.message });
  }
});

// Get all discovered sensors
router.get('/', (req, res) => {
  res.json(Object.values(discoveredSensors));
});

// Create new sensor
router.post('/', (req, res) => {
  if (!mqttConnected) {
    return res.status(400).json({ error: 'Not connected to MQTT broker' });
  }
  
  try {
    const { deviceType, deviceId, config } = req.body;
    
    if (!deviceType || !deviceId || !config) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Ensure required fields exist in config
    if (!config.name || !config.state_topic) {
      return res.status(400).json({ error: 'Config must include name and state_topic' });
    }
    
    // Create a unique ID for the sensor if not provided
    if (!config.unique_id) {
      config.unique_id = deviceId;
    }
    
    // Create discovery topic for this sensor
    const topic = `homeassistant/${deviceType}/${deviceId}/config`;
    
    // Publish config to MQTT broker with QoS 1 to ensure delivery
    client.publish(topic, JSON.stringify(config), { qos: 1 }, (err) => {
      if (err) {
        console.error('Error publishing to MQTT:', err);
      } else {
        console.log('Successfully published to MQTT with QoS 1');
      }
    });
    
    // Add to local cache
    const id = `${deviceType}_${deviceId}`;
    const sensor = {
      id,
      deviceType,
      deviceId,
      config,
      topic
    };
    discoveredSensors[id] = sensor;
    
    res.status(201).json({ success: true, sensor });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create sensor', details: err.message });
  }
});

// Get specific sensor by ID
router.get('/:id', (req, res) => {
  const sensor = discoveredSensors[req.params.id];
  
  if (!sensor) {
    return res.status(404).json({ error: 'Sensor not found' });
  }
  
  res.json(sensor);
});

// Update sensor configuration
router.put('/:id', (req, res) => {
  console.log('PUT request received for sensor ID:', req.params.id);
  console.log('Request body:', req.body);
  
  const sensor = discoveredSensors[req.params.id];
  
  if (!sensor) {
    console.log('Sensor not found in discoveredSensors');
    console.log('Available sensors:', Object.keys(discoveredSensors));
    return res.status(404).json({ error: 'Sensor not found' });
  }
  
  if (!mqttConnected) {
    console.log('Not connected to MQTT broker');
    return res.status(400).json({ error: 'Not connected to MQTT broker' });
  }
  
  try {
    const updatedConfig = req.body.config;
    console.log('Updated config:', updatedConfig);
    console.log('Publishing to topic:', sensor.topic);
    
    // Publish updated config with QoS 1 to ensure delivery
    client.publish(sensor.topic, JSON.stringify(updatedConfig), { qos: 1 }, (err) => {
      if (err) {
        console.error('Error publishing to MQTT:', err);
      } else {
        console.log('Successfully published to MQTT with QoS 1');
      }
    });
    
    // Update local cache
    sensor.config = updatedConfig;
    
    console.log('Sensor updated successfully');
    res.json({ success: true, sensor });
  } catch (err) {
    console.error('Error updating sensor:', err);
    res.status(500).json({ error: 'Failed to update sensor', details: err.message });
  }
});

// Delete sensor
router.delete('/:id', (req, res) => {
  const sensor = discoveredSensors[req.params.id];
  
  if (!sensor) {
    return res.status(404).json({ error: 'Sensor not found' });
  }
  
  if (!mqttConnected) {
    return res.status(400).json({ error: 'Not connected to MQTT broker' });
  }
  
  try {
    // Publish empty config to remove sensor with QoS 1
    client.publish(sensor.topic, '', { qos: 1 }, (err) => {
      if (err) {
        console.error('Error publishing delete to MQTT:', err);
      } else {
        console.log('Successfully published delete to MQTT with QoS 1');
      }
    });
    
    // Remove from local cache
    delete discoveredSensors[req.params.id];
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete sensor', details: err.message });
  }
});

module.exports = router;
