#!/usr/bin/env node

const http = require('http');

const HEALTH_ENDPOINT = 'http://localhost:3000/api/health';
const TIMEOUT_MS = 5000;

async function checkHealth() {
  return new Promise((resolve, reject) => {
    const request = http.get(HEALTH_ENDPOINT, {
      timeout: TIMEOUT_MS
    }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const health = JSON.parse(data);
          if (health.healthy === true) {
            resolve(true);
          } else {
            console.error('Health check failed:', health.error || 'Unknown error');
            resolve(false);
          }
        } catch (error) {
          console.error('Failed to parse health check response:', error);
          resolve(false);
        }
      });
    });

    request.on('error', (error) => {
      console.error('Health check request failed:', error.message);
      resolve(false);
    });

    request.on('timeout', () => {
      request.destroy();
      console.error('Health check timed out after', TIMEOUT_MS, 'ms');
      resolve(false);
    });
  });
}

// Run health check and exit with appropriate code
checkHealth().then(healthy => {
  process.exit(healthy ? 0 : 1);
});
