/**
 * Notification Service
 * Handles email and other notification channels
 */

async function send({ channel, template, recipient, data }) {
  switch (channel) {
    case 'email':
      return sendEmail(recipient, template, data);
    case 'slack':
      return sendSlack(recipient, template, data);
    case 'webhook':
      return sendWebhook(recipient, data);
    default:
      console.log(`[Notification] Unknown channel: ${channel}`);
  }
}

async function sendEmail(to, template, data) {
  // In production, integrate with nodemailer or SendGrid
  console.log(`[Email] Sending template "${template}" to ${to}`);
  console.log('[Email] Data:', JSON.stringify(data).slice(0, 200));
  
  // Simulate async send
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return { sent: true, channel: 'email', recipient: to };
}

async function sendSlack(channel, template, data) {
  console.log(`[Slack] Sending to channel ${channel}: ${template}`);
  return { sent: true, channel: 'slack' };
}

async function sendWebhook(url, data) {
  console.log(`[Webhook] POST to ${url}`);
  return { sent: true, channel: 'webhook' };
}

module.exports = { send, sendEmail };
