#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

/**
 * Simple MCP client for testing server functionality
 */
class MCPTestClient {
  constructor(serverPath) {
    this.serverPath = serverPath;
  }

  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      const server = spawn('node', [this.serverPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let responseData = '';
      let errorData = '';

      server.stdout.on('data', (data) => {
        responseData += data.toString();
      });

      server.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      server.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout: responseData, stderr: errorData });
        } else {
          reject(new Error(`Server exited with code ${code}: ${errorData}`));
        }
      });

      server.on('error', (error) => {
        reject(error);
      });

      // Send the message
      server.stdin.write(JSON.stringify(message) + '\n');
      server.stdin.end();

      // Timeout after 5 seconds
      setTimeout(() => {
        server.kill('SIGTERM');
        reject(new Error('Test timeout'));
      }, 5000);
    });
  }

  async testListTools() {
    const message = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {}
    };

    try {
      const response = await this.sendMessage(message);
      console.log('✅ List Tools Response:', response.stdout.trim());
      return true;
    } catch (error) {
      console.log('❌ List Tools Error:', error.message);
      return false;
    }
  }

  async testListResources() {
    const message = {
      jsonrpc: "2.0",
      id: 2,
      method: "resources/list",
      params: {}
    };

    try {
      const response = await this.sendMessage(message);
      console.log('✅ List Resources Response:', response.stdout.trim());
      return true;
    } catch (error) {
      console.log('❌ List Resources Error:', error.message);
      return false;
    }
  }

  async testListPrompts() {
    const message = {
      jsonrpc: "2.0",
      id: 3,
      method: "prompts/list",
      params: {}
    };

    try {
      const response = await this.sendMessage(message);
      console.log('✅ List Prompts Response:', response.stdout.trim());
      return true;
    } catch (error) {
      console.log('❌ List Prompts Error:', error.message);
      return false;
    }
  }
}

async function testAllServers() {
  const servers = [
    {
      name: 'MySQL Process Monitor',
      path: 'servers/mysql-process-monitor/index.js'
    },
    {
      name: 'MySQL Service Manager',
      path: 'servers/mysql-service-manager/index.js'
    },
    {
      name: 'MySQL Performance Monitor',
      path: 'servers/mysql-performance-monitor/index.js'
    }
  ];

  console.log('🧪 Testing MCP Server Protocol Communication');
  console.log('=' .repeat(50));

  for (const server of servers) {
    console.log(`\n📡 Testing ${server.name}...`);
    console.log('-'.repeat(30));

    const client = new MCPTestClient(server.path);
    
    // Test basic protocol methods
    await client.testListTools();
    await client.testListResources();
    await client.testListPrompts();
  }

  console.log('\n🎉 MCP Protocol Tests Complete!');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAllServers().catch(console.error);
}