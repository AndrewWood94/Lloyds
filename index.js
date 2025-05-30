// /home/awood15/personal/Lloyds/index.js
const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // Use environment variable for port or default to 3000

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from my Node.js API!' });
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});