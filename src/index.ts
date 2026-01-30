import { Server } from './Server';
import { MqttBus } from './services/MqttBus';
import http from 'http';
import express from 'express';
import cors from 'cors'

const app = express();
app.use(express.json()); // Enable JSON body parsing
app.use(express.static('public'));
app.use(cors());

// Shared Nervous System
const mqttBus = new MqttBus();

// REST Microservice Hook (Push API)
// External services (Order Service, etc.) call this to push real-time events.
app.post('/internal/publish', (req, res) => {
    const { topic, message } = req.body;
    
    if (!topic || !message) {
        res.status(400).json({ error: 'Missing topic or message' });
        return;
    }

    // Push to the Bus (which routes to the Gateway -> User)
    mqttBus.publish(topic, typeof message === 'string' ? message : JSON.stringify(message));
    
    res.json({ success: true, status: 'Published to ' + topic });
});

const httpServer = http.createServer(app);

httpServer.listen(4000, () => {
    console.log('Microservice API & Web Server started on port 4000');
});

// Start Gateway with Shared Bus
const server = new Server(mqttBus, 3000);
server.start().catch(console.error);
