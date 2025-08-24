#!/usr/bin/env node

/**
 * Mock API Server for Scribe Evolution Local Development
 * Uses only Node.js built-ins - no external dependencies needed!
 * 
 * Usage: node mock-api.js
 * Then access: http://localhost:3001/
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const startTime = Date.now();

// ANSI color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Helper functions for colored console output
function logError(...args) {
  console.error(colors.red + args.join(' ') + colors.reset);
}

function logSuccess(...args) {
  console.log(colors.green + args.join(' ') + colors.reset);
}

// Load mock data from JSON files
function loadMockData() {
  try {
    const mockConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'mock-config.json'), 'utf8'));
    const mockDiagnostics = JSON.parse(fs.readFileSync(path.join(__dirname, 'mock-diagnostics.json'), 'utf8'));
    const mockPrinterDiscovery = JSON.parse(fs.readFileSync(path.join(__dirname, 'mock-printer-discovery.json'), 'utf8'));
    const mockNvsDump = JSON.parse(fs.readFileSync(path.join(__dirname, 'mock-nvs-dump.json'), 'utf8'));
    const mockWifiScan = JSON.parse(fs.readFileSync(path.join(__dirname, 'mock-wifi-scan.json'), 'utf8'));
    
    return { mockConfig, mockDiagnostics, mockPrinterDiscovery, mockNvsDump, mockWifiScan };
  } catch (error) {
    logError('Error loading mock data files:', error.message);
    process.exit(1);
  }
}

let { mockConfig, mockDiagnostics, mockPrinterDiscovery, mockNvsDump, mockWifiScan } = loadMockData();

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json'
};

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data, null, 2));
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*'
      });
      res.end('<h1>404 Not Found</h1>');
      return;
    }
    
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
}

// DRY function for server startup messages
function logServerStartup() {
  console.log('===================================================');
  console.log(`🚀 Mock server started at: http://localhost:${PORT}`);
  console.log('Commands:');
  console.log('"r" + Enter to restart and pick up HTML/CSS/JS changes.');
  console.log('"d" + Enter to reload JSON data files');
  console.log('"x" + Enter to stop gracefully (or CTRL-C');
}

// Create server request handler (DRY - used for initial server and restarts)
function createRequestHandler() {
  return (req, res) => {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = reqUrl.pathname;
    
    console.log(`${new Date().toISOString()} ${req.method} ${pathname}`);
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      res.end();
      return;
    }
    
    // Handle SSE endpoints that don't have /api/ prefix
    if (pathname === '/events') {
      // Server-Sent Events for general events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
      
      console.log('🔌 SSE: Events connection established');
      
      // Send initial printer discovery data with correct event type
      const printerDiscoveryData = { ...mockPrinterDiscovery };
      
      res.write(`event: printer-update\ndata: ${JSON.stringify(printerDiscoveryData)}\n\n`);
      
      const interval = setInterval(() => {
        if (res.destroyed) {
          clearInterval(interval);
          return;
        }
        // Send updated printer discovery data periodically with correct event type
        printerDiscoveryData.discovered_printers[0].last_power_on = new Date().toISOString();
        res.write(`event: printer-update\ndata: ${JSON.stringify(printerDiscoveryData)}\n\n`);
      }, 30000);
      
      req.on('close', () => {
        console.log('🔌 SSE: Events connection closed');
        clearInterval(interval);
      });
      return;
    }
    
    // API Routes
    if (pathname.startsWith('/api/')) {
      if (pathname === '/api/config' && req.method === 'GET') {
        setTimeout(() => sendJSON(res, mockConfig), 200);
        
      } else if (pathname === '/api/config' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            const configUpdate = JSON.parse(body);
            console.log('📝 Config update received');
            
            // Simulate the new password handling logic - only update if provided
            if (configUpdate.device?.wifi?.password) {
              console.log('   ✓ WiFi password updated');
            } else {
              console.log('   - WiFi password preserved (masked value not changed)');
            }
            
            if (configUpdate.mqtt?.password) {
              console.log('   ✓ MQTT password updated');
            } else {
              console.log('   - MQTT password preserved (masked value not changed)');
            }
            
            if (configUpdate.unbiddenInk?.chatgptApiToken) {
              console.log('   ✓ ChatGPT API token updated');
            } else {
              console.log('   - ChatGPT API token preserved (masked value not changed)');
            }
            
            setTimeout(() => {
              sendJSON(res, { 
                success: true, 
                message: "Configuration saved successfully" 
              });
            }, 500);
            
          } catch (error) {
            console.error('Error parsing config update:', error.message);
            setTimeout(() => {
              sendJSON(res, { 
                success: false, 
                error: "Invalid JSON format" 
              }, 400);
            }, 200);
          }
        });
        
      } else if (pathname === '/api/diagnostics') {
        // Update live data to match real ESP32 behavior
        mockDiagnostics.microcontroller.uptime_ms = Date.now() - startTime;
        mockDiagnostics.microcontroller.memory.free_heap = 114024 + Math.floor(Math.random() * 10000 - 5000);
        mockDiagnostics.microcontroller.memory.used_heap = mockDiagnostics.microcontroller.memory.total_heap - mockDiagnostics.microcontroller.memory.free_heap;
        mockDiagnostics.microcontroller.temperature = 40.5 + Math.random() * 5; // Simulate temperature variation
        
        setTimeout(() => sendJSON(res, mockDiagnostics), 150);
        
      } else if (pathname === '/api/nvs-dump') {
        // Update timestamp to current time
        const now = new Date();
        const timestamp = now.toLocaleDateString('en-GB', { 
          weekday: 'short', 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const nvsDumpResponse = {
          ...mockNvsDump,
          timestamp: timestamp
        };
        
        setTimeout(() => sendJSON(res, nvsDumpResponse), 200);
        
      } else if (pathname === '/api/print-local' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          console.log('🖨️  Print request received');
          setTimeout(() => {
            sendJSON(res, {
              success: true,
              message: "Message processed successfully"
            });
          }, 800);
        });
        
      } else if (pathname === '/api/print-mqtt' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          console.log('📡 MQTT print request received');
          setTimeout(() => {
            sendJSON(res, {
              status: "success",
              message: "Message scribed via MQTT"
            });
          }, 500);
        });
        
      } else if (pathname === '/api/led-effect' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          console.log('💡 LED effect triggered');
          setTimeout(() => {
            sendJSON(res, {
              success: true,
              message: "LED effect started successfully"
            });
          }, 300);
        });
        
      } else if (pathname === '/api/scan-wifi') {
        console.log('📶 WiFi scan requested');
        setTimeout(() => sendJSON(res, mockWifiScan), 800);
        
      } else if (pathname === '/api/joke') {
        console.log('😄 Joke requested');
        setTimeout(() => {
          sendJSON(res, {
            content: "JOKE\n\nWhy don't scientists trust atoms? Because they make up everything!"
          });
        }, 300);
        
      } else if (pathname === '/api/riddle') {
        console.log('🧩 Riddle requested');
        setTimeout(() => {
          sendJSON(res, {
            content: "RIDDLE\n\nI speak without a mouth and hear without ears. I have no body, but come alive with the wind. What am I?\n\nAn echo!"
          });
        }, 400);
        
      } else if (pathname === '/api/quote') {
        console.log('💭 Quote requested');
        setTimeout(() => {
          sendJSON(res, {
            content: "QUOTE\n\n\"The only way to do great work is to love what you do.\" - Steve Jobs"
          });
        }, 350);
        
      } else if (pathname === '/api/quiz') {
        console.log('❓ Quiz requested');
        setTimeout(() => {
          sendJSON(res, {
            content: "QUIZ\n\nWhat is the largest planet in our solar system?\n\nA) Mars\nB) Jupiter\nC) Saturn\nD) Neptune\n\nAnswer: B) Jupiter"
          });
        }, 450);
        
      } else if (pathname === '/api/news') {
        console.log('📰 News requested');
        setTimeout(() => {
          sendJSON(res, {
            content: "NEWS\n\nBreaking: Local thermal printer achieves sentience, demands better paper quality and regular maintenance breaks."
          });
        }, 500);
        
      } else if (pathname === '/api/memos' && req.method === 'GET') {
        console.log('📝 Memos GET requested');
        sendJSON(res, {
          success: true,
          message: "Memos retrieved successfully",
          memos: [
            { id: 1, content: "Good morning! Today is [weekday], [date]. Current time: [time]" },
            { id: 2, content: "Random task: [pick:Call Mum|Do Laundry|Walk Dog|Buy Groceries|Clean Kitchen]" },
            { id: 3, content: "Lucky numbers: [dice:10], [dice:20], [dice:6]. Coin flip: [coin]" },
            { id: 4, content: "Device info - Uptime: [uptime], IP: [ip], mDNS: [mdns]" }
          ]
        });
        
      } else if (pathname.match(/^\/api\/memo\/([1-4])$/) && req.method === 'GET') {
        const memoId = parseInt(pathname.match(/^\/api\/memo\/([1-4])$/)[1]);
        console.log(`📝 Memo ${memoId} GET requested`);
        
        const memoContent = [
          "Good morning! Today is [weekday], [date]. Current time: [time]",
          "Random task: [pick:Call Mum|Do Laundry|Walk Dog|Buy Groceries|Clean Kitchen]",
          "Lucky numbers: [dice:10], [dice:20], [dice:6]. Coin flip: [coin]",
          "Device info - Uptime: [uptime], IP: [ip], mDNS: [mdns]"
        ];
        
        sendJSON(res, {
          success: true,
          message: "Memo retrieved successfully",
          id: memoId,
          content: memoContent[memoId - 1]
        });
        
      } else if (pathname.match(/^\/api\/memo\/([1-4])\/print$/) && req.method === 'POST') {
        const memoId = parseInt(pathname.match(/^\/api\/memo\/([1-4])\/print$/)[1]);
        console.log(`📝 Memo ${memoId} PRINT requested`);
        
        // Simulate placeholder expansion
        const expandedContent = [
          `Good morning! Today is ${new Date().toLocaleDateString('en-US', {weekday: 'long'})}, ${new Date().toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: '2-digit'})}. Current time: ${new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: false})}`,
          `Random task: ${['Call Mum', 'Do Laundry', 'Walk Dog', 'Buy Groceries', 'Clean Kitchen'][Math.floor(Math.random() * 5)]}`,
          `Lucky numbers: ${Math.floor(Math.random() * 10) + 1}, ${Math.floor(Math.random() * 20) + 1}, ${Math.floor(Math.random() * 6) + 1}. Coin flip: ${Math.random() > 0.5 ? 'Heads' : 'Tails'}`,
          `Device info - Uptime: ${Math.floor(Math.random() * 12)}h${Math.floor(Math.random() * 60)}m, IP: 192.168.1.100, mDNS: scribe.local`
        ];
        
        setTimeout(() => {
          sendJSON(res, {
            success: true,
            message: "Memo queued for printing",
            content: expandedContent[memoId - 1]
          });
        }, 200);
        
      } else {
        sendJSON(res, { error: 'API endpoint not found' }, 404);
      }
      
    // Static file serving
    } else {
      let filePath;
      
      if (pathname === '/') {
        filePath = path.join(__dirname, '..', 'data', 'html', 'index.html');
      } else if (pathname === '/site.webmanifest') {
        // Special handling for manifest file
        filePath = path.join(__dirname, '..', 'data', 'favicon', 'site.webmanifest');
      } else if (pathname === '/favicon.ico' || 
                 pathname === '/favicon.svg' || 
                 pathname === '/favicon-96x96.png' || 
                 pathname === '/apple-touch-icon.png') {
        // Special handling for favicon files at root level
        filePath = path.join(__dirname, '..', 'data', 'favicon', pathname.substring(1));
      } else if (pathname.startsWith('/html/') || 
                 pathname.startsWith('/css/') || 
                 pathname.startsWith('/js/') || 
                 pathname.startsWith('/images/') ||
                 pathname.startsWith('/favicon/')) {
        filePath = path.join(__dirname, '..', 'data', pathname.substring(1));
      } else if (pathname.endsWith('.html')) {
        // Handle HTML files directly (like /diagnostics.html)
        filePath = path.join(__dirname, '..', 'data', 'html', pathname.substring(1));
      } else {
        filePath = path.join(__dirname, '..', 'data', 'html', '404.html');
      }
      
      serveFile(res, filePath);
    }
  };
}

const server = http.createServer(createRequestHandler());
global.server = server; // Make server globally accessible for restarts

server.listen(PORT, () => {
  logServerStartup();
});

// Enable stdin for keyboard input
process.stdin.setRawMode(false);
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', (key) => {
  const input = key.toString().trim().toLowerCase();
  
  if (input === 'r') {
    console.log('===================================================');
    console.log('🔄 Restarting server >>>');
    console.log('This will pick up HTML/CSS/JS changes and reload JSON data');
    console.log('===================================================\n');

    // Force close all connections immediately
    if (server.closeAllConnections) {
      server.closeAllConnections();
    }
    
    // Close the existing server and create a new one with timeout
    const closeTimeout = setTimeout(() => {
      logError('Server close timeout - forcing restart...');
      restartServer();
    }, 1000);
    
    server.close((err) => {
      clearTimeout(closeTimeout);
      if (err) {
        logError('Error during server close:', err.message);
        return;
      }
      restartServer();
    });
    
    function restartServer() {
      logSuccess('Server closed, reloading JSON data...');
      
      // Reload JSON data files
      try {
        const reloaded = loadMockData();
        mockConfig = reloaded.mockConfig;
        mockDiagnostics = reloaded.mockDiagnostics;
        mockPrinterDiscovery = reloaded.mockPrinterDiscovery;
        mockNvsDump = reloaded.mockNvsDump;
        mockWifiScan = reloaded.mockWifiScan;
        logSuccess('JSON data reloaded successfully');
      } catch (error) {
        logError('Error reloading JSON data:', error.message);
        return;
      }
      
      logSuccess('Starting new server...');
      
      // Create and start new server
      const newServer = http.createServer(createRequestHandler());
      
      newServer.listen(PORT, () => {
        logServerStartup();
      });
      
      // Replace the global server reference after successful startup
      global.server = newServer;
    }
    
  } else if (input === 'd') {
    console.log('===================================================');
    console.log('📄 Reloading JSON data files >>>');
    console.log('===================================================\n');
    try {
      const reloaded = loadMockData();
      mockConfig = reloaded.mockConfig;
      mockDiagnostics = reloaded.mockDiagnostics;
      mockPrinterDiscovery = reloaded.mockPrinterDiscovery;
      mockNvsDump = reloaded.mockNvsDump;
      mockWifiScan = reloaded.mockWifiScan;
      logSuccess('JSON data reloaded successfully\n');
    } catch (error) {
      logError('Error reloading JSON data:', error.message);
    }
  } else if (input === 'x') {
    console.log('\nGraceful shutdown requested...');
    process.emit('SIGINT');
  } else if (input === 'q' || key === '\u0003') { // Ctrl+C
    process.emit('SIGINT');
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down mock server...');
  
  const currentServer = global.server || server;
  
  // Force close all connections immediately
  if (currentServer.closeAllConnections) {
    currentServer.closeAllConnections();
  }
  
  // Set a timeout to force exit if graceful shutdown takes too long
  const forceExitTimer = setTimeout(() => {
    console.log('⚠️ Force exiting...');
    process.exit(1);
  }, 2000);
  
  currentServer.close((err) => {
    clearTimeout(forceExitTimer);
    if (err) {
      logError('Error during shutdown:', err.message);
      process.exit(1);
    } else {
      logSuccess('Server stopped gracefully');
      process.exit(0);
    }
  });
});
