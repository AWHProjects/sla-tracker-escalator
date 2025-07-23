const dotenv = require('dotenv');
const cron = require('node-cron');
const SLATracker = require('./slaTracker');
const logger = require('./utils/logger');

// Load environment variables
dotenv.config();

class SLATrackerApp {
    constructor() {
        this.slaTracker = new SLATracker();
        this.isRunning = false;
    }

    async start() {
        try {
            logger.info('Starting SLA Tracker & Escalator...');
            
            // Initial check
            await this.slaTracker.checkSLAs();
            
            // Schedule periodic checks
            const checkInterval = process.env.CHECK_INTERVAL_MINUTES || 5;
            const cronExpression = `*/${checkInterval} * * * *`;
            
            cron.schedule(cronExpression, async () => {
                if (!this.isRunning) {
                    this.isRunning = true;
                    try {
                        await this.slaTracker.checkSLAs();
                    } catch (error) {
                        logger.error('Error during SLA check:', error);
                    } finally {
                        this.isRunning = false;
                    }
                }
            });

            logger.info(`SLA Tracker started. Checking every ${checkInterval} minutes.`);
            logger.info('Press Ctrl+C to stop the application.');

        } catch (error) {
            logger.error('Failed to start SLA Tracker:', error);
            process.exit(1);
        }
    }

    async stop() {
        logger.info('Stopping SLA Tracker...');
        process.exit(0);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Gracefully shutting down...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM. Gracefully shutting down...');
    process.exit(0);
});

// Start the application
const app = new SLATrackerApp();
app.start().catch(error => {
    logger.error('Application startup failed:', error);
    process.exit(1);
});