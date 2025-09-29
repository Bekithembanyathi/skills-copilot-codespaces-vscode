#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class MySQLServiceManagerServer {
  constructor() {
    this.server = new Server(
      {
        name: "mysql-service-manager",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "mysql_service_status",
          description: "Check MySQL service status using systemctl",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "start_mysql_service",
          description: "Start MySQL service",
          inputSchema: {
            type: "object",
            properties: {
              service_name: {
                type: "string",
                description: "MySQL service name (mysql, mysqld, mariadb)",
                default: "mysql",
              },
            },
          },
        },
        {
          name: "stop_mysql_service",
          description: "Stop MySQL service",
          inputSchema: {
            type: "object",
            properties: {
              service_name: {
                type: "string",
                description: "MySQL service name (mysql, mysqld, mariadb)",
                default: "mysql",
              },
            },
          },
        },
        {
          name: "restart_mysql_service",
          description: "Restart MySQL service",
          inputSchema: {
            type: "object",
            properties: {
              service_name: {
                type: "string",
                description: "MySQL service name (mysql, mysqld, mariadb)",
                default: "mysql",
              },
            },
          },
        },
        {
          name: "reload_mysql_service",
          description: "Reload MySQL service configuration",
          inputSchema: {
            type: "object",
            properties: {
              service_name: {
                type: "string",
                description: "MySQL service name (mysql, mysqld, mariadb)",
                default: "mysql",
              },
            },
          },
        },
        {
          name: "enable_mysql_service",
          description: "Enable MySQL service to start on boot",
          inputSchema: {
            type: "object",
            properties: {
              service_name: {
                type: "string",
                description: "MySQL service name (mysql, mysqld, mariadb)",
                default: "mysql",
              },
            },
          },
        },
        {
          name: "disable_mysql_service",
          description: "Disable MySQL service from starting on boot",
          inputSchema: {
            type: "object",
            properties: {
              service_name: {
                type: "string",
                description: "MySQL service name (mysql, mysqld, mariadb)",
                default: "mysql",
              },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "mysql_service_status":
            return await this.getMySQLServiceStatus();
          case "start_mysql_service":
            return await this.startMySQLService(args?.service_name || "mysql");
          case "stop_mysql_service":
            return await this.stopMySQLService(args?.service_name || "mysql");
          case "restart_mysql_service":
            return await this.restartMySQLService(args?.service_name || "mysql");
          case "reload_mysql_service":
            return await this.reloadMySQLService(args?.service_name || "mysql");
          case "enable_mysql_service":
            return await this.enableMySQLService(args?.service_name || "mysql");
          case "disable_mysql_service":
            return await this.disableMySQLService(args?.service_name || "mysql");
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error executing ${name}: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "mysql://service/status",
          name: "MySQL Service Status",
          description: "Current MySQL service status and configuration",
          mimeType: "application/json",
        },
        {
          uri: "mysql://service/logs",
          name: "MySQL Service Logs",
          description: "Recent MySQL service logs",
          mimeType: "text/plain",
        },
        {
          uri: "mysql://service/config",
          name: "MySQL Service Configuration",
          description: "MySQL service configuration files and settings",
          mimeType: "application/json",
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        switch (uri) {
          case "mysql://service/status":
            return await this.getServiceStatusResource();
          case "mysql://service/logs":
            return await this.getServiceLogsResource();
          case "mysql://service/config":
            return await this.getServiceConfigResource();
          default:
            throw new Error(`Unknown resource: ${uri}`);
        }
      } catch (error) {
        throw new Error(`Error reading resource ${uri}: ${error.message}`);
      }
    });
  }

  setupPromptHandlers() {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: "mysql_service_management",
          description: "MySQL service management guidance prompt",
        },
        {
          name: "mysql_service_troubleshoot",
          description: "MySQL service troubleshooting prompt",
        },
        {
          name: "mysql_service_maintenance",
          description: "MySQL service maintenance procedures prompt",
        },
      ],
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name } = request.params;

      switch (name) {
        case "mysql_service_management":
          return {
            description: "MySQL service management guidance",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "Please help me manage MySQL services. Check the current status, provide guidance on starting/stopping/restarting services, and explain best practices for MySQL service management.",
                },
              },
            ],
          };
        case "mysql_service_troubleshoot":
          return {
            description: "MySQL service troubleshooting",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "I'm having issues with MySQL service. Please check the service status, analyze any problems, review recent logs, and provide troubleshooting steps to resolve common MySQL service issues.",
                },
              },
            ],
          };
        case "mysql_service_maintenance":
          return {
            description: "MySQL service maintenance procedures",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "Guide me through MySQL service maintenance procedures including safe restart methods, configuration reloading, and ensuring service reliability.",
                },
              },
            ],
          };
        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  async detectMySQLService() {
    const services = ["mysql", "mysqld", "mariadb", "mysql.service", "mysqld.service", "mariadb.service"];
    
    for (const service of services) {
      try {
        await execAsync(`systemctl list-unit-files | grep -q "^${service}"`);
        return service;
      } catch (error) {
        // Service not found, try next
      }
    }
    
    return "mysql"; // Default fallback
  }

  async getMySQLServiceStatus() {
    try {
      const serviceName = await this.detectMySQLService();
      const commands = [
        `systemctl status ${serviceName}`,
        `systemctl is-active ${serviceName}`,
        `systemctl is-enabled ${serviceName}`,
      ];

      const results = {};
      
      for (const cmd of commands) {
        try {
          const { stdout, stderr } = await execAsync(cmd);
          const cmdName = cmd.split(' ').slice(-1)[0];
          results[cmdName] = {
            success: true,
            output: stdout.trim(),
            error: stderr.trim(),
          };
        } catch (error) {
          const cmdName = cmd.split(' ').slice(-1)[0];
          results[cmdName] = {
            success: false,
            output: error.stdout || "",
            error: error.stderr || error.message,
          };
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              serviceName,
              timestamp: new Date().toISOString(),
              status: results,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting MySQL service status: ${error.message}`,
          },
        ],
      };
    }
  }

  async startMySQLService(serviceName) {
    try {
      const { stdout, stderr } = await execAsync(`sudo systemctl start ${serviceName}`);
      
      // Check if service started successfully
      const { stdout: statusOutput } = await execAsync(`systemctl is-active ${serviceName}`);
      
      return {
        content: [
          {
            type: "text",
            text: `✅ MySQL service '${serviceName}' start command executed.\nStatus: ${statusOutput.trim()}\nOutput: ${stdout}\nErrors: ${stderr}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to start MySQL service '${serviceName}': ${error.message}`,
          },
        ],
      };
    }
  }

  async stopMySQLService(serviceName) {
    try {
      const { stdout, stderr } = await execAsync(`sudo systemctl stop ${serviceName}`);
      
      // Check if service stopped successfully
      const { stdout: statusOutput } = await execAsync(`systemctl is-active ${serviceName}`);
      
      return {
        content: [
          {
            type: "text",
            text: `✅ MySQL service '${serviceName}' stop command executed.\nStatus: ${statusOutput.trim()}\nOutput: ${stdout}\nErrors: ${stderr}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to stop MySQL service '${serviceName}': ${error.message}`,
          },
        ],
      };
    }
  }

  async restartMySQLService(serviceName) {
    try {
      const { stdout, stderr } = await execAsync(`sudo systemctl restart ${serviceName}`);
      
      // Wait a moment for service to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if service restarted successfully
      const { stdout: statusOutput } = await execAsync(`systemctl is-active ${serviceName}`);
      
      return {
        content: [
          {
            type: "text",
            text: `✅ MySQL service '${serviceName}' restart command executed.\nStatus: ${statusOutput.trim()}\nOutput: ${stdout}\nErrors: ${stderr}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to restart MySQL service '${serviceName}': ${error.message}`,
          },
        ],
      };
    }
  }

  async reloadMySQLService(serviceName) {
    try {
      const { stdout, stderr } = await execAsync(`sudo systemctl reload ${serviceName}`);
      
      return {
        content: [
          {
            type: "text",
            text: `✅ MySQL service '${serviceName}' reload command executed.\nOutput: ${stdout}\nErrors: ${stderr}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to reload MySQL service '${serviceName}': ${error.message}`,
          },
        ],
      };
    }
  }

  async enableMySQLService(serviceName) {
    try {
      const { stdout, stderr } = await execAsync(`sudo systemctl enable ${serviceName}`);
      
      // Check if service is enabled
      const { stdout: enabledOutput } = await execAsync(`systemctl is-enabled ${serviceName}`);
      
      return {
        content: [
          {
            type: "text",
            text: `✅ MySQL service '${serviceName}' enable command executed.\nEnabled: ${enabledOutput.trim()}\nOutput: ${stdout}\nErrors: ${stderr}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to enable MySQL service '${serviceName}': ${error.message}`,
          },
        ],
      };
    }
  }

  async disableMySQLService(serviceName) {
    try {
      const { stdout, stderr } = await execAsync(`sudo systemctl disable ${serviceName}`);
      
      // Check if service is disabled
      const { stdout: enabledOutput } = await execAsync(`systemctl is-enabled ${serviceName}`);
      
      return {
        content: [
          {
            type: "text",
            text: `✅ MySQL service '${serviceName}' disable command executed.\nEnabled: ${enabledOutput.trim()}\nOutput: ${stdout}\nErrors: ${stderr}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to disable MySQL service '${serviceName}': ${error.message}`,
          },
        ],
      };
    }
  }

  async getServiceStatusResource() {
    const statusInfo = await this.getMySQLServiceStatus();
    
    return {
      contents: [
        {
          uri: "mysql://service/status",
          mimeType: "application/json",
          text: statusInfo.content[0].text,
        },
      ],
    };
  }

  async getServiceLogsResource() {
    try {
      const serviceName = await this.detectMySQLService();
      const { stdout } = await execAsync(`journalctl -u ${serviceName} --no-pager -n 50`);
      
      return {
        contents: [
          {
            uri: "mysql://service/logs",
            mimeType: "text/plain",
            text: stdout,
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri: "mysql://service/logs",
            mimeType: "text/plain",
            text: `Error retrieving service logs: ${error.message}`,
          },
        ],
      };
    }
  }

  async getServiceConfigResource() {
    try {
      const serviceName = await this.detectMySQLService();
      
      let configData = {
        serviceName,
        timestamp: new Date().toISOString(),
        systemdUnit: {},
        configFiles: [],
      };

      // Get systemd unit file information
      try {
        const { stdout } = await execAsync(`systemctl cat ${serviceName}`);
        configData.systemdUnit.content = stdout;
      } catch (error) {
        configData.systemdUnit.error = error.message;
      }

      // Find MySQL configuration files
      try {
        const { stdout } = await execAsync(`find /etc -name "*.cnf" -o -name "my.cnf" 2>/dev/null | head -10`);
        configData.configFiles = stdout.trim().split('\n').filter(file => file);
      } catch (error) {
        configData.configFiles = [];
      }

      return {
        contents: [
          {
            uri: "mysql://service/config",
            mimeType: "application/json",
            text: JSON.stringify(configData, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Error getting service config: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MySQL Service Manager MCP server running on stdio");
  }
}

const server = new MySQLServiceManagerServer();
server.run().catch(console.error);