let ws;
let username;

function connect() {
    username = document.getElementById('username').value;
    if (!username) return alert('Please enter a username');

    // Connect to current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host ="localhost:3000" || window.location.host; // e.g. localhost:3000
    const url = `${protocol}//${host}/ws?userId=${username}`; // Note: server currently handles /* so /ws works too if not checking path strictly

    ws = new WebSocket(url);

    ws.onopen = () => {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        document.getElementById('connected-user').innerText = `Logged in as: ${username}`;
        log('System', 'Connected to server');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleMessage(data);
        } catch (e) {
            log('Error', 'Received non-JSON message: ' + event.data);
        }
    };

    ws.onclose = () => {
        document.getElementById('status').innerText = 'Disconnected';
        document.getElementById('status').style.color = 'red';
        log('System', 'Disconnected from server');
    };
}

function handleMessage(data) {
    const { type, from, content, meta } = data;
    log('Incoming', JSON.stringify(data));
    
    if (type === 'chat') {
        addToFeed(`${from} sent a DM: "${content}"`);
    } else if (type === 'notification') {
        // Parse notification content
        const action = data.action || 'notification';
        if (action === 'like') {
            addToFeed(`${from} ❤️ Liked your post`);
        } else if (action === 'comment') {
            addToFeed(`${from} 💬 Commented: "${content}"`);
        } else if (action === 'share') {
            addToFeed(`${from} 🚀 Shared your post`);
        } else {
            addToFeed(`Notification from ${from}: ${content}`);
        }
    } else if (type === 'presence') {
        const { userId, status } = data;
        const icon = status === 'online' ? '🟢' : '🔴';
        addToFeed(`${icon} User ${userId} is ${status}`);
    } else if (type === 'group_chat') {
        addToFeed(`[GROUP ${data.channel}] ${from}: ${content}`);
    } else if (type === 'webrtc') {
        addToFeed(`📞 INCOMING CALL (${data.signal}) from ${from}`);
    }
}

function joinGroup() {
    const channel = prompt("Enter Group Name (e.g. group/tech):", "group/general");
    if(!channel) return;
    
    ws.send(JSON.stringify({
        type: 'join_channel',
        channel: channel
    }));
    log('System', `Joined ${channel}`);
}

function sendGroupBefore() {
     const channel = prompt("Enter Group to Send To:", "group/general");
     const text = prompt("Message:");
     if(!channel || !text) return;

     ws.send(JSON.stringify({
        type: 'group_chat',
        channel: channel,
        content: text,
        timestamp: Date.now()
    }));
}

function simulateCall() {
    const target = document.getElementById('target-user').value;
    if (!target) return alert('Enter target user');
    
    // Simulate WebRTC Offer
    ws.send(JSON.stringify({
        type: 'webrtc',
        to: target,
        signal: 'OFFER (SDP Data)',
        timestamp: Date.now()
    }));
    log('Call', `Calling ${target}...`);
}

function sendEvent(type) {
    const target = document.getElementById('target-user').value;
    if (!target) return alert('Please enter a target user ID');

    const payload = {
        type: type === 'chat' ? 'chat' : 'notification', // Server currently routes mainly based on these types
        to: target,
        from: username,
        content: `Test ${type} from ${username}`,
        action: type, // Extra metadata for our client to parse
        timestamp: Date.now()
    };

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
        log('Sent', `Sent ${type} to ${target}`);
    } else {
        alert('Not connected');
    }
}

function addToFeed(text) {
    const feed = document.getElementById('feed');
    const item = document.createElement('div');
    item.className = 'feed-item';
    item.innerHTML = `<div class="meta">${new Date().toLocaleTimeString()}</div><div>${text}</div>`;
    feed.prepend(item);
}

function log(source, message) {
    const logs = document.getElementById('logs');
    const div = document.createElement('div');
    div.className = 'log-item';
    div.innerText = `[${source}] ${message}`;
    logs.prepend(div);
}
