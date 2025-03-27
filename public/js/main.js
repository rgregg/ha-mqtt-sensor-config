// DOM Elements
const brokerUrlInput = document.getElementById('broker-url');
const connectBtn = document.getElementById('connect-btn');
const clearBrokerBtn = document.getElementById('clear-broker-btn');
const connectionStatus = document.getElementById('connection-status');
const refreshBtn = document.getElementById('refresh-btn');
const newSensorBtn = document.getElementById('new-sensor-btn');
const devicesAccordion = document.getElementById('devices-accordion');
const deviceSearch = document.getElementById('device-search');
const noDevicesMessage = document.getElementById('no-devices-message');

// Edit Modal Elements
const editSensorModal = new bootstrap.Modal(document.getElementById('edit-sensor-modal'));
const sensorIdInput = document.getElementById('sensor-id');
const sensorTopicInput = document.getElementById('sensor-topic');
const sensorDeviceTypeInput = document.getElementById('sensor-device-type');
const sensorDeviceIdInput = document.getElementById('sensor-device-id');
const sensorNamePartInput = document.getElementById('sensor-name-part');
const sensorNamePartGroup = document.getElementById('sensor-name-part-group');
const sensorNameInput = document.getElementById('sensor-name');
const sensorStateTopicInput = document.getElementById('sensor-state-topic');
const sensorConfigJsonInput = document.getElementById('sensor-config-json');
const saveSensorBtn = document.getElementById('save-sensor-btn');
const deleteSensorBtn = document.getElementById('delete-sensor-btn');

// Duplicate Modal Elements
const dupTopicFormatSelect = document.getElementById('dup-topic-format');
const dupDeviceTypeSelect = document.getElementById('dup-device-type');
const dupDeviceIdInput = document.getElementById('dup-device-id');
const dupSensorNamePartInput = document.getElementById('dup-sensor-name-part');
const dupSensorNameInput = document.getElementById('dup-display-name');
const dupStateTopicInput = document.getElementById('dup-state-topic');
const dupConfigJsonInput = document.getElementById('dup-config-json');
const dupDeviceTypeGroup = document.querySelector('.dup-device-type-group');
const dupSensorNameGroup = document.querySelector('.dup-sensor-name-group');
const createDuplicateBtn = document.getElementById('create-duplicate-btn');

// Tab and mode elements
const editTab = document.getElementById('edit-tab');
const duplicateTab = document.getElementById('duplicate-tab');
const editModeButtons = document.getElementById('edit-mode-buttons');
const duplicateModeButtons = document.getElementById('duplicate-mode-buttons');

// New Device Modal Elements
const newDeviceModal = new bootstrap.Modal(document.getElementById('new-device-modal'));
const deviceIdInput = document.getElementById('device-id');
const deviceTypeSelect = document.getElementById('device-type');
const createDeviceBtn = document.getElementById('create-device-btn');

// Add Sensor Modal Elements
const newSensorModal = new bootstrap.Modal(document.getElementById('new-sensor-modal'));
const newDeviceIdInput = document.getElementById('new-device-id');
const newTopicFormatSelect = document.getElementById('new-topic-format');
const newSensorTypeSelect = document.getElementById('new-sensor-type');
const newSensorNamePartInput = document.getElementById('new-sensor-name-part');
const newSensorNameInput = document.getElementById('new-sensor-name');
const newSensorStateTopicInput = document.getElementById('new-sensor-state-topic');
const newSensorConfigJsonInput = document.getElementById('new-sensor-config-json');
const createSensorBtn = document.getElementById('create-sensor-btn');
const deviceTypeGroup = document.querySelector('.device-type-group');
const sensorNameGroup = document.querySelector('.sensor-name-group');

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

// Function to handle column header clicks for sorting
function handleSortClick(e) {
  const clickedColumn = e.currentTarget.dataset.sort;
  
  // If clicking the same column, toggle direction
  if (clickedColumn === currentSortColumn) {
    currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    // New column, default to ascending
    currentSortColumn = clickedColumn;
    currentSortDirection = 'asc';
  }
  
  // Re-display with new sort settings
  displaySensors();
}

// Check connection status on page load and attempt auto-connect
async function initializeApp() {
  // Add click handlers to sortable columns
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', handleSortClick);
  });
  
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

