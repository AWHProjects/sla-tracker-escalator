# SLA Tracker & Escalator

A comprehensive SLA (Service Level Agreement) tracking and escalation system for support tickets. This system monitors support tickets from CSV or JSON feeds, identifies tickets nearing SLA breach, and automatically sends escalation notifications via email and Slack.

## 🚀 Features

- **Multi-format Support**: Reads ticket data from CSV or JSON files
- **Intelligent SLA Monitoring**: Configurable SLA thresholds based on ticket priority
- **Automated Escalations**: Three-tier escalation system (Warning, Critical, Violation)
- **Multiple Notification Channels**: Email and Slack webhook support
- **Real-time Monitoring**: Configurable check intervals with cron scheduling
- **Comprehensive Logging**: Structured logging with Winston
- **Flexible Configuration**: Environment-based configuration management

## 📋 SLA Thresholds

| Priority | Default SLA | Warning (80%) | Critical (95%) |
|----------|-------------|---------------|----------------|
| Critical | 4 hours     | 3.2 hours     | 3.8 hours      |
| High     | 8 hours     | 6.4 hours     | 7.6 hours      |
| Medium   | 24 hours    | 19.2 hours    | 22.8 hours     |
| Low      | 72 hours    | 57.6 hours    | 68.4 hours     |

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sla-tracker-escalator.git
   cd sla-tracker-escalator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   
   # Slack Configuration
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
   
   # SLA Configuration (hours)
   CRITICAL_SLA_HOURS=4
   HIGH_SLA_HOURS=8
   MEDIUM_SLA_HOURS=24
   LOW_SLA_HOURS=72
   
   # Monitoring Configuration
   CHECK_INTERVAL_MINUTES=5
   DATA_SOURCE_PATH=./data/tickets.csv
   DATA_SOURCE_TYPE=csv
   ```

4. **Prepare your ticket data**
   - For CSV: Place your ticket file at the path specified in `DATA_SOURCE_PATH`
   - For JSON: Set `DATA_SOURCE_TYPE=json` and update the path accordingly

## 🚀 Usage

### Start the SLA Tracker
```bash
npm start
```

### Development Mode (with auto-restart)
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

## 📊 Data Format

### CSV Format
```csv
id,title,priority,status,created_at,customer,assignee,category
TKT-001,Login issues,high,open,2025-01-23T10:00:00Z,Acme Corp,john@company.com,technical
```

### JSON Format
```json
{
  "tickets": [
    {
      "id": "TKT-001",
      "title": "Login issues with mobile app",
      "priority": "high",
      "status": "open",
      "created_at": "2025-01-23T10:00:00Z",
      "customer": "Acme Corp",
      "assignee": "john@company.com",
      "category": "technical"
    }
  ]
}
```

### Required Fields
- `id`: Unique ticket identifier
- `created_at`: Ticket creation timestamp (ISO 8601 format)

### Optional Fields
- `title`: Ticket title/subject
- `priority`: critical, high, medium, low (defaults to medium)
- `status`: Ticket status (only processes open/active tickets)
- `customer`: Customer name
- `assignee`: Assigned team member
- `category`: Ticket category

## 🔔 Notification Types

### 1. Warning Alerts (80% SLA usage)
- **Trigger**: When tickets reach 80% of their SLA time
- **Purpose**: Early warning to prioritize tickets
- **Color**: Yellow/Warning

### 2. Critical Warnings (95% SLA usage)
- **Trigger**: When tickets reach 95% of their SLA time
- **Purpose**: Urgent attention needed to prevent violations
- **Color**: Orange/Critical

### 3. Violation Alerts (SLA exceeded)
- **Trigger**: When tickets exceed their SLA deadline
- **Purpose**: Immediate escalation required
- **Color**: Red/Danger

## 📧 Email Configuration

### Gmail Setup
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the app password in `SMTP_PASS`

### Other Email Providers
Update the SMTP settings accordingly:
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
```

## 💬 Slack Configuration

1. Create a Slack App in your workspace
2. Enable Incoming Webhooks
3. Create a webhook URL for your desired channel
4. Add the webhook URL to your `.env` file

## 📁 Project Structure

```
sla-tracker-escalator/
├── src/
│   ├── index.js              # Main application entry point
│   ├── slaTracker.js         # Core SLA tracking logic
│   ├── dataReader.js         # CSV/JSON data reading
│   ├── notificationService.js # Email/Slack notifications
│   └── utils/
│       └── logger.js         # Logging configuration
├── data/
│   ├── tickets.csv           # Sample CSV data
│   └── tickets.json          # Sample JSON data
├── logs/                     # Application logs
├── package.json              # Dependencies and scripts
├── .env.example              # Environment configuration template
└── README.md                 # This file
```

## 🔧 Configuration Options

### SLA Hours
```env
CRITICAL_SLA_HOURS=4    # Critical priority tickets
HIGH_SLA_HOURS=8        # High priority tickets
MEDIUM_SLA_HOURS=24     # Medium priority tickets
LOW_SLA_HOURS=72        # Low priority tickets
DEFAULT_SLA_HOURS=24    # Fallback for unspecified priority
```

### Monitoring
```env
CHECK_INTERVAL_MINUTES=5    # How often to check SLAs
DATA_SOURCE_PATH=./data/tickets.csv
DATA_SOURCE_TYPE=csv        # csv or json
```

### Logging
```env
LOG_LEVEL=info              # error, warn, info, debug
LOG_FILE=./logs/sla-tracker.log
```

## 🧪 Testing

The system includes sample data with tickets at various SLA stages:
- Some tickets near warning thresholds
- Some approaching critical thresholds
- Some that may be overdue (depending on current time)

Run the system with the sample data to see notifications in action.

## 🚨 Troubleshooting

### Common Issues

1. **Email not sending**
   - Verify SMTP credentials
   - Check if 2FA is enabled (use app password)
   - Ensure firewall allows SMTP traffic

2. **Slack notifications not working**
   - Verify webhook URL is correct
   - Check Slack app permissions
   - Ensure webhook is enabled

3. **No tickets found**
   - Verify data file path and format
   - Check file permissions
   - Review logs for parsing errors

4. **SLA calculations seem wrong**
   - Verify ticket timestamps are in ISO 8601 format
   - Check timezone settings
   - Review SLA configuration

## 📈 Monitoring and Logs

Logs are written to:
- Console (development)
- `./logs/sla-tracker.log` (all logs)
- `./logs/error.log` (errors only)

Log levels: `error`, `warn`, `info`, `debug`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the logs for error details

---

**Built with ❤️ for better SLA management**