const fs = require('fs');
const path = require('path');
const { Scenes } = require('telegraf');

const scenes = {};

fs.readdirSync(__dirname).forEach((file) => {
  if (file !== 'index.js') {
    const sceneName = path.basename(file, '.js');
    scenes[sceneName] = require(path.join(__dirname, file));
  }
});

module.exports = scenes;
