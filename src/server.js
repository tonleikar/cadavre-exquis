import express from 'express';
import { createServer } from 'node:http';

const app = express();
const server = createServer(app);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile('index.html');
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
