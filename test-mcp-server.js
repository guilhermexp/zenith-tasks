const http = require('http');

const tools = [
  {
    name: "test-tool",
    description: "A simple test tool",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string" }
      },
      required: ["message"]
    }
  },
  {
    name: "calculator",
    description: "Simple calculator tool",
    inputSchema: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["add", "subtract", "multiply", "divide"] },
        a: { type: "number" },
        b: { type: "number" }
      },
      required: ["operation", "a", "b"]
    }
  }
];

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  console.log(`[MCP Test Server] ${req.method} ${req.url}`);

  if (req.url === '/tools' && req.method === 'GET') {
    res.statusCode = 200;
    res.end(JSON.stringify({ tools }));
  } else if (req.url === '/call' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { name, arguments: args } = JSON.parse(body);
        console.log(`[MCP Test Server] Tool call: ${name}`, args);
        
        if (name === 'test-tool') {
          res.statusCode = 200;
          res.end(JSON.stringify({ 
            result: `Echo: ${args.message}`,
            timestamp: new Date().toISOString()
          }));
        } else if (name === 'calculator') {
          let result;
          switch(args.operation) {
            case 'add': result = args.a + args.b; break;
            case 'subtract': result = args.a - args.b; break;
            case 'multiply': result = args.a * args.b; break;
            case 'divide': result = args.b !== 0 ? args.a / args.b : 'Error: Division by zero'; break;
            default: result = 'Unknown operation';
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ result }));
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Tool not found' }));
        }
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = 8765;
server.listen(PORT, () => {
  console.log(`[MCP Test Server] Running on http://localhost:${PORT}`);
  console.log(`[MCP Test Server] Available endpoints:`);
  console.log(`  - GET  http://localhost:${PORT}/tools`);
  console.log(`  - POST http://localhost:${PORT}/call`);
});