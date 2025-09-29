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
import si from 'systeminformation';

const execAsync = promisify(exec);

class MySQLProcessMonitorServer {
  constructor() {
    this.server = new Server(
      {
        name: "mysql-process-monitor",
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
          name: "check_mysql_process",
          description: "Check if MySQL process is running and get process details",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_mysql_pid",
          description: "Get MySQL process ID and details",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "mysql_process_stats",
          description: "Get detailed MySQL process statistics including CPU and memory usage",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "kill_mysql_process",
          description: "Forcefully kill MySQL process by PID",
          inputSchema: {
            type: "object",
            properties: {
              force: {
                type: "boolean",
                description: "Whether to force kill (SIGKILL) or graceful kill (SIGTERM)",
                default: false,
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
          case "check_mysql_process":
            return await this.checkMySQLProcess();
          case "get_mysql_pid":
            return await this.getMySQLPID();
          case "mysql_process_stats":
            return await this.getMySQLProcessStats();
          case "kill_mysql_process":
            return await this.killMySQLProcess(args?.force || false);
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
          uri: "mysql://process/status",
          name: "MySQL Process Status",
          description: "Current MySQL process status and information",
          mimeType: "application/json",
        },
        {
          uri: "mysql://process/config",
          name: "MySQL Process Configuration",
          description: "MySQL process configuration and runtime parameters",
          mimeType: "application/json",
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        switch (uri) {
          case "mysql://process/status":
            return await this.getProcessStatusResource();
          case "mysql://process/config":
            return await this.getProcessConfigResource();
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
          name: "mysql_health_check",
          description: "Comprehensive MySQL process health check prompt",
        },
        {
          name: "mysql_troubleshoot",
          description: "MySQL process troubleshooting guide prompt",
        },
      ],
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name } = request.params;

      switch (name) {
        case "mysql_health_check":
          return {
            description: "Comprehensive MySQL process health check",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "Please perform a comprehensive health check of the MySQL process. Check if it's running, get process statistics, and provide recommendations for any issues found.",
                },
              },
            ],
          };
        case "mysql_troubleshoot":
          return {
            description: "MySQL process troubleshooting guide",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "Help me troubleshoot MySQL process issues. Check the process status, analyze any problems, and suggest solutions for common MySQL process problems like high CPU usage, memory leaks, or unresponsive processes.",
                },
              },
            ],
          };
        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  async checkMySQLProcess() {
    try {
      const { stdout } = await execAsync('pgrep -f mysql');
      const pids = stdout.trim().split('\n').filter(pid => pid);
      
      if (pids.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "❌ MySQL process is not running",
            },
          ],
        };
      }

      const processInfo = [];
      for (const pid of pids) {
        try {
          const { stdout: psOutput } = await execAsync(`ps -p ${pid} -o pid,ppid,cmd,etime,%cpu,%mem --no-headers`);
          processInfo.push(psOutput.trim());
        } catch (error) {
          // Process might have died between pgrep and ps
        }
      }

      return {
        content: [
          {
            type: "text",
            text: `✅ MySQL process(es) running:\n${processInfo.join('\n')}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ MySQL process is not running or error checking: ${error.message}`,
          },
        ],
      };
    }
  }

  async getMySQLPID() {
    try {
      const { stdout } = await execAsync('pgrep -f mysqld');
      const pids = stdout.trim().split('\n').filter(pid => pid);
      
      if (pids.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No MySQL daemon process found",
            },
          ],
        };
      }

      const pidInfo = {
        pids: pids,
        count: pids.length,
        details: []
      };

      for (const pid of pids) {
        try {
          const { stdout: details } = await execAsync(`ps -p ${pid} -o pid,ppid,user,cmd,etime,%cpu,%mem,vsz,rss --no-headers`);
          pidInfo.details.push(details.trim());
        } catch (error) {
          pidInfo.details.push(`PID ${pid}: Process information unavailable`);
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(pidInfo, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting MySQL PID: ${error.message}`,
          },
        ],
      };
    }
  }

  async getMySQLProcessStats() {
    try {
      const processes = await si.processes();
      const mysqlProcesses = processes.list.filter(proc => 
        proc.name.toLowerCase().includes('mysql') || 
        proc.command.toLowerCase().includes('mysql')
      );

      if (mysqlProcesses.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No MySQL processes found in system information",
            },
          ],
        };
      }

      const stats = {
        processCount: mysqlProcesses.length,
        totalCPU: mysqlProcesses.reduce((sum, proc) => sum + proc.cpu, 0),
        totalMemory: mysqlProcesses.reduce((sum, proc) => sum + proc.mem, 0),
        processes: mysqlProcesses.map(proc => ({
          pid: proc.pid,
          name: proc.name,
          cpu: proc.cpu,
          memory: proc.mem,
          state: proc.state,
          started: proc.started,
          user: proc.user,
        }))
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting MySQL process stats: ${error.message}`,
          },
        ],
      };
    }
  }

  async killMySQLProcess(force = false) {
    try {
      const { stdout } = await execAsync('pgrep -f mysqld');
      const pids = stdout.trim().split('\n').filter(pid => pid);
      
      if (pids.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No MySQL processes found to kill",
            },
          ],
        };
      }

      const signal = force ? 'SIGKILL' : 'SIGTERM';
      const results = [];

      for (const pid of pids) {
        try {
          await execAsync(`kill -${signal} ${pid}`);
          results.push(`✅ Sent ${signal} to PID ${pid}`);
        } catch (error) {
          results.push(`❌ Failed to kill PID ${pid}: ${error.message}`);
        }
      }

      return {
        content: [
          {
            type: "text",
            text: results.join('\n'),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error killing MySQL process: ${error.message}`,
          },
        ],
      };
    }
  }

  async getProcessStatusResource() {
    const processInfo = await this.checkMySQLProcess();
    const pidInfo = await this.getMySQLPID();
    const stats = await this.getMySQLProcessStats();

    return {
      contents: [
        {
          uri: "mysql://process/status",
          mimeType: "application/json",
          text: JSON.stringify({
            timestamp: new Date().toISOString(),
            status: processInfo,
            pids: pidInfo,
            statistics: stats,
          }, null, 2),
        },
      ],
    };
  }

  async getProcessConfigResource() {
    try {
      // Try to get MySQL configuration
      let config = {};
      
      try {
        const { stdout } = await execAsync('mysql --help --verbose | grep "Default options"');
        config.defaultOptions = stdout.trim();
      } catch (error) {
        config.defaultOptions = "Unable to retrieve default options";
      }

      try {
        const { stdout } = await execAsync('find /etc -name "my.cnf" -o -name "mysql.conf" 2>/dev/null | head -5');
        config.configFiles = stdout.trim().split('\n').filter(file => file);
      } catch (error) {
        config.configFiles = [];
      }

      return {
        contents: [
          {
            uri: "mysql://process/config",
            mimeType: "application/json",
            text: JSON.stringify({
              timestamp: new Date().toISOString(),
              configuration: config,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Error getting process config: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MySQL Process Monitor MCP server running on stdio");
  }
}

const server = new MySQLProcessMonitorServer();
server.run().catch(console.error);