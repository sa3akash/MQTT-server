const aedes = require('aedes');
const { createServer } = require('aedes-server-factory');
const redis = require('mqemitter-redis');
const redisPersistence = require('aedes-persistence-redis');

// Configuration
const PORT = process.env.PORT || 1883;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

console.log(`Initializing Broker with Redis Backend at ${REDIS_HOST}:${REDIS_PORT}...`);

// 1. Redis MQEmitter (For exchanging messages between Broker Pods)
// This allows Pod A to publish a message that a client on Pod B receives.
const mq = redis({
  host: REDIS_HOST,
  port: REDIS_PORT
});

// 2. Redis Persistence (For storing subscriptions/QoS)
// This ensures if a user reconnects to a different Pod, their data is there.
const persistence = redisPersistence({
  host: REDIS_HOST,
  port: REDIS_PORT
});

// 3. Create Aedes Instance
const broker = aedes({
  id: 'broker-' + Math.random().toString(36).substr(2, 9), // Unique ID per Pod
  mq: mq,
  persistence: persistence
});

// 4. Create Server
const server = createServer(broker);

server.listen(PORT, function () {
  console.log(`🚀 Scalable MQTT Broker running on port ${PORT}`);
  console.log(`   - Node ID: ${broker.id}`);
  console.log(`   - Backend: Redis Cluster`);
});

// Events for Debugging
broker.on('client', function (client) {
  console.log('Client Connected:', client ? client.id : client);
});

broker.on('clientDisconnect', function (client) {
  console.log('Client Disconnected:', client ? client.id : client);
});

broker.on('publish', function (packet, client) {
  if (packet && packet.topic.startsWith('$SYS')) return; // Ignore system messages
  // console.log('Message published:', packet.topic);
});
