const axios = require('axios');

const API_BASE = 'http://localhost:3000';
const TEST_EMAIL = `test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'Password123!';
const TEST_NAME = 'Test User';

async function testFlow() {
    console.log(`Starting test for email: ${TEST_EMAIL}`);

    try {
        // 1. Request verification code
        console.log('1. Requesting verification code...');
        const requestResp = await axios.post(`${API_BASE}/auth/request-verification`, {
            email: TEST_EMAIL
        });
        console.log('Response:', requestResp.data);

        if (!requestResp.data.success) {
            throw new Error('Verification request failed');
        }

        // NOTE: In a real test, we'd need to get the code from the DB or console logs.
        // Since I'm running this, I'll assume the code is generated and I can find it in the DB.
        // I'll add a database check here if I were running it against a real DB I can access.
        
        console.log('Wait... I need to get the code from the DB.');
        return;

    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
    }
}

testFlow();