// Function to handle topic format changes
function updateTopicFormatUI() {
  const format = newTopicFormatSelect.value;
  
  // Show/hide fields based on selected format
  switch(format) {
    case 'standard':
      deviceTypeGroup.style.display = 'block';
      sensorNameGroup.style.display = 'none';
      break;
    case 'standard_with_name':
      deviceTypeGroup.style.display = 'block';
      sensorNameGroup.style.display = 'block';
      break;
    case 'unique_id':
      deviceTypeGroup.style.display = 'none';
      sensorNameGroup.style.display = 'none';
      break;
    case 'unique_id_with_name':
      deviceTypeGroup.style.display = 'none';
      sensorNameGroup.style.display = 'block';
      break;
  }
}

// Function to update duplicate form UI based on topic format
function updateDupTopicFormatUI() {
  const format = dupTopicFormatSelect.value;
  
  // Show/hide fields based on selected format
  switch(format) {
    case 'standard':
      dupDeviceTypeGroup.style.display = 'block';
      dupSensorNameGroup.style.display = 'none';
      break;
    case 'standard_with_name':
      dupDeviceTypeGroup.style.display = 'block';
      dupSensorNameGroup.style.display = 'block';
      break;
    case 'unique_id':
      dupDeviceTypeGroup.style.display = 'none';
      dupSensorNameGroup.style.display = 'none';
      break;
    case 'unique_id_with_name':
      dupDeviceTypeGroup.style.display = 'none';
      dupSensorNameGroup.style.display = 'block';
      break;
  }
}

// Function to initialize duplicate form from the current sensor
function initDuplicateForm() {
  // Copy config from edit form
  let config;
  try {
    config = JSON.parse(sensorConfigJsonInput.value);
  } catch (err) {
    console.error('JSON parse error:', err);
    alert('Invalid JSON in the original sensor. Please fix it before duplicating.');
    return;
  }
  
  // Set initial values from current sensor
  dupDeviceTypeSelect.value = sensorDeviceTypeInput.value;
  dupDeviceIdInput.value = sensorDeviceIdInput.value + '_copy';
  dupSensorNamePartInput.value = sensorNamePartInput.value ? sensorNamePartInput.value + '_copy' : '';
  dupSensorNameInput.value = sensorNameInput.value + ' (Copy)';
  dupStateTopicInput.value = sensorStateTopicInput.value.replace(/\/[^\/]+$/, '/copy');
  dupConfigJsonInput.value = JSON.stringify({
    ...config,
    name: dupSensorNameInput.value,
    state_topic: dupStateTopicInput.value
  }, null, 2);
  
  // Update UI based on the format
  updateDupTopicFormatUI();
}

// Tab change handlers
function showEditMode() {
  editModeButtons.style.display = 'block';
  duplicateModeButtons.style.display = 'none';
}

function showDuplicateMode() {
  editModeButtons.style.display = 'none';
  duplicateModeButtons.style.display = 'block';
  initDuplicateForm();
}

// Event Listeners
connectBtn.addEventListener('click', connectToBroker);
clearBrokerBtn.addEventListener('click', clearBrokerUrl);
refreshBtn.addEventListener('click', loadSensors);
newSensorBtn.addEventListener('click', openNewDeviceModal);
saveSensorBtn.addEventListener('click', saveSensor);
deleteSensorBtn.addEventListener('click', deleteSensor);
createSensorBtn.addEventListener('click', createSensor);
createDuplicateBtn.addEventListener('click', createDuplicateSensor);
createDeviceBtn.addEventListener('click', createDevice);
newTopicFormatSelect.addEventListener('change', updateTopicFormatUI);
deviceSearch.addEventListener('input', filterDevices);
dupTopicFormatSelect.addEventListener('change', updateDupTopicFormatUI);

// Tab event listeners
editTab.addEventListener('click', showEditMode);
duplicateTab.addEventListener('click', showDuplicateMode);

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
      setTimeout(async () => {
        await checkConnectionStatus();
        displaySensors(); // Make sure sorted display is up to date
      }, 1000);
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

// Global variables for sensors and devices
let allSensors = [];
let deviceMap = {}; // Maps device IDs to arrays of sensors

async function loadSensors() {
  try {
    const response = await fetch('/sensors');
    allSensors = await response.json();
    
    // Organize sensors by device ID
    deviceMap = {};
    
    allSensors.forEach(sensor => {
      const deviceId = sensor.deviceId;
      
      if (!deviceMap[deviceId]) {
        deviceMap[deviceId] = {
          deviceId: deviceId,
          deviceType: sensor.deviceType,
          sensors: []
        };
      }
      
      deviceMap[deviceId].sensors.push(sensor);
    });
    
    displayDevices();
  } catch (err) {
    console.error('Error loading sensors:', err);
    devicesAccordion.innerHTML = `
      <div class="alert alert-danger">
        Error loading sensors. Check console for details.
      </div>
    `;
  }
}

