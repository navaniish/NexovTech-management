const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const port = 5006;

console.log(`Starting serveo tunnel for port ${port}...`);

const ssh = spawn('ssh', ['-o', 'StrictHostKeyChecking=no', '-R', `80:localhost:${port}`, 'serveo.net']);

ssh.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[serveo]: ${output.trim()}`);
  
  const match = output.match(/Forwarding HTTP traffic from\s*(https:\/\/[^\s]+)/i);
  if (match) {
    const url = match[1];
    console.log(`\n✨ Detected tunnel URL: ${url}`);
    
    // Read and update .env
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    if (envContent.includes('VOICE_CALLBACK_URL=')) {
      envContent = envContent.replace(/VOICE_CALLBACK_URL=.*/, `VOICE_CALLBACK_URL=${url}`);
    } else {
      envContent += `\nVOICE_CALLBACK_URL=${url}\n`;
    }
    
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`✅ server/.env updated with VOICE_CALLBACK_URL=${url}`);
  }
});

ssh.stderr.on('data', (data) => {
  console.error(`[serveo error]: ${data.toString().trim()}`);
});

ssh.on('close', (code) => {
  console.log(`serveo process exited with code ${code}`);
});
