const http = require('http');

const port = 3001;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World App B');
});

server.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
