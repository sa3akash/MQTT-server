import { createClient, RedisClientType } from 'redis';

export class RedisCluster {
    private publisher: RedisClientType;
    private subscriber: RedisClientType;
    private isConnected: boolean = false;

    constructor() {
        // Assuming default localhost:6379 for now. 
        // In production, these should be env vars.
        this.publisher = createClient();
        this.subscriber = createClient();

        this.publisher.on('error', (err) => console.error('Redis Publisher Error', err));
        this.subscriber.on('error', (err) => console.error('Redis Subscriber Error', err));
    }

    public async connect() {
        try {
            await Promise.all([
                this.publisher.connect(),
                this.subscriber.connect()
            ]);
            this.isConnected = true;
            console.log('Redis Cluster Connected');
        } catch (err) {
            console.warn('Redis Cluster Failed to Connect - Running in single-node mode (memory only)');
        }
    }

    public async publish(channel: string, message: string) {
        if (!this.isConnected) return;
        try {
            await this.publisher.publish(channel, message);
        } catch (e) {
            console.error('Redis publish error', e);
        }
    }

    public async subscribeToGlobalBus(callback: (channel: string, message: string) => void) {
        if (!this.isConnected) return;
        try {
            // Subscribe to pattern to catch all relevant events if needed, or just specific channels
            // For this architecture, we'll subscribe to specific channels we care about for broadcasting
            await this.subscriber.subscribe(['chat', 'notification', 'presence'], (message, channel) => {
                callback(channel, message);
            });
        } catch (e) {
            console.error('Redis global subscribe error', e);
        }
    }
}
