const prisma = require("../config/db");

class SmsService {
  // Save SMS message to database
  async saveSmsMessage(phoneNumber, message) {
    try {
      const parsedData = this.parseSmsMessage(message);
      
      const smsRecord = await prisma.smsMessage.create({
        data: {
          phoneNumber: phoneNumber,
          message: message,
          reference: parsedData.reference,
          amount: parsedData.amount,
          isProcessed: false
        }
      });
      
      return smsRecord;
    } catch (error) {
      console.error("Error saving SMS:", error);
      throw new Error(`Failed to save SMS: ${error.message}`);
    }
  }
  
  // Parse SMS message to extract reference and amount
  parseSmsMessage(message) {
    // Updated patterns for your specific SMS format
    const patterns = {
      // Pattern for "Payment received for GHS X.XX"
      amount: /Payment received for GHS\s*([\d,]+\.?\d*)/i,
      // Pattern for "Transaction ID: XXXXXXXXXX"
      transactionId: /Transaction ID:\s*(\d+)/i
    };
    
    const amountMatch = message.match(patterns.amount);
    const transactionIdMatch = message.match(patterns.transactionId);
    
    // Log for debugging
    console.log('Parsing SMS:', message);
    console.log('Amount match:', amountMatch);
    console.log('Transaction ID match:', transactionIdMatch);
    
    return {
      amount: amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null,
      reference: transactionIdMatch ? transactionIdMatch[1] : null // Transaction ID goes to reference column
    };
  }
  
  // Get unprocessed SMS messages
  async getUnprocessedSms() {
    try {
      return await prisma.smsMessage.findMany({
        where: { isProcessed: false },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error("Error fetching SMS:", error);
      throw new Error(`Failed to fetch SMS messages: ${error.message}`);
    }
  }
  
  // Find SMS by reference
  async findSmsByReference(reference) {
    try {
      return await prisma.smsMessage.findFirst({
        where: {
          reference: reference, // Remove toUpperCase() since it's numeric
          isProcessed: false
        }
      });
    } catch (error) {
      console.error("Error finding SMS by reference:", error);
      throw new Error(`Failed to find SMS by reference: ${error.message}`);
    }
  }
  
  // Mark SMS as processed
  async markSmsAsProcessed(smsId, prismaTx = null) {
    const prismaClient = prismaTx || prisma;
    try {
      return await prismaClient.smsMessage.update({
        where: { id: smsId },
        data: { isProcessed: true },
      });
    } catch (error) {
      console.error("Error marking SMS as processed:", error);
      throw new Error(`Failed to mark SMS as processed: ${error.message}`);
    }
  }

  // Inside SmsService class
async getPaymentReceivedMessages() {
  try {
    return await prisma.smsMessage.findMany({
      where: {
        message: {
          contains: "Payment received",
          // mode: "insensitive" // Case-insensitive search
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (error) {
    console.error("Error fetching 'Payment received' messages:", error);
    throw new Error(`Failed to fetch payment messages: ${error.message}`);
  }
}

}

module.exports = new SmsService();