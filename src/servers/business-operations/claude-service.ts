import Anthropic from '@anthropic-ai/sdk';
import logger from '../../shared/utils/logger';

export class ClaudeService {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-sonnet-20240229') {
    this.client = new Anthropic({
      apiKey: apiKey,
    });
    this.model = model;
  }

  async processBusinessQuery(query: string, context?: any): Promise<string> {
    try {
      const systemPrompt = `You are a helpful business assistant for a hotel and tourism company. 
      You can help with:
      - Creating and managing bookings
      - Processing payments and refunds
      - Checking room availability
      - Managing transfers, activities, and other services
      - Providing information about services
      
      Always be professional, helpful, and accurate. If you need more information to complete a request, ask for it.
      Format responses clearly and include relevant details.
      
      Current context: ${context ? JSON.stringify(context, null, 2) : 'No additional context'}`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: query
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }
      
      throw new Error('Unexpected response format from Claude');
    } catch (error) {
      logger.error('Error processing Claude query:', error);
      throw new Error('Failed to process query with Claude');
    }
  }

  async generateBookingConfirmation(booking: any): Promise<string> {
    const prompt = `Generate a professional booking confirmation message for the following booking:
    
    ${JSON.stringify(booking, null, 2)}
    
    Include:
    - Booking reference
    - Service details
    - Dates and guest information
    - Total amount
    - Payment status
    - Next steps for the customer
    
    Make it friendly and professional.`;

    return this.processBusinessQuery(prompt);
  }

  async analyzeCustomerIntent(message: string): Promise<{
    intent: string;
    entities: any;
    confidence: number;
  }> {
    const prompt = `Analyze the following customer message and extract:
    1. Primary intent (booking, payment, inquiry, complaint, etc.)
    2. Key entities (dates, names, amounts, service types, etc.)
    3. Confidence level (0-1)
    
    Message: "${message}"
    
    Respond in JSON format:
    {
      "intent": "primary_intent",
      "entities": {
        "key": "value"
      },
      "confidence": 0.85
    }`;

    try {
      const response = await this.processBusinessQuery(prompt);
      return JSON.parse(response);
    } catch (error) {
      logger.error('Error analyzing customer intent:', error);
      return {
        intent: 'unknown',
        entities: {},
        confidence: 0.0
      };
    }
  }

  async generateSalesReport(salesData: any[]): Promise<string> {
    const prompt = `Generate a comprehensive sales report based on the following data:
    
    ${JSON.stringify(salesData, null, 2)}
    
    Include:
    - Total revenue
    - Top performing services
    - Trends and insights
    - Recommendations for improvement
    
    Format as a professional business report.`;

    return this.processBusinessQuery(prompt);
  }
}