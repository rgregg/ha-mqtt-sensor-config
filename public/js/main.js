// DOM Elements
const brokerUrlInput = document.getElementById('broker-url');
const connectBtn = document.getElementById('connect-btn');
const clearBrokerBtn = document.getElementById('clear-broker-btn');
const connectionStatus = document.getElementById('connection-status');
const refreshBtn = document.getElementById('refresh-btn');
const newSensorBtn = document.getElementById('new-sensor-btn');
const sensorsTableBody = document.getElementById('sensors-table-body');

// Edit Modal Elements
const editSensorModal = new bootstrap.Modal(document.getElementById('edit-sensor-modal'));
const sensorIdInput = document.getElementById('sensor-id');
const sensorNameInput = document.getElementById('sensor-name');
const sensorStateTopicInput = document.getElementById('sensor-state-topic');
const sensorConfigJsonInput = document.getElementById('sensor-config-json');
const saveSensorBtn = document.getElementById('save-sensor-btn');
const deleteSensorBtn = document.getElementById('delete-sensor-btn');

// New Sensor Modal Elements
const newSensorModal = new bootstrap.Modal(document.getElementById('new-sensor-modal'));
const newSensorTypeSelect = document.getElementById('new-sensor-type');
const newSensorIdInput = document.getElementById('new-sensor-id');
const newSensorNameInput = document.getElementById('new-sensor-name');
const newSensorStateTopicInput = document.getElementById('new-sensor-state-topic');
const newSensorConfigJsonInput = document.getElementById('new-sensor-config-json');
const createSensorBtn = document.getElementById('create-sensor-btn');

// Helper functions for cookies
function setCookie(name, value, days) {
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/';
}

function getCookie(name) {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
}

// Set broker URL from cookie if available
const savedBrokerUrl = getCookie('mqtt_broker_url');
if (savedBrokerUrl) {
  brokerUrlInput.value = savedBrokerUrl;
}

// Check connection status on page load and attempt auto-connect
async function initializeApp() {
  await checkConnectionStatus();
  
  // If we're not connected yet but have a saved broker URL, try connecting
  if (connectionStatus.textContent === 'Disconnected' && savedBrokerUrl) {
    console.log('Auto-connecting to saved broker URL...');
    connectToBroker();
  }
}

initializeApp();

