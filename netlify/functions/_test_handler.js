const serverless = require('serverless-http');
const app = require('../../server/index');
const handler = serverless(app);

const event = {
  path: '/api/telegram-webhook',
  httpMethod: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: '{}',
  isBase64Encoded: false
};

const context = {};

handler(event, context).then(result => {
  console.log('Result:', result);
}).catch(err => {
  console.error('Error:', err);
});
