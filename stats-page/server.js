const express = require('express');
const path = require('path');

const app = express();
const port = 3001; // Убедитесь, что этот порт не занят вашим основным бэкендом

// Отдаем статические файлы из папки 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Основной маршрут отдает index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Stats page server listening at http://localhost:${port}`);
});
