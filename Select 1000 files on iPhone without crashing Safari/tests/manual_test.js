const http = require('http');
const { spawn } = require('child_process');

async function runTest() {
    console.log('Starting server...');
    const server = spawn('node', ['server.js'], {
        cwd: 'Select 1000 files on iPhone without crashing Safari',
        env: { ...process.env, PORT: '3003' }
    });

    server.stdout.on('data', (data) => console.log('Server:', data.toString().trim()));
    server.stderr.on('data', (data) => console.error('Server Error:', data.toString().trim()));

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Testing batch upload...');
    const options = {
        hostname: 'localhost',
        port: 3003,
        path: '/upload',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const reqBatch = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Batch Response:', data);
            if (JSON.parse(data).success) {
                console.log('Batch test PASSED');
            } else {
                console.log('Batch test FAILED');
            }
            server.kill();
            process.exit(0);
        });
    });

    reqBatch.on('error', (e) => console.error('Request error:', e));
    reqBatch.write('large data stream simulation');
    reqBatch.end();
}

runTest();
