#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MCPServerManager {
  constructor() {
    this.servers = new Map();
    this.configPath = join(__dirname, 'config', 'mcp-config.json');
  }

  loadConfig() {
    try {
      const configData = readFileSync(this.configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error(`Error loading config from ${this.configPath}:`, error.message);
      process.exit(1);
    }
  }

  startServer(name, config) {
    if (this.servers.has(name)) {
      console.log(`Server ${name} is already running`);
      return;
    }

    console.log(`Starting MCP server: ${name}`);
    
    const serverProcess = spawn(config.command, config.args, {
      cwd: __dirname,
      env: { ...process.env, ...config.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`[${name}] ${data.toString().trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[${name}] ${data.toString().trim()}`);
    });

    serverProcess.on('close', (code) => {
      console.log(`[${name}] Process exited with code ${code}`);
      this.servers.delete(name);
    });

    serverProcess.on('error', (error) => {
      console.error(`[${name}] Error:`, error.message);
      this.servers.delete(name);
    });

    this.servers.set(name, serverProcess);
  }

  stopServer(name) {
    const server = this.servers.get(name);
    if (!server) {
      console.log(`Server ${name} is not running`);
      return;
    }

    console.log(`Stopping MCP server: ${name}`);
    server.kill('SIGTERM');
    this.servers.delete(name);
  }

  stopAllServers() {
    console.log('Stopping all MCP servers...');
    for (const [name, server] of this.servers) {
      console.log(`Stopping ${name}...`);
      server.kill('SIGTERM');
    }
    this.servers.clear();
  }

  listServers() {
    console.log('MCP Server Status:');
    const config = this.loadConfig();
    
    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      const status = this.servers.has(name) ? 'Running' : 'Stopped';
      console.log(`  ${name}: ${status}`);
    }
  }

  run() {
    const args = process.argv.slice(2);
    const command = args[0];
    const serverName = args[1];

    switch (command) {
      case 'start':
        if (serverName) {
          const config = this.loadConfig();
          const serverConfig = config.mcpServers[serverName];
          if (serverConfig) {
            this.startServer(serverName, serverConfig);
          } else {
            console.error(`Unknown server: ${serverName}`);
            this.showUsage();
          }
        } else {
          // Start all servers
          const config = this.loadConfig();
          for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
            this.startServer(name, serverConfig);
          }
        }
        break;

      case 'stop':
        if (serverName) {
          this.stopServer(serverName);
        } else {
          this.stopAllServers();
        }
        break;

      case 'restart':
        if (serverName) {
          this.stopServer(serverName);
          setTimeout(() => {
            const config = this.loadConfig();
            const serverConfig = config.mcpServers[serverName];
            if (serverConfig) {
              this.startServer(serverName, serverConfig);
            }
          }, 1000);
        } else {
          this.stopAllServers();
          setTimeout(() => {
            const config = this.loadConfig();
            for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
              this.startServer(name, serverConfig);
            }
          }, 1000);
        }
        break;

      case 'status':
        this.listServers();
        break;

      case 'list':
        this.listServers();
        break;

      default:
        this.showUsage();
    }

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nReceived SIGINT. Shutting down gracefully...');
      this.stopAllServers();
      setTimeout(() => process.exit(0), 2000);
    });

    process.on('SIGTERM', () => {
      console.log('\nReceived SIGTERM. Shutting down gracefully...');
      this.stopAllServers();
      setTimeout(() => process.exit(0), 2000);
    });
  }

  showUsage() {
    console.log(`
MySQL MCP Server Manager

Usage:
  node index.js <command> [server-name]

Commands:
  start [server-name]    Start all servers or specific server
  stop [server-name]     Stop all servers or specific server  
  restart [server-name]  Restart all servers or specific server
  status                 Show server status
  list                   List all available servers

Available servers:
  mysql-process-monitor    - Monitor MySQL processes
  mysql-service-manager    - Manage MySQL services
  mysql-performance-monitor - Monitor MySQL performance

Examples:
  node index.js start                          # Start all servers
  node index.js start mysql-process-monitor    # Start specific server
  node index.js stop                           # Stop all servers
  node index.js restart mysql-service-manager  # Restart specific server
  node index.js status                         # Show status
`);
  }
}

const manager = new MCPServerManager();
manager.run();