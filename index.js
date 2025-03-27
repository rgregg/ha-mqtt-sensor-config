const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const mqtt = require('mqtt');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes
const sensorRoutes = require('./routes/sensors');
app.use('/sensors', sensorRoutes);

// Home route
app.get('/', (req, res) => {
  res.render('index', { title: 'MQTT Sensor Config' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
