# MySQL MCP Servers

A comprehensive set of 3 Model Context Protocol (MCP) servers for monitoring and managing MySQL database services. These servers provide tools, resources, and prompts for process monitoring, service management, and performance analysis.

## 🚀 Overview

This project includes three specialized MCP servers:

1. **MySQL Process Monitor** - Monitor MySQL processes and system resources
2. **MySQL Service Manager** - Manage MySQL services (start/stop/restart/reload)
3. **MySQL Performance Monitor** - Monitor MySQL performance metrics and analytics

## 📁 Project Structure

```
mysql-mcp-servers/
├── servers/
│   ├── mysql-process-monitor/     # Process monitoring MCP server
│   ├── mysql-service-manager/     # Service management MCP server
│   └── mysql-performance-monitor/ # Performance monitoring MCP server
├── config/
│   ├── mcp-config.json           # MCP server configuration
│   └── mysql-config.json         # MySQL connection configuration
├── index.js                      # Main server manager
├── package.json                  # Project dependencies
└── README.md                     # This file
```

## 🛠 Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd skills-copilot-codespaces-vscode
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure MySQL connection (optional):**
   Edit `config/mysql-config.json` to match your MySQL setup:
   ```json
   {
     "mysql": {
       "host": "localhost",
       "port": 3306,
       "user": "root",
       "password": "your-password"
     }
   }
   ```

## 🎯 Usage

### Server Manager

Use the main server manager to control all MCP servers:

```bash
# Start all servers
node index.js start

# Start specific server
node index.js start mysql-process-monitor

# Stop all servers
node index.js stop

# Restart specific server
node index.js restart mysql-service-manager

# Check server status
node index.js status
```

### Individual Servers

You can also run servers individually:

```bash
# Process Monitor
npm run start:process-monitor

# Service Manager
npm run start:service-manager

# Performance Monitor
npm run start:performance-monitor
```

## 📊 MCP Server Details

### 1. MySQL Process Monitor

**Purpose:** Monitor MySQL processes and system resources

**Tools:**
- `check_mysql_process` - Check if MySQL process is running
- `get_mysql_pid` - Get MySQL process ID and details
- `mysql_process_stats` - Get detailed process statistics
- `kill_mysql_process` - Forcefully kill MySQL process

**Resources:**
- `mysql://process/status` - Current process status
- `mysql://process/config` - Process configuration

**Prompts:**
- `mysql_health_check` - Comprehensive health check
- `mysql_troubleshoot` - Process troubleshooting guide

### 2. MySQL Service Manager

**Purpose:** Manage MySQL services (systemctl operations)

**Tools:**
- `mysql_service_status` - Check service status
- `start_mysql_service` - Start MySQL service
- `stop_mysql_service` - Stop MySQL service
- `restart_mysql_service` - Restart MySQL service
- `reload_mysql_service` - Reload service configuration
- `enable_mysql_service` - Enable service on boot
- `disable_mysql_service` - Disable service on boot

**Resources:**
- `mysql://service/status` - Service status information
- `mysql://service/logs` - Recent service logs
- `mysql://service/config` - Service configuration

**Prompts:**
- `mysql_service_management` - Service management guidance
- `mysql_service_troubleshoot` - Service troubleshooting
- `mysql_service_maintenance` - Maintenance procedures

### 3. MySQL Performance Monitor

**Purpose:** Monitor MySQL performance metrics and analytics

**Tools:**
- `mysql_performance_snapshot` - Get current performance metrics
- `mysql_process_list` - Get current process list
- `mysql_slow_queries` - Get slow query information
- `mysql_connection_stats` - Get connection statistics
- `mysql_innodb_status` - Get InnoDB engine status
- `mysql_system_metrics` - Get system-level metrics
- `start_performance_monitoring` - Start continuous monitoring
- `stop_performance_monitoring` - Stop continuous monitoring

**Resources:**
- `mysql://performance/current` - Real-time performance data
- `mysql://performance/history` - Historical performance data
- `mysql://performance/analysis` - Performance analysis and recommendations

**Prompts:**
- `mysql_performance_analysis` - Comprehensive performance analysis
- `mysql_optimization_recommendations` - Optimization recommendations
- `mysql_troubleshoot_performance` - Performance troubleshooting

## 🔧 Configuration

### MCP Server Configuration (`config/mcp-config.json`)

```json
{
  "mcpServers": {
    "mysql-process-monitor": {
      "command": "node",
      "args": ["servers/mysql-process-monitor/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### MySQL Configuration (`config/mysql-config.json`)

```json
{
  "mysql": {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "",
    "connectTimeout": 5000
  },
  "monitoring": {
    "performanceHistorySize": 100,
    "defaultMonitoringInterval": 60
  },
  "security": {
    "enableSudo": true,
    "allowServiceManagement": true,
    "allowProcessKill": true
  }
}
```

## 🔒 Security Considerations

- **Sudo Access:** Service management operations require sudo privileges
- **MySQL Credentials:** Store MySQL credentials securely
- **Process Control:** Be cautious with process kill operations
- **Network Access:** Ensure proper firewall configuration

## 📝 Examples

### Monitoring MySQL Process
```javascript
// Check if MySQL is running
const result = await callTool("check_mysql_process", {});

// Get detailed process statistics
const stats = await callTool("mysql_process_stats", {});
```

### Managing MySQL Service
```javascript
// Restart MySQL service
const result = await callTool("restart_mysql_service", {
  service_name: "mysql"
});

// Check service status
const status = await callTool("mysql_service_status", {});
```

### Performance Monitoring
```javascript
// Get performance snapshot
const metrics = await callTool("mysql_performance_snapshot", {
  host: "localhost",
  user: "root",
  password: "password"
});

// Start continuous monitoring
const monitoring = await callTool("start_performance_monitoring", {
  interval: 30
});
```

## 🐛 Troubleshooting

### Common Issues

1. **MySQL Connection Failed**
   - Check MySQL credentials in config
   - Verify MySQL server is running
   - Check network connectivity

2. **Permission Denied (Service Management)**
   - Ensure user has sudo privileges
   - Check systemctl access

3. **Process Not Found**
   - Verify MySQL is installed
   - Check if MySQL is running under different name

### Logs and Debugging

- Server logs are output to stderr
- Use `node index.js status` to check server status
- Individual servers can be run directly for debugging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the MCP documentation
