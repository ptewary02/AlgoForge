const { createClient }  = require('redis');

const redisClient = createClient({
    username: 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: 'redis-18090.c16.us-east-1-3.ec2.cloud.redislabs.com',  
        port: 18090  
    }
});

module.exports = redisClient;