function displayDevices() {
  devicesAccordion.innerHTML = '';
  
  const deviceIds = Object.keys(deviceMap);
  
  if (deviceIds.length === 0) {
    noDevicesMessage.style.display = 'block';
    return;
  }
  
  noDevicesMessage.style.display = 'none';
  
  // Sort device IDs alphabetically
  deviceIds.sort();
  
  deviceIds.forEach((deviceId, index) => {
    const device = deviceMap[deviceId];
    const deviceHtml = createDeviceAccordionItem(device, index);
    devicesAccordion.innerHTML += deviceHtml;
  });
  
  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
  
  // Add event listeners to buttons
  attachEventListeners();
}

function createDeviceAccordionItem(device, index) {
  const deviceId = device.deviceId;
  const deviceType = device.deviceType || 'custom';
  const sensors = device.sensors || [];
  const sensorCount = sensors.length;
  
  // Create device header
  const html = `
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button ${index > 0 ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" 
                data-bs-target="#device-${deviceId.replace(/[^a-zA-Z0-9]/g, '_')}" aria-expanded="${index === 0 ? 'true' : 'false'}">
          <div class="device-header">
            <div class="device-info">
              <span class="device-id">${deviceId}</span>
              <span class="device-type">Type: ${deviceType} · ${sensorCount} sensor${sensorCount !== 1 ? 's' : ''}</span>
            </div>
            <div class="device-actions">
              <button class="btn btn-sm btn-outline-primary add-sensor-btn" data-device-id="${deviceId}" data-device-type="${deviceType}">
                <i class="bi bi-plus-circle"></i> Add Sensor
              </button>
            </div>
          </div>
        </button>
      </h2>
      <div id="device-${deviceId.replace(/[^a-zA-Z0-9]/g, '_')}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}">
        <div class="accordion-body p-0">
          ${createSensorList(sensors, deviceId)}
        </div>
      </div>
    </div>
  `;
  
  return html;
}

function createSensorList(sensors, deviceId) {
  if (!sensors || sensors.length === 0) {
    return `
      <div class="p-3 text-center text-muted">
        No sensors for this device. 
        <button class="btn btn-sm btn-link add-sensor-btn" data-device-id="${deviceId}">Add a sensor</button>
      </div>
    `;
  }
  
  // Sort sensors by name
  sensors.sort((a, b) => {
    const nameA = (a.config.name || 'Unnamed').toLowerCase();
    const nameB = (b.config.name || 'Unnamed').toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  let html = '<ul class="sensor-list">';
  
  sensors.forEach(sensor => {
    // Determine sensor type from topic parts or config
    let sensorType = sensor.deviceType || 'custom';
    if (sensor.config.device_class) {
      sensorType = sensor.config.device_class;
    }
    
    // Create a tooltip with full topic
    const tooltipAttr = `data-bs-toggle="tooltip" data-bs-placement="top" title="${sensor.topic}"`;
    
    html += `
      <li class="sensor-item">
        <div class="sensor-details">
          <div class="sensor-name">${sensor.config.name || 'Unnamed'}</div>
          <div class="sensor-meta">
            <span class="sensor-type">${sensorType}</span>
            <span class="sensor-topic" ${tooltipAttr}>${sensor.config.state_topic || 'No state topic'}</span>
          </div>
        </div>
        <div class="sensor-actions">
          <button class="btn btn-sm btn-primary edit-btn" data-id="${sensor.id}">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${sensor.id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </li>
    `;
  });
  
  html += '</ul>';
  return html;
}

function attachEventListeners() {
  // Add sensor button event listeners
  document.querySelectorAll('.add-sensor-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent accordion toggle
      openAddSensorModal(btn.dataset.deviceId, btn.dataset.deviceType);
    });
  });
  
  // Edit sensor button event listeners
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
  
  // Delete sensor button event listeners
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this sensor?')) {
        deleteSensor(btn.dataset.id);
      }
    });
  });
}

