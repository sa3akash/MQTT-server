import { App, WebSocket, HttpRequest, HttpResponse, us_socket_context_t, us_listen_socket } from 'uWebSockets.js';
import { LocalBroker } from './services/LocalBroker';
import { MqttBus } from './services/MqttBus';

interface UserData {
    id: string;
    token: string;
}

export class Server {
    private port: number;
    private broker: LocalBroker;
    private mqtt: MqttBus;
    private app: any;
    private listenSocket: us_listen_socket | null = null;

    constructor(mqttBus: MqttBus, port: number = 3000) {
        this.port = port;
        // 1. Start Embedded Broker (The "Network")
        this.broker = new LocalBroker();
        // 2. Use Shared MQTT Bus
        this.mqtt = mqttBus;
        this.app = App();
    }

    public async start() {
        console.log('Server starting from:', process.cwd());
        this.broker.start();
        
        // 3. Configure Message Routing
        // When MQTT receives a msg, pump it into uWS
        this.mqtt.onMessage((topic, message) => {
             // topic is like 'user/123'
             // uWS publishes to its local 'user/123' topic
             this.app.publish(topic, message);
        });

        this.app.ws('/ws', {
            idleTimeout: 32,
            maxBackpressure: 1024,
            maxPayloadLength: 512,
            compression: 1, 
            
            upgrade: (res: HttpResponse, req: HttpRequest, context: us_socket_context_t) => {
                const query = req.getQuery();
                const match = query.match(/userId=([^&]*)/);
                const userId = match ? match[1] : null;

                if (!userId) {
                    res.writeStatus('401 Unauthorized').end();
                    return;
                }

                res.upgrade(
                    { id: userId, token: 'mock-token' }, 
                    req.getHeader('sec-websocket-key'),
                    req.getHeader('sec-websocket-protocol'),
                    req.getHeader('sec-websocket-extensions'),
                    context
                );
            },
            
            open: (ws: WebSocket<UserData>) => {
                const userData = ws.getUserData();
                const userTopic = 'user/' + userData.id;

                // 1. Subscribe uWS socket to local topic
                ws.subscribe(userTopic);
                ws.subscribe('global_presence'); 
                
                // 2. Subscribe MQTT Client to global topic (SELECTIVE SUBSCRIPTION)
                // This is the Facebook "Edge" pattern. We only listen to this user's data.
                this.mqtt.subscribe(userTopic);

                console.log(`User ${userData.id} connected. Subscribed MQTT to ${userTopic}`);
                
                // Presence
                this.mqtt.publish('global_presence', JSON.stringify({
                    type: 'presence',
                    userId: userData.id,
                    status: 'online'
                }));
            },

            message: (ws: WebSocket<UserData>, message: ArrayBuffer, isBinary: boolean) => {
                const text = Buffer.from(message).toString();
                try {
                    const parsed = JSON.parse(text);
                    parsed.from = ws.getUserData().id;
                    
                    // Route to MQTT
                    // If chat, target is 'user/<to>'
                    // If chat, target is 'user/<to>'
                    if (parsed.type === 'chat' && parsed.to) {
                        this.mqtt.publish('user/' + parsed.to, JSON.stringify(parsed));
                    } 
                    // Notification same
                    else if (parsed.type === 'notification' && parsed.to) {
                         this.mqtt.publish('user/' + parsed.to, JSON.stringify(parsed));
                    }
                    // Groups / Pages (Join/Leave)
                    else if (parsed.type === 'join_channel' && parsed.channel) {
                        const channel = parsed.channel; // e.g. 'group/123'
                        ws.subscribe(channel);
                        this.mqtt.subscribe(channel); // Ensure node listens
                        console.log(`User ${parsed.from} joined ${channel}`);
                    }
                    else if (parsed.type === 'leave_channel' && parsed.channel) {
                        ws.unsubscribe(parsed.channel);
                        // We don't unsub MQTT here because OTHER users on this node might be in it
                        // Real scaling requires ref counting.
                    }
                    // Group Chat
                    else if (parsed.type === 'group_chat' && parsed.channel) {
                         this.mqtt.publish(parsed.channel, JSON.stringify(parsed));
                    }
                    // WebRTC Signaling (1:1)
                    else if (parsed.type === 'webrtc' && parsed.to) {
                         this.mqtt.publish('user/' + parsed.to, JSON.stringify(parsed));
                    }
                } catch (e) {
                    console.error('Invalid JSON', e);
                }
            },

            close: (ws: WebSocket<UserData>, code: number, message: ArrayBuffer) => {
                const userId = ws.getUserData().id;
                const userTopic = 'user/' + userId;

                // Unsubscribe MQTT (Stop listening for this user)
                this.mqtt.unsubscribe(userTopic);
                
                console.log(`User ${userId} disconnected. Unsubscribed MQTT from ${userTopic}`);
                
                // Offline
                this.mqtt.publish('global_presence', JSON.stringify({
                    type: 'presence',
                    userId: userId,
                    status: 'offline'
                }));
            }

        }).listen(this.port, (token: any) => {
            if (token) {
                this.listenSocket = token;
                console.log(`Listening to port ${this.port}`);
            } else {
                console.log(`Failed to listen to port ${this.port}`);
            }
        });
    }
}
