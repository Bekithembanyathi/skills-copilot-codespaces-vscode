import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import Database from '../../shared/database/connection';
import logger from '../../shared/utils/logger';
import { BusinessOperationsService } from './business-service';
import { ClaudeService } from './claude-service';
import { WhatsAppService } from './whatsapp-service';

dotenv.config();

class BusinessOperationsMCPServer {
  private server: Server;
  private businessService: BusinessOperationsService;
  private claudeService: ClaudeService;
  private whatsappService: WhatsAppService;

  constructor() {
    this.server = new Server(
      {
        name: 'business-operations-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.businessService = new BusinessOperationsService();
    this.claudeService = new ClaudeService(
      process.env.CLAUDE_API_KEY!,
      'claude-3-sonnet-20240229'
    );
    this.whatsappService = new WhatsAppService(
      process.env.WHATSAPP_SESSION_PATH || './whatsapp-session',
      this.claudeService
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getAvailableTools(),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_booking':
            return await this.handleCreateBooking(args);
          case 'get_booking':
            return await this.handleGetBooking(args);
          case 'update_booking':
            return await this.handleUpdateBooking(args);
          case 'cancel_booking':
            return await this.handleCancelBooking(args);
          case 'check_room_availability':
            return await this.handleCheckRoomAvailability(args);
          case 'process_payment':
            return await this.handleProcessPayment(args);
          case 'refund_payment':
            return await this.handleRefundPayment(args);
          case 'create_sale':
            return await this.handleCreateSale(args);
          case 'get_sales_report':
            return await this.handleGetSalesReport(args);
          case 'send_whatsapp_message':
            return await this.handleSendWhatsAppMessage(args);
          case 'get_whatsapp_history':
            return await this.handleGetWhatsAppHistory(args);
          case 'process_with_claude':
            return await this.handleProcessWithClaude(args);
          case 'get_available_services':
            return await this.handleGetAvailableServices(args);
          case 'calculate_booking_total':
            return await this.handleCalculateBookingTotal(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Error handling tool ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    });
  }

  private getAvailableTools(): Tool[] {
    return [
      {
        name: 'create_booking',
        description: 'Create a new booking for accommodation, transfer, activity, or miscellaneous service',
        inputSchema: {
          type: 'object',
          properties: {
            customerId: { type: 'string' },
            customerName: { type: 'string' },
            customerPhone: { type: 'string' },
            customerEmail: { type: 'string' },
            serviceType: { 
              type: 'string', 
              enum: ['accommodation', 'transfer', 'activity', 'miscellaneous'] 
            },
            serviceDetails: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                duration: { type: 'string' },
                location: { type: 'string' }
              },
              required: ['name', 'description']
            },
            checkIn: { type: 'string', format: 'date-time' },
            checkOut: { type: 'string', format: 'date-time' },
            guests: { type: 'number', minimum: 1 },
            totalAmount: { type: 'number', minimum: 0 }
          },
          required: ['customerId', 'customerName', 'customerPhone', 'customerEmail', 'serviceType', 'serviceDetails', 'guests', 'totalAmount']
        }
      },
      {
        name: 'get_booking',
        description: 'Retrieve booking details by booking ID',
        inputSchema: {
          type: 'object',
          properties: {
            bookingId: { type: 'string' }
          },
          required: ['bookingId']
        }
      },
      {
        name: 'update_booking',
        description: 'Update booking details',
        inputSchema: {
          type: 'object',
          properties: {
            bookingId: { type: 'string' },
            updates: { type: 'object' }
          },
          required: ['bookingId', 'updates']
        }
      },
      {
        name: 'cancel_booking',
        description: 'Cancel a booking',
        inputSchema: {
          type: 'object',
          properties: {
            bookingId: { type: 'string' }
          },
          required: ['bookingId']
        }
      },
      {
        name: 'check_room_availability',
        description: 'Check room availability for given dates',
        inputSchema: {
          type: 'object',
          properties: {
            checkIn: { type: 'string', format: 'date-time' },
            checkOut: { type: 'string', format: 'date-time' },
            roomType: { type: 'string', enum: ['single', 'double', 'suite', 'family'] },
            guests: { type: 'number', minimum: 1 }
          },
          required: ['checkIn', 'checkOut']
        }
      },
      {
        name: 'process_payment',
        description: 'Process a payment for a booking',
        inputSchema: {
          type: 'object',
          properties: {
            bookingId: { type: 'string' },
            amount: { type: 'number', minimum: 0 },
            currency: { type: 'string', default: 'USD' },
            method: { 
              type: 'string', 
              enum: ['card', 'bank_transfer', 'cash', 'mobile_money'] 
            }
          },
          required: ['bookingId', 'amount', 'method']
        }
      },
      {
        name: 'refund_payment',
        description: 'Process a refund for a payment',
        inputSchema: {
          type: 'object',
          properties: {
            paymentId: { type: 'string' },
            amount: { type: 'number', minimum: 0 }
          },
          required: ['paymentId']
        }
      },
      {
        name: 'create_sale',
        description: 'Create a new sale record',
        inputSchema: {
          type: 'object',
          properties: {
            bookingId: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  serviceType: { type: 'string' },
                  name: { type: 'string' },
                  quantity: { type: 'number', minimum: 1 },
                  unitPrice: { type: 'number', minimum: 0 },
                  total: { type: 'number', minimum: 0 }
                },
                required: ['serviceType', 'name', 'quantity', 'unitPrice', 'total']
              }
            },
            subtotal: { type: 'number', minimum: 0 },
            tax: { type: 'number', minimum: 0 },
            total: { type: 'number', minimum: 0 },
            discounts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['percentage', 'fixed'] },
                  value: { type: 'number', minimum: 0 },
                  reason: { type: 'string' }
                }
              }
            }
          },
          required: ['bookingId', 'items', 'subtotal', 'tax', 'total']
        }
      },
      {
        name: 'get_sales_report',
        description: 'Generate sales report for a date range',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' }
          },
          required: ['startDate', 'endDate']
        }
      },
      {
        name: 'send_whatsapp_message',
        description: 'Send a WhatsApp message to a customer',
        inputSchema: {
          type: 'object',
          properties: {
            phoneNumber: { type: 'string' },
            message: { type: 'string' }
          },
          required: ['phoneNumber', 'message']
        }
      },
      {
        name: 'get_whatsapp_history',
        description: 'Get WhatsApp conversation history for a phone number',
        inputSchema: {
          type: 'object',
          properties: {
            phoneNumber: { type: 'string' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50 }
          },
          required: ['phoneNumber']
        }
      },
      {
        name: 'process_with_claude',
        description: 'Process a business query using Claude AI',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            context: { type: 'object' }
          },
          required: ['query']
        }
      },
      {
        name: 'get_available_services',
        description: 'Get list of available services',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'calculate_booking_total',
        description: 'Calculate total amount for booking items including tax and discounts',
        inputSchema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  serviceType: { type: 'string' },
                  name: { type: 'string' },
                  quantity: { type: 'number', minimum: 1 },
                  unitPrice: { type: 'number', minimum: 0 },
                  total: { type: 'number', minimum: 0 }
                },
                required: ['serviceType', 'name', 'quantity', 'unitPrice', 'total']
              }
            },
            discounts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['percentage', 'fixed'] },
                  value: { type: 'number', minimum: 0 },
                  reason: { type: 'string' }
                }
              }
            }
          },
          required: ['items']
        }
      }
    ];
  }

  // Tool handlers
  private async handleCreateBooking(args: any) {
    const booking = await this.businessService.createBooking({
      ...args,
      checkIn: args.checkIn ? new Date(args.checkIn) : undefined,
      checkOut: args.checkOut ? new Date(args.checkOut) : undefined
    });

    return {
      content: [
        {
          type: 'text',
          text: `Booking created successfully!\n\nBooking ID: ${booking.id}\nCustomer: ${booking.customerName}\nService: ${booking.serviceDetails.name}\nTotal Amount: $${booking.totalAmount}\nStatus: ${booking.status}\nPayment Status: ${booking.paymentStatus}`,
        },
      ],
    };
  }

  private async handleGetBooking(args: any) {
    const booking = await this.businessService.getBooking(args.bookingId);
    
    if (!booking) {
      return {
        content: [
          {
            type: 'text',
            text: `Booking not found: ${args.bookingId}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(booking, null, 2),
        },
      ],
    };
  }

  private async handleUpdateBooking(args: any) {
    const booking = await this.businessService.updateBooking(args.bookingId, args.updates);
    
    if (!booking) {
      return {
        content: [
          {
            type: 'text',
            text: `Booking not found: ${args.bookingId}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Booking updated successfully!\n\n${JSON.stringify(booking, null, 2)}`,
        },
      ],
    };
  }

  private async handleCancelBooking(args: any) {
    const success = await this.businessService.cancelBooking(args.bookingId);
    
    return {
      content: [
        {
          type: 'text',
          text: success ? `Booking ${args.bookingId} cancelled successfully!` : `Failed to cancel booking ${args.bookingId}`,
        },
      ],
    };
  }

  private async handleCheckRoomAvailability(args: any) {
    const rooms = await this.businessService.checkRoomAvailability(
      new Date(args.checkIn),
      new Date(args.checkOut),
      args.roomType,
      args.guests
    );

    return {
      content: [
        {
          type: 'text',
          text: `Available rooms (${rooms.length} found):\n\n${JSON.stringify(rooms, null, 2)}`,
        },
      ],
    };
  }

  private async handleProcessPayment(args: any) {
    const payment = await this.businessService.processPayment({
      bookingId: args.bookingId,
      amount: args.amount,
      currency: args.currency || 'USD',
      method: args.method,
      status: 'pending'
    });

    return {
      content: [
        {
          type: 'text',
          text: `Payment processed!\n\nPayment ID: ${payment.id}\nAmount: $${payment.amount}\nStatus: ${payment.status}\nTransaction ID: ${payment.transactionId || 'N/A'}`,
        },
      ],
    };
  }

  private async handleRefundPayment(args: any) {
    const success = await this.businessService.refundPayment(args.paymentId, args.amount);
    
    return {
      content: [
        {
          type: 'text',
          text: success ? `Refund processed successfully for payment ${args.paymentId}` : `Failed to process refund for payment ${args.paymentId}`,
        },
      ],
    };
  }

  private async handleCreateSale(args: any) {
    const sale = await this.businessService.createSale(args);

    return {
      content: [
        {
          type: 'text',
          text: `Sale created successfully!\n\nSale ID: ${sale.id}\nTotal: $${sale.total}\nItems: ${sale.items.length}`,
        },
      ],
    };
  }

  private async handleGetSalesReport(args: any) {
    const report = await this.businessService.getSalesReport(
      new Date(args.startDate),
      new Date(args.endDate)
    );

    return {
      content: [
        {
          type: 'text',
          text: `Sales Report\n\n${JSON.stringify(report, null, 2)}`,
        },
      ],
    };
  }

  private async handleSendWhatsAppMessage(args: any) {
    if (!this.whatsappService.isClientReady()) {
      return {
        content: [
          {
            type: 'text',
            text: 'WhatsApp service is not ready. Please wait for initialization.',
          },
        ],
      };
    }

    await this.whatsappService.sendMessage(args.phoneNumber, args.message);

    return {
      content: [
        {
          type: 'text',
          text: `WhatsApp message sent to ${args.phoneNumber}`,
        },
      ],
    };
  }

  private async handleGetWhatsAppHistory(args: any) {
    const history = await this.whatsappService.getSessionHistory(args.phoneNumber, args.limit || 50);

    return {
      content: [
        {
          type: 'text',
          text: `WhatsApp conversation history for ${args.phoneNumber}:\n\n${JSON.stringify(history, null, 2)}`,
        },
      ],
    };
  }

  private async handleProcessWithClaude(args: any) {
    const response = await this.claudeService.processBusinessQuery(args.query, args.context);

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  }

  private async handleGetAvailableServices(args: any) {
    const services = await this.businessService.getAvailableServices();

    return {
      content: [
        {
          type: 'text',
          text: `Available Services:\n\n${JSON.stringify(services, null, 2)}`,
        },
      ],
    };
  }

  private async handleCalculateBookingTotal(args: any) {
    const calculation = await this.businessService.calculateBookingTotal(args.items, args.discounts);

    return {
      content: [
        {
          type: 'text',
          text: `Booking Total Calculation:\n\nSubtotal: $${calculation.subtotal}\nDiscount: $${calculation.discountAmount}\nTax: $${calculation.tax}\nTotal: $${calculation.total}`,
        },
      ],
    };
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await Database.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mcp-business');
      
      // Initialize WhatsApp service
      await this.whatsappService.initialize();
      
      // Start MCP server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info('Business Operations MCP Server started successfully');
    } catch (error) {
      logger.error('Failed to start Business Operations MCP Server:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      await this.whatsappService.destroy();
      await Database.disconnect();
      logger.info('Business Operations MCP Server stopped');
    } catch (error) {
      logger.error('Error stopping Business Operations MCP Server:', error);
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new BusinessOperationsMCPServer();
  
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });

  server.start().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default BusinessOperationsMCPServer;