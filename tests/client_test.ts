import WebSocket from 'ws';

// Helper to create a connection
function createClient(userId: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        // We pass userId in query param as per current implementation
        const ws = new WebSocket(`ws://localhost:3000?userId=${userId}`);
        
        ws.on('open', () => {
            console.log(`Client ${userId} connected`);
            resolve(ws);
        });

        ws.on('error', (err) => {
            reject(err);
        });
    });
}

async function runTest() {
    try {
        console.log('Connecting clients...');
        const userA = await createClient('userA');
        const userB = await createClient('userB');

        // Listen for messages on User B
        userB.on('message', (data) => {
            console.log(`User B received: ${data.toString()}`);
        });

        // Send message from User A to User B
        const msg = JSON.stringify({
            type: 'chat',
            to: 'userB',
            content: 'Hello from User A!'
        });

        console.log('User A sending message...');
        userA.send(msg);

        // Keep alive for a bit to receive
        setTimeout(() => {
            userA.close();
            userB.close();
            process.exit(0);
        }, 2000);

    } catch (err) {
        console.error('Test failed', err);
        process.exit(1);
    }
}

runTest();
