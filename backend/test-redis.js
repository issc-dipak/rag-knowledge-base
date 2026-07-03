const Redis = require('ioredis');

const redis = new Redis({
  host: 'pleasing-panther-140867.upstash.io',
  port: 6379,
  password: 'gQAAAAAAAiZDAAIgcDFlYWY0NjcxMmI3NzA0N2JiYWUzNjJiZmQ4NDkwOWE3ZQ',
  tls: {}
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis successfully!');
  process.exit(0);
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
  process.exit(1);
});
