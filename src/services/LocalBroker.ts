import Aedes from 'aedes';
import { createServer } from 'aedes-server-factory';

/**
 * ⚠️ CRITICAL ARCHITECTURE NOTE ⚠️
 * 
 * This 'LocalBroker' is a STAND-IN for development only.
 * It runs a single Aedes MQTT instance inside the Node.js process.
 * 
 * CAN THIS HANDLE BILLIONS OF USERS? -> NO.
 * 
 * FOR PRODUCTION (Scale to Billions):
 * 1. DELETE this file.
 * 2. Deploy a dedicated MQTT Cluster (e.g., VerneMQ, EMQX, HiveMQ) on separate servers.
 * 3. Point `MqttBus.ts` to the Load Balancer of that cluster (e.g., mqtt://broker.social-app.com).
 * 
 * The *Architecture* (Server.ts -> MQTT) scales to billions.
 * This *Component* (LocalBroker.ts) is just for your laptop.
 */
export class LocalBroker {
    private aedes: Aedes;
    private server: any;
    private port: number;

    constructor(port: number = 1883) {
        this.port = port;
        this.aedes = new Aedes();
        this.server = createServer(this.aedes);
    }

    public start() {
        this.server.listen(this.port, () => {
            console.log(`MQTT Broker started on port ${this.port}`);
        });
    }

    public getAedes() {
        return this.aedes;
    }
}
