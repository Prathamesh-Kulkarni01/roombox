
const { Redis } = require('@upstash/redis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

console.log('URL:', url ? 'EXISTS' : 'MISSING');
console.log('TOKEN:', token ? 'EXISTS' : 'MISSING');

if (url && token) {
    const sanitizedUrl = url.trim().replace(/^["']|["']$/g, '');
    const sanitizedToken = token.trim().replace(/^["']|["']$/g, '');

    console.log('Sanitized URL:', sanitizedUrl.substring(0, 20) + '...');
    
    const redis = new Redis({
        url: sanitizedUrl,
        token: sanitizedToken
    });

    redis.get('test').then(res => {
        console.log('Redis GET test successful:', res);
    }).catch(err => {
        console.error('Redis GET test failed:', err.message);
    });
}