// Helper function to clear cookie
function clearCookie(name) {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

// Function to clear broker URL
function clearBrokerUrl() {
  if (confirm('Are you sure you want to clear the saved broker URL?')) {
    clearCookie('mqtt_broker_url');
    brokerUrlInput.value = '';
    alert('Saved broker URL has been cleared.');
  }
}

// Event Listeners
connectBtn.addEventListener('click', connectToBroker);
clearBrokerBtn.addEventListener('click', clearBrokerUrl);
refreshBtn.addEventListener('click', loadSensors);
newSensorBtn.addEventListener('click', openNewSensorModal);
saveSensorBtn.addEventListener('click', saveSensor);
deleteSensorBtn.addEventListener('click', deleteSensor);
createSensorBtn.addEventListener('click', createSensor);

// Functions
async function checkConnectionStatus() {
  try {
    const response = await fetch('/sensors/connection');
    const data = await response.json();
    
    updateConnectionStatus(data.connected);
    
    if (data.broker) {
      brokerUrlInput.value = data.broker;
      // Update cookie to match current broker
      setCookie('mqtt_broker_url', data.broker, 30);
    }
    
    if (data.connected) {
      loadSensors();
    } else {
      // If not connected but we have a saved broker URL, attempt to connect
      const savedBrokerUrl = getCookie('mqtt_broker_url');
      if (savedBrokerUrl && !data.connected && savedBrokerUrl !== data.broker) {
        console.log('Attempting to connect with saved broker URL:', savedBrokerUrl);
        brokerUrlInput.value = savedBrokerUrl;
        await connectToBroker();
      }
    }
  } catch (err) {
    console.error('Error checking connection status:', err);
  }
}

async function connectToBroker() {
  const broker = brokerUrlInput.value.trim();
  
  if (!broker) {
    alert('Please enter a broker URL');
    return;
  }
  
  try {
    connectionStatus.textContent = 'Connecting...';
    connectionStatus.className = 'badge bg-warning';
    
    const response = await fetch('/sensors/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ broker })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Save broker URL to cookie that expires in 30 days
      setCookie('mqtt_broker_url', broker, 30);
      
      // Wait a bit for connection to establish
      setTimeout(checkConnectionStatus, 1000);
    } else {
      updateConnectionStatus(false);
      alert(`Connection failed: ${data.error}`);
    }
  } catch (err) {
    updateConnectionStatus(false);
    console.error('Error connecting to broker:', err);
    alert('Error connecting to broker. Check console for details.');
  }
}

function updateConnectionStatus(connected) {
  if (connected) {
    connectionStatus.textContent = 'Connected';
    connectionStatus.className = 'badge bg-success';
  } else {
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.className = 'badge bg-secondary';
  }
}

async function loadSensors() {
  try {
    const response = await fetch('/sensors');
    const sensors = await response.json();
    
    sensorsTableBody.innerHTML = '';
    
    if (sensors.length === 0) {
      sensorsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center">No sensors discovered yet</td>
        </tr>
      `;
      return;
    }
    
    sensors.forEach(sensor => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${sensor.deviceId}</td>
        <td>${sensor.config.name || 'Unnamed'}</td>
        <td>${sensor.deviceType}</td>
        <td>${sensor.config.state_topic || 'N/A'}</td>
        <td>
          <button class="btn btn-sm btn-primary btn-action edit-btn" data-id="${sensor.id}">Edit</button>
        </td>
      `;
      
      sensorsTableBody.appendChild(row);
    });
    
    // Add event listeners to edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
  } catch (err) {
    console.error('Error loading sensors:', err);
    sensorsTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger">Error loading sensors. Check console for details.</td>
      </tr>
    `;
  }
}

async function openEditModal(sensorId) {
  console.log('Opening edit modal for sensor ID:', sensorId);
  
  try {
    const response = await fetch(`/sensors/${sensorId}`);
    console.log('Fetch response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 404) {
        alert('Sensor not found. It may have been deleted or the server was restarted. Try refreshing the page.');
        loadSensors(); // Refresh the list to show current state
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const sensor = await response.json();
    console.log('Received sensor data:', sensor);
    
    if (!sensor || !sensor.config) {
      alert('Invalid sensor data received. Try refreshing the page.');
      return;
    }
    
    // Populate form fields
    sensorIdInput.value = sensor.id;
    sensorNameInput.value = sensor.config.name || '';
    sensorStateTopicInput.value = sensor.config.state_topic || '';
    sensorConfigJsonInput.value = JSON.stringify(sensor.config, null, 2);
    
    console.log('Populated form with sensor ID:', sensorIdInput.value);
    
    // Show modal
    editSensorModal.show();
  } catch (err) {
    console.error('Error loading sensor details:', err);
    alert('Error loading sensor details. Check console for details.');
  }
}

async function saveSensor() {
  const sensorId = sensorIdInput.value;
  console.log('Saving sensor with ID:', sensorId);
  
  if (!sensorId) {
    alert('Missing sensor ID. Please try refreshing the page and try again.');
    return;
  }
  
  try {
    // Parse the JSON to validate it
    let configJson;
    try {
      configJson = JSON.parse(sensorConfigJsonInput.value);
      console.log('Parsed config JSON:', configJson);
    } catch (err) {
      console.error('JSON parse error:', err);
      alert('Invalid JSON format. Please check your configuration.');
      return;
    }
    
    // Basic validation
    if (!sensorNameInput.value.trim()) {
      alert('Sensor name cannot be empty');
      return;
    }
    
    if (!sensorStateTopicInput.value.trim()) {
      alert('State topic cannot be empty');
      return;
    }
    
    // Update name and state topic from form fields
    configJson.name = sensorNameInput.value.trim();
    configJson.state_topic = sensorStateTopicInput.value.trim();
    
    // Ensure unique_id is preserved
    if (!configJson.unique_id) {
      // Extract device ID from sensor ID (format is deviceType_deviceId)
      const deviceId = sensorId.split('_')[1];
      if (deviceId) {
        configJson.unique_id = deviceId;
      }
    }
    
    console.log('Sending PUT request to:', `/sensors/${sensorId}`);
    console.log('With data:', { config: configJson });
    
    const response = await fetch(`/sensors/${sensorId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ config: configJson })
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 404) {
        alert('Sensor not found. It may have been deleted or the server was restarted. Try refreshing the page.');
        editSensorModal.hide();
        loadSensors(); // Refresh the list
        return;
      } else if (response.status === 400) {
        alert('Not connected to MQTT broker. Please connect first.');
        return;
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.success) {
      editSensorModal.hide();
      loadSensors(); // Refresh sensors list
      alert('Sensor updated successfully!');
    } else {
      alert(`Failed to update sensor: ${data.error}`);
    }
  } catch (err) {
    console.error('Error saving sensor:', err);
    alert('Error saving sensor: ' + err.message);
  }
}

async function deleteSensor() {
  const sensorId = sensorIdInput.value;
  
  if (!confirm('Are you sure you want to delete this sensor?')) {
    return;
  }
  
  try {
    const response = await fetch(`/sensors/${sensorId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      editSensorModal.hide();
      loadSensors(); // Refresh sensors list
    } else {
      alert(`Failed to delete sensor: ${data.error}`);
    }
  } catch (err) {
    console.error('Error deleting sensor:', err);
    alert('Error deleting sensor. Check console for details.');
  }
}

function openNewSensorModal() {
  // Clear form
  newSensorTypeSelect.value = 'sensor';
  newSensorIdInput.value = '';
  newSensorNameInput.value = '';
  newSensorStateTopicInput.value = '';
  newSensorConfigJsonInput.value = '';
  
  // Show modal
  newSensorModal.show();
}

async function createSensor() {
  // Validate input
  const deviceType = newSensorTypeSelect.value;
  const deviceId = newSensorIdInput.value.trim();
  const name = newSensorNameInput.value.trim();
  const stateTopic = newSensorStateTopicInput.value.trim();
  
  if (!deviceId || !name || !stateTopic) {
    alert('Please fill in all required fields');
    return;
  }
  
  try {
    // Parse additional config if provided
    let additionalConfig = {};
    if (newSensorConfigJsonInput.value.trim()) {
      try {
        additionalConfig = JSON.parse(newSensorConfigJsonInput.value);
      } catch (err) {
        alert('Invalid JSON format in additional configuration. Please check your input.');
        return;
      }
    }
    
    // Create full config object
    const config = {
      name,
      state_topic: stateTopic,
      unique_id: deviceId,
      ...additionalConfig
    };
    
    // Create sensor
    const response = await fetch('/sensors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deviceType,
        deviceId,
        config
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      newSensorModal.hide();
      loadSensors(); // Refresh sensors list
    } else {
      alert(`Failed to create sensor: ${data.error}`);
    }
  } catch (err) {
    console.error('Error creating sensor:', err);
    alert('Error creating sensor. Check console for details.');
  }
}
