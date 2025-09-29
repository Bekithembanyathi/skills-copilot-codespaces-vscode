import express from 'express';
import path from 'path';

const app = express();
const port = 8080;

// Serve static files
app.use('/static', express.static(path.join(__dirname, '../web/static')));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/public/index.html'));
});

app.listen(port, () => {
  console.log(`Demo server running at http://localhost:${port}`);
});