function filterDevices() {
  const searchText = deviceSearch.value.toLowerCase();
  
  if (!searchText) {
    // If search is empty, show all devices
    document.querySelectorAll('.accordion-item').forEach(item => {
      item.style.display = 'block';
    });
    return;
  }
  
  // Iterate through all devices
  document.querySelectorAll('.accordion-item').forEach(item => {
    const deviceId = item.querySelector('.device-id').textContent.toLowerCase();
    const deviceType = item.querySelector('.device-type').textContent.toLowerCase();
    
    // Get all sensors in this device
    const sensorItems = item.querySelectorAll('.sensor-item');
    let deviceMatches = deviceId.includes(searchText) || deviceType.includes(searchText);
    let anySensorMatches = false;
    
    // Check if any sensor matches
    sensorItems.forEach(sensorItem => {
      const sensorName = sensorItem.querySelector('.sensor-name').textContent.toLowerCase();
      const sensorType = sensorItem.querySelector('.sensor-type').textContent.toLowerCase();
      const sensorTopic = sensorItem.querySelector('.sensor-topic').textContent.toLowerCase();
      
      const sensorMatches = sensorName.includes(searchText) || 
                           sensorType.includes(searchText) || 
                           sensorTopic.includes(searchText);
      
      if (sensorMatches) {
        anySensorMatches = true;
        sensorItem.style.display = 'flex';
      } else {
        sensorItem.style.display = 'none';
      }
    });
    
    // Show device if either device matches or any sensor matches
    if (deviceMatches || anySensorMatches) {
      item.style.display = 'block';
      
      // If any sensor matches, expand the accordion
      if (anySensorMatches) {
        const collapseEl = item.querySelector('.accordion-collapse');
        const bsCollapse = new bootstrap.Collapse(collapseEl, { toggle: false });
        bsCollapse.show();
      }
    } else {
      item.style.display = 'none';
    }
  });
}

function openNewDeviceModal() {
  // Clear form
  deviceIdInput.value = '';
  deviceTypeSelect.value = 'sensor';
  
  // Show modal
  newDeviceModal.show();
}

function openAddSensorModal(deviceId, deviceType) {
  // Set the device ID
  newDeviceIdInput.value = deviceId;
  
  // Set appropriate default values
  newTopicFormatSelect.value = 'standard';
  newSensorTypeSelect.value = deviceType || 'sensor';
  newSensorNamePartInput.value = '';
  newSensorNameInput.value = '';
  newSensorStateTopicInput.value = 'homeassistant/' + deviceId + '/state';
  newSensorConfigJsonInput.value = '';
  
  // Update UI based on selected format
  updateTopicFormatUI();
  
  // Show modal
  newSensorModal.show();
}

async function createDevice() {
  const deviceId = deviceIdInput.value.trim();
  const deviceType = deviceTypeSelect.value;
  
  if (!deviceId) {
    alert('Please enter a device ID');
    return;
  }
  
  // Check if device already exists
  if (deviceMap[deviceId]) {
    alert('A device with this ID already exists');
    return;
  }
  
  // Create the device in our local map
  deviceMap[deviceId] = {
    deviceId: deviceId,
    deviceType: deviceType,
    sensors: []
  };
  
  // Hide modal
  newDeviceModal.hide();
  
  // Update UI
  displayDevices();
  
  // Open the add sensor modal for this device
  setTimeout(() => {
    openAddSensorModal(deviceId, deviceType);
  }, 500);
}

