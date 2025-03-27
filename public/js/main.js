// DOM Elements
const brokerUrlInput = document.getElementById('broker-url');
const connectBtn = document.getElementById('connect-btn');
const connectionStatus = document.getElementById('connection-status');
const refreshBtn = document.getElementById('refresh-btn');
const sensorsTableBody = document.getElementById('sensors-table-body');
const editSensorModal = new bootstrap.Modal(document.getElementById('edit-sensor-modal'));
const sensorIdInput = document.getElementById('sensor-id');
const sensorNameInput = document.getElementById('sensor-name');
const sensorStateTopicInput = document.getElementById('sensor-state-topic');
const sensorConfigJsonInput = document.getElementById('sensor-config-json');
const saveSensorBtn = document.getElementById('save-sensor-btn');
const deleteSensorBtn = document.getElementById('delete-sensor-btn');

// Check connection status on page load
checkConnectionStatus();

// Event Listeners
connectBtn.addEventListener('click', connectToBroker);
refreshBtn.addEventListener('click', loadSensors);
saveSensorBtn.addEventListener('click', saveSensor);
deleteSensorBtn.addEventListener('click', deleteSensor);

// Functions
async function checkConnectionStatus() {
  try {
    const response = await fetch('/sensors/connection');
    const data = await response.json();
    
    updateConnectionStatus(data.connected);
    
    if (data.broker) {
      brokerUrlInput.value = data.broker;
    }
    
    if (data.connected) {
      loadSensors();
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
  try {
    const response = await fetch(`/sensors/${sensorId}`);
    const sensor = await response.json();
    
    // Populate form fields
    sensorIdInput.value = sensor.id;
    sensorNameInput.value = sensor.config.name || '';
    sensorStateTopicInput.value = sensor.config.state_topic || '';
    sensorConfigJsonInput.value = JSON.stringify(sensor.config, null, 2);
    
    // Show modal
    editSensorModal.show();
  } catch (err) {
    console.error('Error loading sensor details:', err);
    alert('Error loading sensor details. Check console for details.');
  }
}

async function saveSensor() {
  const sensorId = sensorIdInput.value;
  
  try {
    // Parse the JSON to validate it
    let configJson;
    try {
      configJson = JSON.parse(sensorConfigJsonInput.value);
    } catch (err) {
      alert('Invalid JSON format. Please check your configuration.');
      return;
    }
    
    // Update name and state topic from form fields
    configJson.name = sensorNameInput.value;
    configJson.state_topic = sensorStateTopicInput.value;
    
    const response = await fetch(`/sensors/${sensorId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ config: configJson })
    });
    
    const data = await response.json();
    
    if (data.success) {
      editSensorModal.hide();
      loadSensors(); // Refresh sensors list
    } else {
      alert(`Failed to update sensor: ${data.error}`);
    }
  } catch (err) {
    console.error('Error saving sensor:', err);
    alert('Error saving sensor. Check console for details.');
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
