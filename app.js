const express = require('express');
const path = require('path');

// ...existing code...

// ниже, после других app.use(...)
app.use('/statistics', express.static(path.join(__dirname, 'public', 'statistics')));

// ...existing code...