async function openEditModal(sensorId) {
  console.log('Opening edit modal for sensor ID:', sensorId);
  
  try {
    const response = await fetch(`/sensors/${sensorId}`);
    console.log('Fetch response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 404) {
        alert('Sensor not found. It may have been deleted or the server was restarted. Try refreshing the page.');
        await loadSensors(); // Refresh the list to show current state
        displaySensors(); // Make sure to update the display
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
    sensorTopicInput.value = sensor.topic || '';
    sensorDeviceTypeInput.value = sensor.deviceType || 'custom';
    sensorDeviceIdInput.value = sensor.deviceId || '';
    
    // Determine if this is a topic with a sensor name part
    const topicParts = sensor.topic.split('/');
    const hasSensorNamePart = (topicParts.length === 5 && topicParts[4] === 'config') || 
                             (topicParts.length === 4 && topicParts[0] === 'homeassistant' && 
                              topicParts[3] === 'config' && topicParts[1] !== sensor.deviceType);
    
    if (hasSensorNamePart && sensor.sensorName) {
      sensorNamePartGroup.style.display = 'block';
      sensorNamePartInput.value = sensor.sensorName;
    } else {
      sensorNamePartGroup.style.display = 'none';
      sensorNamePartInput.value = '';
    }
    
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
        await loadSensors(); // Refresh the list
        displaySensors();
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
      await loadSensors(); // Refresh sensors list
      displaySensors();
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
      await loadSensors(); // Refresh sensors list
      displaySensors();
      alert('Sensor deleted successfully');
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
  newTopicFormatSelect.value = 'standard';
  newSensorTypeSelect.value = 'sensor';
  newSensorIdInput.value = '';
  newSensorNamePartInput.value = '';
  newSensorNameInput.value = '';
  newSensorStateTopicInput.value = '';
  newSensorConfigJsonInput.value = '';
  
  // Initialize UI based on selected format
  updateTopicFormatUI();
  
  // Show modal
  newSensorModal.show();
}

async function createSensor() {
  // Get the topic format
  const topicFormat = newTopicFormatSelect.value;
  
  // Get common required fields
  const deviceId = newDeviceIdInput.value.trim();
  const displayName = newSensorNameInput.value.trim();
  const stateTopic = newSensorStateTopicInput.value.trim();
  
  // Get format-specific fields
  const deviceType = (topicFormat === 'standard' || topicFormat === 'standard_with_name') 
    ? newSensorTypeSelect.value 
    : null;
    
  const sensorName = (topicFormat === 'standard_with_name' || topicFormat === 'unique_id_with_name') 
    ? newSensorNamePartInput.value.trim() 
    : null;
  
  // Validate common required fields
  if (!deviceId || !displayName || !stateTopic) {
    alert('Please fill in all required fields');
    return;
  }
  
  // Validate format-specific fields
  if ((topicFormat === 'standard' || topicFormat === 'standard_with_name') && !deviceType) {
    alert('Device Type is required for standard format');
    return;
  }
  
  if ((topicFormat === 'standard_with_name' || topicFormat === 'unique_id_with_name') && !sensorName) {
    alert('Sensor Name Part is required for formats with sensor name');
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
      name: displayName,
      state_topic: stateTopic,
      unique_id: deviceId + (sensorName ? '_' + sensorName : ''),
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
        sensorName,
        config,
        topicFormat
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      newSensorModal.hide();
      
      // Add the new sensor to our device map
      if (!deviceMap[deviceId]) {
        deviceMap[deviceId] = {
          deviceId: deviceId,
          deviceType: deviceType || 'custom',
          sensors: []
        };
      }
      
      deviceMap[deviceId].sensors.push(data.sensor);
      
      // Update the UI
      displayDevices();
      
      // Find and expand the device that contains the new sensor
      const deviceElement = document.querySelector(`#device-${deviceId.replace(/[^a-zA-Z0-9]/g, '_')}`);
      if (deviceElement) {
        const bsCollapse = new bootstrap.Collapse(deviceElement, { toggle: false });
        bsCollapse.show();
      }
      
      alert('Sensor added successfully!');
    } else {
      alert(`Failed to create sensor: ${data.error}`);
    }
  } catch (err) {
    console.error('Error creating sensor:', err);
    alert('Error creating sensor. Check console for details.');
  }
}

async function createDuplicateSensor() {
  // Get the topic format
  const topicFormat = dupTopicFormatSelect.value;
  
  // Get common required fields
  const deviceId = dupDeviceIdInput.value.trim();
  const displayName = dupSensorNameInput.value.trim();
  const stateTopic = dupStateTopicInput.value.trim();
  
  // Get format-specific fields
  const deviceType = (topicFormat === 'standard' || topicFormat === 'standard_with_name') 
    ? dupDeviceTypeSelect.value 
    : null;
    
  const sensorName = (topicFormat === 'standard_with_name' || topicFormat === 'unique_id_with_name') 
    ? dupSensorNamePartInput.value.trim() 
    : null;
  
  // Validate common required fields
  if (!deviceId || !displayName || !stateTopic) {
    alert('Please fill in all required fields');
    return;
  }
  
  // Validate format-specific fields
  if ((topicFormat === 'standard' || topicFormat === 'standard_with_name') && !deviceType) {
    alert('Device Type is required for standard format');
    return;
  }
  
  if ((topicFormat === 'standard_with_name' || topicFormat === 'unique_id_with_name') && !sensorName) {
    alert('Sensor Name Part is required for formats with sensor name');
    return;
  }
  
  try {
    // Parse the config JSON
    let config;
    try {
      config = JSON.parse(dupConfigJsonInput.value);
    } catch (err) {
      alert('Invalid JSON format in configuration. Please check your input.');
      return;
    }
    
    // Make sure core fields are set correctly
    config.name = displayName;
    config.state_topic = stateTopic;
    config.unique_id = deviceId;
    
    // Create duplicated sensor
    const response = await fetch('/sensors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deviceType,
        deviceId,
        sensorName,
        config,
        topicFormat
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      editSensorModal.hide();
      await loadSensors(); // Refresh sensors list
      
      // Make the new duplicated sensor show at the top
      currentSortColumn = 'id';
      currentSortDirection = 'asc';
      displaySensors();
      
      alert('Sensor duplicated successfully!');
    } else {
      alert(`Failed to duplicate sensor: ${data.error}`);
    }
  } catch (err) {
    console.error('Error duplicating sensor:', err);
    alert('Error duplicating sensor. Check console for details.');
  }
}
