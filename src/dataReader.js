const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const logger = require('./utils/logger');

class DataReader {
    constructor() {
        this.dataSourcePath = process.env.DATA_SOURCE_PATH || './data/tickets.csv';
        this.dataSourceType = process.env.DATA_SOURCE_TYPE || 'csv';
    }

    async getTickets() {
        try {
            const fullPath = path.resolve(this.dataSourcePath);
            
            if (!fs.existsSync(fullPath)) {
                throw new Error(`Data source file not found: ${fullPath}`);
            }

            logger.info(`Reading tickets from ${fullPath} (${this.dataSourceType})`);

            switch (this.dataSourceType.toLowerCase()) {
                case 'csv':
                    return await this.readCSV(fullPath);
                case 'json':
                    return await this.readJSON(fullPath);
                default:
                    throw new Error(`Unsupported data source type: ${this.dataSourceType}`);
            }
        } catch (error) {
            logger.error('Error reading tickets:', error);
            throw error;
        }
    }

    async readCSV(filePath) {
        return new Promise((resolve, reject) => {
            const tickets = [];
            
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    try {
                        const ticket = this.normalizeTicket(row);
                        if (this.isValidTicket(ticket)) {
                            tickets.push(ticket);
                        }
                    } catch (error) {
                        logger.warn(`Skipping invalid ticket row:`, error.message);
                    }
                })
                .on('end', () => {
                    logger.info(`Successfully loaded ${tickets.length} tickets from CSV`);
                    resolve(tickets);
                })
                .on('error', (error) => {
                    logger.error('Error reading CSV file:', error);
                    reject(error);
                });
        });
    }

    async readJSON(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(data);
            
            let tickets = [];
            
            // Handle different JSON structures
            if (Array.isArray(jsonData)) {
                tickets = jsonData;
            } else if (jsonData.tickets && Array.isArray(jsonData.tickets)) {
                tickets = jsonData.tickets;
            } else if (jsonData.data && Array.isArray(jsonData.data)) {
                tickets = jsonData.data;
            } else {
                throw new Error('Invalid JSON structure. Expected array of tickets or object with tickets/data array.');
            }

            const normalizedTickets = tickets
                .map(ticket => this.normalizeTicket(ticket))
                .filter(ticket => this.isValidTicket(ticket));

            logger.info(`Successfully loaded ${normalizedTickets.length} tickets from JSON`);
            return normalizedTickets;
            
        } catch (error) {
            logger.error('Error reading JSON file:', error);
            throw error;
        }
    }

    normalizeTicket(rawTicket) {
        // Normalize field names to handle different formats
        const ticket = {
            id: rawTicket.id || rawTicket.ticket_id || rawTicket.ticketId || rawTicket.ID,
            title: rawTicket.title || rawTicket.subject || rawTicket.summary || rawTicket.description,
            priority: rawTicket.priority || rawTicket.Priority || 'medium',
            status: rawTicket.status || rawTicket.Status || 'open',
            created_at: rawTicket.created_at || rawTicket.createdAt || rawTicket.created || rawTicket.timestamp,
            customer: rawTicket.customer || rawTicket.customer_name || rawTicket.customerName || rawTicket.requester,
            assignee: rawTicket.assignee || rawTicket.assigned_to || rawTicket.assignedTo || 'unassigned',
            category: rawTicket.category || rawTicket.type || rawTicket.issue_type || 'general'
        };

        // Ensure created_at is in a valid format
        if (ticket.created_at) {
            const date = new Date(ticket.created_at);
            if (isNaN(date.getTime())) {
                throw new Error(`Invalid date format for ticket ${ticket.id}: ${ticket.created_at}`);
            }
            ticket.created_at = date.toISOString();
        }

        return ticket;
    }

    isValidTicket(ticket) {
        const requiredFields = ['id', 'created_at'];
        
        for (const field of requiredFields) {
            if (!ticket[field]) {
                logger.warn(`Ticket missing required field '${field}':`, ticket);
                return false;
            }
        }

        // Validate priority
        const validPriorities = ['critical', 'high', 'medium', 'low'];
        if (ticket.priority && !validPriorities.includes(ticket.priority.toLowerCase())) {
            logger.warn(`Invalid priority '${ticket.priority}' for ticket ${ticket.id}, defaulting to 'medium'`);
            ticket.priority = 'medium';
        }

        // Only process open/active tickets
        const activeStatuses = ['open', 'in-progress', 'pending', 'waiting', 'new'];
        if (ticket.status && !activeStatuses.includes(ticket.status.toLowerCase())) {
            logger.debug(`Skipping closed/resolved ticket ${ticket.id} with status: ${ticket.status}`);
            return false;
        }

        return true;
    }

    async validateDataSource() {
        try {
            const tickets = await this.getTickets();
            return {
                isValid: true,
                ticketCount: tickets.length,
                sampleTicket: tickets[0] || null
            };
        } catch (error) {
            return {
                isValid: false,
                error: error.message
            };
        }
    }
}

module.exports = DataReader;