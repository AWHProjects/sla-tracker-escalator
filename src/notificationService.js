const nodemailer = require('nodemailer');
const axios = require('axios');
const logger = require('./utils/logger');

class NotificationService {
    constructor() {
        this.emailTransporter = null;
        this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
        this.initializeEmailTransporter();
    }

    initializeEmailTransporter() {
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            this.emailTransporter = nodemailer.createTransporter({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
            logger.info('Email transporter initialized');
        } else {
            logger.warn('Email configuration incomplete. Email notifications will be disabled.');
        }
    }

    async sendViolationAlert(violations) {
        const subject = `🚨 SLA VIOLATION ALERT - ${violations.length} ticket(s) overdue`;
        const message = this.formatViolationMessage(violations);
        
        await this.sendNotification(subject, message, 'violation');
    }

    async sendCriticalWarning(criticals) {
        const subject = `⚠️ CRITICAL SLA WARNING - ${criticals.length} ticket(s) near breach`;
        const message = this.formatCriticalMessage(criticals);
        
        await this.sendNotification(subject, message, 'critical');
    }

    async sendWarningAlert(warnings) {
        const subject = `📢 SLA Warning - ${warnings.length} ticket(s) approaching deadline`;
        const message = this.formatWarningMessage(warnings);
        
        await this.sendNotification(subject, message, 'warning');
    }

    async sendNotification(subject, message, type) {
        const promises = [];

        // Send email notification
        if (this.emailTransporter) {
            promises.push(this.sendEmail(subject, message, type));
        }

        // Send Slack notification
        if (this.slackWebhookUrl) {
            promises.push(this.sendSlackMessage(subject, message, type));
        }

        if (promises.length === 0) {
            logger.warn('No notification channels configured. Skipping notification.');
            return;
        }

        try {
            await Promise.allSettled(promises);
        } catch (error) {
            logger.error('Error sending notifications:', error);
        }
    }

    async sendEmail(subject, message, type) {
        try {
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER,
                subject: subject,
                html: this.formatEmailHTML(subject, message, type)
            };

            const info = await this.emailTransporter.sendMail(mailOptions);
            logger.info(`Email notification sent: ${info.messageId}`);
        } catch (error) {
            logger.error('Failed to send email notification:', error);
        }
    }

    async sendSlackMessage(subject, message, type) {
        try {
            const color = this.getSlackColor(type);
            const payload = {
                text: subject,
                attachments: [{
                    color: color,
                    text: message,
                    ts: Math.floor(Date.now() / 1000)
                }]
            };

            await axios.post(this.slackWebhookUrl, payload);
            logger.info('Slack notification sent successfully');
        } catch (error) {
            logger.error('Failed to send Slack notification:', error);
        }
    }

    formatViolationMessage(violations) {
        let message = `The following tickets have exceeded their SLA deadlines:\n\n`;
        
        violations.forEach(({ ticket, slaStatus }) => {
            message += `🔴 **Ticket #${ticket.id}**\n`;
            message += `   Title: ${ticket.title || 'N/A'}\n`;
            message += `   Priority: ${slaStatus.priority.toUpperCase()}\n`;
            message += `   Customer: ${ticket.customer || 'N/A'}\n`;
            message += `   Assignee: ${ticket.assignee || 'Unassigned'}\n`;
            message += `   Hours Overdue: ${slaStatus.hoursOverdue}\n`;
            message += `   SLA Deadline: ${slaStatus.slaDeadline}\n\n`;
        });

        message += `⚡ **IMMEDIATE ACTION REQUIRED** ⚡\n`;
        message += `Please escalate these tickets immediately to prevent further SLA violations.`;
        
        return message;
    }

    formatCriticalMessage(criticals) {
        let message = `The following tickets are critically close to SLA breach (>95% of SLA time used):\n\n`;
        
        criticals.forEach(({ ticket, slaStatus }) => {
            message += `🟠 **Ticket #${ticket.id}**\n`;
            message += `   Title: ${ticket.title || 'N/A'}\n`;
            message += `   Priority: ${slaStatus.priority.toUpperCase()}\n`;
            message += `   Customer: ${ticket.customer || 'N/A'}\n`;
            message += `   Assignee: ${ticket.assignee || 'Unassigned'}\n`;
            message += `   SLA Usage: ${(slaStatus.percentageUsed * 100).toFixed(1)}%\n`;
            message += `   Hours Remaining: ${slaStatus.hoursRemaining}\n`;
            message += `   SLA Deadline: ${slaStatus.slaDeadline}\n\n`;
        });

        message += `⚠️ **URGENT ATTENTION NEEDED** ⚠️\n`;
        message += `These tickets require immediate attention to prevent SLA violations.`;
        
        return message;
    }

    formatWarningMessage(warnings) {
        let message = `The following tickets are approaching their SLA deadlines (>80% of SLA time used):\n\n`;
        
        warnings.forEach(({ ticket, slaStatus }) => {
            message += `🟡 **Ticket #${ticket.id}**\n`;
            message += `   Title: ${ticket.title || 'N/A'}\n`;
            message += `   Priority: ${slaStatus.priority.toUpperCase()}\n`;
            message += `   Customer: ${ticket.customer || 'N/A'}\n`;
            message += `   Assignee: ${ticket.assignee || 'Unassigned'}\n`;
            message += `   SLA Usage: ${(slaStatus.percentageUsed * 100).toFixed(1)}%\n`;
            message += `   Hours Remaining: ${slaStatus.hoursRemaining}\n`;
            message += `   SLA Deadline: ${slaStatus.slaDeadline}\n\n`;
        });

        message += `📋 **ACTION RECOMMENDED** 📋\n`;
        message += `Please review and prioritize these tickets to ensure SLA compliance.`;
        
        return message;
    }

    formatEmailHTML(subject, message, type) {
        const color = type === 'violation' ? '#dc3545' : type === 'critical' ? '#fd7e14' : '#ffc107';
        
        return `
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background-color: ${color}; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .ticket { background-color: #f8f9fa; border-left: 4px solid ${color}; padding: 15px; margin: 10px 0; }
                .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${subject}</h1>
            </div>
            <div class="content">
                <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${message}</pre>
            </div>
            <div class="footer">
                <p>This is an automated message from the SLA Tracker & Escalator system.</p>
                <p>Generated at: ${new Date().toLocaleString()}</p>
            </div>
        </body>
        </html>
        `;
    }

    getSlackColor(type) {
        switch (type) {
            case 'violation': return 'danger';
            case 'critical': return 'warning';
            case 'warning': return '#ffc107';
            default: return 'good';
        }
    }

    async testNotifications() {
        const testSubject = '🧪 SLA Tracker Test Notification';
        const testMessage = 'This is a test notification to verify the notification system is working correctly.';
        
        logger.info('Sending test notifications...');
        await this.sendNotification(testSubject, testMessage, 'warning');
        logger.info('Test notifications sent');
    }
}

module.exports = NotificationService;