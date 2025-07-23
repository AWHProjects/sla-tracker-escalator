const moment = require('moment');
const DataReader = require('./dataReader');
const NotificationService = require('./notificationService');
const logger = require('./utils/logger');

class SLATracker {
    constructor() {
        this.dataReader = new DataReader();
        this.notificationService = new NotificationService();
        this.slaConfig = {
            critical: parseInt(process.env.CRITICAL_SLA_HOURS) || 4,
            high: parseInt(process.env.HIGH_SLA_HOURS) || 8,
            medium: parseInt(process.env.MEDIUM_SLA_HOURS) || 24,
            low: parseInt(process.env.LOW_SLA_HOURS) || 72,
            default: parseInt(process.env.DEFAULT_SLA_HOURS) || 24
        };
        this.escalationThresholds = {
            warning: 0.8, // 80% of SLA time
            critical: 0.95 // 95% of SLA time
        };
    }

    async checkSLAs() {
        try {
            logger.info('Starting SLA check...');
            
            const tickets = await this.dataReader.getTickets();
            logger.info(`Loaded ${tickets.length} tickets for SLA monitoring`);

            const slaViolations = [];
            const warningTickets = [];
            const criticalTickets = [];

            for (const ticket of tickets) {
                const slaStatus = this.calculateSLAStatus(ticket);
                
                if (slaStatus.isViolated) {
                    slaViolations.push({ ticket, slaStatus });
                    logger.warn(`SLA VIOLATION: Ticket ${ticket.id} - ${slaStatus.hoursOverdue} hours overdue`);
                } else if (slaStatus.percentageUsed >= this.escalationThresholds.critical) {
                    criticalTickets.push({ ticket, slaStatus });
                    logger.warn(`CRITICAL SLA WARNING: Ticket ${ticket.id} - ${(slaStatus.percentageUsed * 100).toFixed(1)}% of SLA time used`);
                } else if (slaStatus.percentageUsed >= this.escalationThresholds.warning) {
                    warningTickets.push({ ticket, slaStatus });
                    logger.info(`SLA WARNING: Ticket ${ticket.id} - ${(slaStatus.percentageUsed * 100).toFixed(1)}% of SLA time used`);
                }
            }

            // Send notifications
            await this.sendNotifications(slaViolations, warningTickets, criticalTickets);

            logger.info(`SLA check completed. Violations: ${slaViolations.length}, Critical: ${criticalTickets.length}, Warnings: ${warningTickets.length}`);

        } catch (error) {
            logger.error('Error during SLA check:', error);
            throw error;
        }
    }

    calculateSLAStatus(ticket) {
        const createdAt = moment(ticket.created_at);
        const now = moment();
        const priority = ticket.priority ? ticket.priority.toLowerCase() : 'medium';
        
        // Get SLA hours based on priority
        const slaHours = this.slaConfig[priority] || this.slaConfig.default;
        const slaDeadline = createdAt.clone().add(slaHours, 'hours');
        
        // Calculate time elapsed and remaining
        const hoursElapsed = now.diff(createdAt, 'hours', true);
        const hoursRemaining = slaDeadline.diff(now, 'hours', true);
        const percentageUsed = hoursElapsed / slaHours;
        
        const isViolated = now.isAfter(slaDeadline);
        const hoursOverdue = isViolated ? Math.abs(hoursRemaining) : 0;

        return {
            slaHours,
            hoursElapsed: Math.round(hoursElapsed * 100) / 100,
            hoursRemaining: Math.round(hoursRemaining * 100) / 100,
            percentageUsed: Math.round(percentageUsed * 1000) / 1000,
            isViolated,
            hoursOverdue: Math.round(hoursOverdue * 100) / 100,
            slaDeadline: slaDeadline.format('YYYY-MM-DD HH:mm:ss'),
            priority
        };
    }

    async sendNotifications(violations, warnings, criticals) {
        try {
            if (violations.length > 0) {
                await this.notificationService.sendViolationAlert(violations);
            }

            if (criticals.length > 0) {
                await this.notificationService.sendCriticalWarning(criticals);
            }

            if (warnings.length > 0) {
                await this.notificationService.sendWarningAlert(warnings);
            }
        } catch (error) {
            logger.error('Error sending notifications:', error);
        }
    }

    getSLAConfig() {
        return this.slaConfig;
    }

    getEscalationThresholds() {
        return this.escalationThresholds;
    }
}

module.exports = SLATracker;