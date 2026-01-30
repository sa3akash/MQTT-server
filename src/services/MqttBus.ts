import mqtt, { MqttClient } from 'mqtt';

export class MqttBus {
    private client: MqttClient;
    private isConnected: boolean = false;

    constructor(brokerUrl: string = 'mqtt://localhost:1883') {
        this.client = mqtt.connect(brokerUrl);

        this.client.on('connect', () => {
            console.log('Connected to MQTT Bus');
            this.isConnected = true;
        });

        this.client.on('error', (err) => {
            console.error('MQTT Bus Error', err);
        });
    }



    public onMessage(callback: (topic: string, message: string) => void) {
        this.client.on('message', (t, m) => {
            callback(t, m.toString());
        });
    }

    public subscribe(topic: string) {
        if (!this.isConnected) {
             console.warn('MQTT not connected yet, skipping subscribe', topic);
             return;
        }
        this.client.subscribe(topic, (err) => {
            if (err) console.error(`Failed to subscribe to ${topic}`, err);
            // else console.log(`Subscribed to ${topic}`); 
        });
    }

    public unsubscribe(topic: string) {
        if (!this.isConnected) return;
        this.client.unsubscribe(topic);
    }

    public publish(topic: string, message: string) {
        if (!this.isConnected) return;
        this.client.publish(topic, message);
    }
}
