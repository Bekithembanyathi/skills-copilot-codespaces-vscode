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
import mysql from 'mysql2/promise';
import cron from 'node-cron';
import si from 'systeminformation';

const execAsync = promisify(exec);

class MySQLPerformanceMonitorServer {
  constructor() {
    this.server = new Server(
      {
        name: "mysql-performance-monitor",
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

    this.performanceHistory = [];
    this.maxHistorySize = 100;
    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "mysql_performance_snapshot",
          description: "Get current MySQL performance metrics",
          inputSchema: {
            type: "object",
            properties: {
              host: {
                type: "string",
                description: "MySQL host",
                default: "localhost",
              },
              port: {
                type: "number",
                description: "MySQL port",
                default: 3306,
              },
              user: {
                type: "string",
                description: "MySQL username",
                default: "root",
              },
              password: {
                type: "string",
                description: "MySQL password",
                default: "",
              },
            },
          },
        },
        {
          name: "mysql_process_list",
          description: "Get current MySQL process list",
          inputSchema: {
            type: "object",
            properties: {
              host: {
                type: "string",
                description: "MySQL host",
                default: "localhost",
              },
              port: {
                type: "number",
                description: "MySQL port",
                default: 3306,
              },
              user: {
                type: "string",
                description: "MySQL username",
                default: "root",
              },
              password: {
                type: "string",
                description: "MySQL password",
                default: "",
              },
            },
          },
        },
        {
          name: "mysql_slow_queries",
          description: "Get MySQL slow query information",
          inputSchema: {
            type: "object",
            properties: {
              host: {
                type: "string",
                description: "MySQL host",
                default: "localhost",
              },
              port: {
                type: "number",
                description: "MySQL port",
                default: 3306,
              },
              user: {
                type: "string",
                description: "MySQL username",
                default: "root",
              },
              password: {
                type: "string",
                description: "MySQL password",
                default: "",
              },
            },
          },
        },
        {
          name: "mysql_connection_stats",
          description: "Get MySQL connection statistics",
          inputSchema: {
            type: "object",
            properties: {
              host: {
                type: "string",
                description: "MySQL host",
                default: "localhost",
              },
              port: {
                type: "number",
                description: "MySQL port",
                default: 3306,
              },
              user: {
                type: "string",
                description: "MySQL username",
                default: "root",
              },
              password: {
                type: "string",
                description: "MySQL password",
                default: "",
              },
            },
          },
        },
        {
          name: "mysql_innodb_status",
          description: "Get InnoDB engine status",
          inputSchema: {
            type: "object",
            properties: {
              host: {
                type: "string",
                description: "MySQL host",
                default: "localhost",
              },
              port: {
                type: "number",
                description: "MySQL port",
                default: 3306,
              },
              user: {
                type: "string",
                description: "MySQL username",
                default: "root",
              },
              password: {
                type: "string",
                description: "MySQL password",
                default: "",
              },
            },
          },
        },
        {
          name: "mysql_system_metrics",
          description: "Get system-level metrics affecting MySQL performance",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "start_performance_monitoring",
          description: "Start continuous performance monitoring (stores data for trends)",
          inputSchema: {
            type: "object",
            properties: {
              interval: {
                type: "number",
                description: "Monitoring interval in seconds",
                default: 60,
              },
            },
          },
        },
        {
          name: "stop_performance_monitoring",
          description: "Stop continuous performance monitoring",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "mysql_performance_snapshot":
            return await this.getMySQLPerformanceSnapshot(args);
          case "mysql_process_list":
            return await this.getMySQLProcessList(args);
          case "mysql_slow_queries":
            return await this.getMySQLSlowQueries(args);
          case "mysql_connection_stats":
            return await this.getMySQLConnectionStats(args);
          case "mysql_innodb_status":
            return await this.getMySQLInnoDBStatus(args);
          case "mysql_system_metrics":
            return await this.getMySQLSystemMetrics();
          case "start_performance_monitoring":
            return await this.startPerformanceMonitoring(args?.interval || 60);
          case "stop_performance_monitoring":
            return await this.stopPerformanceMonitoring();
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
          uri: "mysql://performance/current",
          name: "Current MySQL Performance Metrics",
          description: "Real-time MySQL performance data",
          mimeType: "application/json",
        },
        {
          uri: "mysql://performance/history",
          name: "MySQL Performance History",
          description: "Historical MySQL performance data",
          mimeType: "application/json",
        },
        {
          uri: "mysql://performance/analysis",
          name: "MySQL Performance Analysis",
          description: "Performance analysis and recommendations",
          mimeType: "application/json",
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        switch (uri) {
          case "mysql://performance/current":
            return await this.getCurrentPerformanceResource();
          case "mysql://performance/history":
            return await this.getPerformanceHistoryResource();
          case "mysql://performance/analysis":
            return await this.getPerformanceAnalysisResource();
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
          name: "mysql_performance_analysis",
          description: "Comprehensive MySQL performance analysis prompt",
        },
        {
          name: "mysql_optimization_recommendations",
          description: "MySQL optimization recommendations prompt",
        },
        {
          name: "mysql_troubleshoot_performance",
          description: "MySQL performance troubleshooting prompt",
        },
      ],
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name } = request.params;

      switch (name) {
        case "mysql_performance_analysis":
          return {
            description: "Comprehensive MySQL performance analysis",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "Please perform a comprehensive MySQL performance analysis. Get current performance metrics, analyze slow queries, check connection statistics, and provide insights about the database performance.",
                },
              },
            ],
          };
        case "mysql_optimization_recommendations":
          return {
            description: "MySQL optimization recommendations",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "Based on the current MySQL performance metrics and system state, provide optimization recommendations. Focus on configuration tuning, query optimization, and resource allocation improvements.",
                },
              },
            ],
          };
        case "mysql_troubleshoot_performance":
          return {
            description: "MySQL performance troubleshooting",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "Help me troubleshoot MySQL performance issues. Check for bottlenecks, analyze slow queries, examine connection patterns, and suggest solutions for performance problems.",
                },
              },
            ],
          };
        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  async createConnection(config = {}) {
    const connectionConfig = {
      host: config.host || 'localhost',
      port: config.port || 3306,
      user: config.user || 'root',
      password: config.password || '',
      connectTimeout: 5000,
      acquireTimeout: 5000,
    };

    return await mysql.createConnection(connectionConfig);
  }

  async getMySQLPerformanceSnapshot(config = {}) {
    try {
      const connection = await this.createConnection(config);
      
      const queries = [
        "SHOW GLOBAL STATUS LIKE 'Queries'",
        "SHOW GLOBAL STATUS LIKE 'Connections'",
        "SHOW GLOBAL STATUS LIKE 'Threads_%'",
        "SHOW GLOBAL STATUS LIKE 'Slow_queries'",
        "SHOW GLOBAL STATUS LIKE 'Innodb_%'",
        "SHOW GLOBAL STATUS LIKE 'Key_%'",
        "SHOW GLOBAL STATUS LIKE 'Sort_%'",
        "SHOW GLOBAL STATUS LIKE 'Table_locks_%'",
      ];

      const results = {};
      
      for (const query of queries) {
        try {
          const [rows] = await connection.execute(query);
          const category = query.split("LIKE '")[1].replace("'", "").replace("%", "");
          results[category] = rows;
        } catch (error) {
          results[query] = { error: error.message };
        }
      }

      await connection.end();

      const snapshot = {
        timestamp: new Date().toISOString(),
        metrics: results,
      };

      // Store in history
      this.performanceHistory.push(snapshot);
      if (this.performanceHistory.length > this.maxHistorySize) {
        this.performanceHistory.shift();
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(snapshot, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting MySQL performance snapshot: ${error.message}`,
          },
        ],
      };
    }
  }

  async getMySQLProcessList(config = {}) {
    try {
      const connection = await this.createConnection(config);
      
      const [rows] = await connection.execute("SHOW FULL PROCESSLIST");
      await connection.end();

      const processInfo = {
        timestamp: new Date().toISOString(),
        totalProcesses: rows.length,
        processes: rows,
        summary: {
          sleeping: rows.filter(p => p.Command === 'Sleep').length,
          query: rows.filter(p => p.Command === 'Query').length,
          connect: rows.filter(p => p.Command === 'Connect').length,
        },
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(processInfo, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting MySQL process list: ${error.message}`,
          },
        ],
      };
    }
  }

  async getMySQLSlowQueries(config = {}) {
    try {
      const connection = await this.createConnection(config);
      
      const queries = [
        "SHOW GLOBAL STATUS LIKE 'Slow_queries'",
        "SHOW GLOBAL VARIABLES LIKE 'slow_query_log'",
        "SHOW GLOBAL VARIABLES LIKE 'long_query_time'",
        "SHOW GLOBAL VARIABLES LIKE 'slow_query_log_file'",
      ];

      const results = {};
      
      for (const query of queries) {
        try {
          const [rows] = await connection.execute(query);
          const key = query.split("LIKE '")[1].replace("'", "");
          results[key] = rows;
        } catch (error) {
          results[query] = { error: error.message };
        }
      }

      await connection.end();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              timestamp: new Date().toISOString(),
              slowQueryInfo: results,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting MySQL slow queries: ${error.message}`,
          },
        ],
      };
    }
  }

  async getMySQLConnectionStats(config = {}) {
    try {
      const connection = await this.createConnection(config);
      
      const queries = [
        "SHOW GLOBAL STATUS LIKE 'Connections'",
        "SHOW GLOBAL STATUS LIKE 'Max_used_connections'",
        "SHOW GLOBAL STATUS LIKE 'Threads_connected'",
        "SHOW GLOBAL STATUS LIKE 'Threads_running'",
        "SHOW GLOBAL STATUS LIKE 'Aborted_%'",
        "SHOW GLOBAL VARIABLES LIKE 'max_connections'",
      ];

      const results = {};
      
      for (const query of queries) {
        try {
          const [rows] = await connection.execute(query);
          const key = query.split("LIKE '")[1].replace("'", "").replace("%", "");
          results[key] = rows;
        } catch (error) {
          results[query] = { error: error.message };
        }
      }

      await connection.end();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              timestamp: new Date().toISOString(),
              connectionStats: results,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting MySQL connection stats: ${error.message}`,
          },
        ],
      };
    }
  }

  async getMySQLInnoDBStatus(config = {}) {
    try {
      const connection = await this.createConnection(config);
      
      const [rows] = await connection.execute("SHOW ENGINE INNODB STATUS");
      await connection.end();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              timestamp: new Date().toISOString(),
              innodbStatus: rows,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting MySQL InnoDB status: ${error.message}`,
          },
        ],
      };
    }
  }

  async getMySQLSystemMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        cpu: await si.currentLoad(),
        memory: await si.mem(),
        disk: await si.fsSize(),
        network: await si.networkStats(),
        load: await si.currentLoad(),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(metrics, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error getting system metrics: ${error.message}`,
          },
        ],
      };
    }
  }

  async startPerformanceMonitoring(interval = 60) {
    try {
      if (this.monitoringTask) {
        this.monitoringTask.stop();
      }

      this.monitoringTask = cron.schedule(`*/${interval} * * * * *`, async () => {
        try {
          await this.getMySQLPerformanceSnapshot();
        } catch (error) {
          console.error('Monitoring error:', error);
        }
      });

      this.monitoringTask.start();

      return {
        content: [
          {
            type: "text",
            text: `✅ Performance monitoring started with ${interval} second interval`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error starting performance monitoring: ${error.message}`,
          },
        ],
      };
    }
  }

  async stopPerformanceMonitoring() {
    try {
      if (this.monitoringTask) {
        this.monitoringTask.stop();
        this.monitoringTask = null;
      }

      return {
        content: [
          {
            type: "text",
            text: "✅ Performance monitoring stopped",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error stopping performance monitoring: ${error.message}`,
          },
        ],
      };
    }
  }

  async getCurrentPerformanceResource() {
    const currentMetrics = await this.getMySQLPerformanceSnapshot();
    
    return {
      contents: [
        {
          uri: "mysql://performance/current",
          mimeType: "application/json",
          text: currentMetrics.content[0].text,
        },
      ],
    };
  }

  async getPerformanceHistoryResource() {
    return {
      contents: [
        {
          uri: "mysql://performance/history",
          mimeType: "application/json",
          text: JSON.stringify({
            totalRecords: this.performanceHistory.length,
            maxSize: this.maxHistorySize,
            history: this.performanceHistory,
          }, null, 2),
        },
      ],
    };
  }

  async getPerformanceAnalysisResource() {
    const analysis = {
      timestamp: new Date().toISOString(),
      historySize: this.performanceHistory.length,
      recommendations: [],
      alerts: [],
    };

    if (this.performanceHistory.length > 1) {
      const latest = this.performanceHistory[this.performanceHistory.length - 1];
      const previous = this.performanceHistory[this.performanceHistory.length - 2];
      
      // Simple trend analysis
      analysis.trends = {
        queriesIncreasing: this.compareMetric(latest, previous, 'Queries'),
        connectionsIncreasing: this.compareMetric(latest, previous, 'Connections'),
      };
    }

    return {
      contents: [
        {
          uri: "mysql://performance/analysis",
          mimeType: "application/json",
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  compareMetric(latest, previous, metricName) {
    try {
      const latestValue = latest.metrics[metricName]?.[0]?.Value;
      const previousValue = previous.metrics[metricName]?.[0]?.Value;
      
      if (latestValue && previousValue) {
        return parseFloat(latestValue) > parseFloat(previousValue);
      }
    } catch (error) {
      // Ignore comparison errors
    }
    return null;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MySQL Performance Monitor MCP server running on stdio");
  }
}

const server = new MySQLPerformanceMonitorServer();
server.run().catch(console.error);