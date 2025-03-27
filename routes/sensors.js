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
    
    // Subscribe to all possible Home Assistant discovery topic formats
    const topicPatterns = [
      'homeassistant/+/+/config',         // Standard format: homeassistant/{device_type}/{device_id}/config
      'homeassistant/+/+/+/config',       // With sensor name: homeassistant/{device_type}/{device_id}/{sensor_name}/config
      'homeassistant/+/config',           // Direct format: homeassistant/{unique_id}/config
      'homeassistant/+/+/state'           // State topics for monitoring
    ];
    
    topicPatterns.forEach(pattern => {
      client.subscribe(pattern, { qos: 1 }, (err) => {
        if (err) {
          console.error(`Error subscribing to ${pattern}:`, err);
        } else {
          console.log(`Subscribed to ${pattern}`);
        }
      });
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
      
      // Skip state topics for now
      if (topic.endsWith('/state')) {
        return;
      }
      
      // Only process config topics
      if (topic.includes('homeassistant') && topic.includes('/config')) {
        try {
          if (message.toString().trim() === '') {
            console.log('Empty config received (delete operation), ignoring');
            return;
          }
          
          const config = JSON.parse(message.toString());
          const topicParts = topic.split('/');
          let deviceType, deviceId, sensorName, sensorId;
          
          // Determine the format based on topic structure
          // Format: homeassistant/{device_type}/{device_id}/config
          if (topicParts.length === 4 && topicParts[0] === 'homeassistant' && topicParts[3] === 'config') {
            deviceType = topicParts[1];
            deviceId = topicParts[2];
            sensorId = `${deviceType}_${deviceId}`;
          } 
          // Format: homeassistant/{device_type}/{device_id}/{sensor_name}/config
          else if (topicParts.length === 5 && topicParts[0] === 'homeassistant' && topicParts[4] === 'config') {
            deviceType = topicParts[1];
            deviceId = topicParts[2];
            sensorName = topicParts[3];
            sensorId = `${deviceType}_${deviceId}_${sensorName}`;
          }
          // Format: homeassistant/{unique_id}/config
          else if (topicParts.length === 3 && topicParts[0] === 'homeassistant' && topicParts[2] === 'config') {
            // For this format, use the unique_id directly
            deviceType = 'custom'; // Default type for this format
            deviceId = topicParts[1];
            sensorId = deviceId;
            
            // If the config has a device_class, use it as the device type
            if (config.device_class) {
              deviceType = config.device_class;
              sensorId = `${deviceType}_${deviceId}`;
            }
          } else {
            console.log('Unrecognized topic format:', topic);
            return;
          }
          
          // Try to get a better device type from the config if not available
          if (!deviceType || deviceType === 'custom') {
            if (config.device_class) {
              deviceType = config.device_class;
            } else if (config.state_topic && config.state_topic.includes('/')) {
              // Try to infer from state topic
              const stateTopicParts = config.state_topic.split('/');
              if (stateTopicParts.length > 1) {
                const potentialType = stateTopicParts[stateTopicParts.length - 2];
                if (['sensor', 'binary_sensor', 'switch', 'light', 'climate', 'cover'].includes(potentialType)) {
                  deviceType = potentialType;
                }
              }
            }
          }
          
          console.log(`Adding/updating sensor ${sensorId} to discoveredSensors`);
          
          // Store the sensor info
          discoveredSensors[sensorId] = {
            id: sensorId,
            deviceType: deviceType || 'custom',
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
    const { deviceType, deviceId, sensorName, config, topicFormat } = req.body;
    
    if (!deviceId || !config) {
      return res.status(400).json({ error: 'Missing required fields: deviceId and config are required' });
    }

    // Ensure required fields exist in config
    if (!config.name || !config.state_topic) {
      return res.status(400).json({ error: 'Config must include name and state_topic' });
    }
    
    // Create a unique ID for the sensor if not provided
    if (!config.unique_id) {
      config.unique_id = deviceId;
    }
    
    // Determine the topic based on the requested format
    let topic;
    let sensorId;
    
    switch (topicFormat) {
      case 'unique_id':
        // Format: homeassistant/{unique_id}/config
        topic = `homeassistant/${deviceId}/config`;
        sensorId = deviceId;
        break;
        
      case 'unique_id_with_name':
        // Format: homeassistant/{unique_id}/{sensor_name}/config
        if (!sensorName) {
          return res.status(400).json({ error: 'sensorName is required for unique_id_with_name format' });
        }
        topic = `homeassistant/${deviceId}/${sensorName}/config`;
        sensorId = `${deviceId}_${sensorName}`;
        break;
        
      case 'standard':
      default:
        // Format: homeassistant/{device_type}/{device_id}/config
        if (!deviceType) {
          return res.status(400).json({ error: 'deviceType is required for standard format' });
        }
        topic = `homeassistant/${deviceType}/${deviceId}/config`;
        sensorId = `${deviceType}_${deviceId}`;
        
        // If sensor name is provided, use it in the topic
        if (sensorName) {
          topic = `homeassistant/${deviceType}/${deviceId}/${sensorName}/config`;
          sensorId = `${deviceType}_${deviceId}_${sensorName}`;
        }
        break;
    }
    
    console.log(`Creating sensor with topic: ${topic}`);
    
    // Publish config to MQTT broker with QoS 1 and retain flag to ensure delivery and persistence
    client.publish(topic, JSON.stringify(config), { qos: 1, retain: true }, (err) => {
      if (err) {
        console.error('Error publishing to MQTT:', err);
      } else {
        console.log('Successfully published to MQTT with QoS 1 and retain flag');
      }
    });
    
    // Add to local cache
    const actualDeviceType = deviceType || (config.device_class || 'custom');
    const sensor = {
      id: sensorId,
      deviceType: actualDeviceType,
      deviceId,
      sensorName,
      config,
      topic
    };
    discoveredSensors[sensorId] = sensor;
    
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
    
    // Publish updated config with QoS 1 and retain flag to ensure delivery and persistence
    client.publish(sensor.topic, JSON.stringify(updatedConfig), { qos: 1, retain: true }, (err) => {
      if (err) {
        console.error('Error publishing to MQTT:', err);
      } else {
        console.log('Successfully published to MQTT with QoS 1 and retain flag');
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
    // Publish empty config to remove sensor - using retain flag with empty payload clears the retained message
    client.publish(sensor.topic, '', { qos: 1, retain: true }, (err) => {
      if (err) {
        console.error('Error publishing delete to MQTT:', err);
      } else {
        console.log('Successfully cleared retained message with QoS 1');
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
