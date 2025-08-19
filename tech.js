// server.js
const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the root directory
app.use(express.static(__dirname));

// A simple route to confirm the server is running
app.get('/status', (req, res) => {
    console.log('✅ Server status check received.');
    res.status(200).send('Server is up and running.');
});

// Function to get Daraja API access token
const getAccessToken = async () => {
    console.log('🔄 Attempting to get Daraja API access token...');
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    const auth = 'Basic ' + Buffer.from(consumerKey + ':' + consumerSecret).toString('base64');

    try {
        const response = await axios.get(url, { headers: { Authorization: auth } });
        console.log('✅ Access token received successfully.');
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Error getting access token:', error.response ? error.response.data : error.message);
        throw error;
    }
};

// STK Push endpoint
app.post('/stkpush', async (req, res) => {
    console.log('➡️ STK Push request received from client.');
    try {
        const accessToken = await getAccessToken();
        const url = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

        const { amount, phone } = req.body;

        // Ensure the phone number is in the correct format (254...)
        const formattedPhone = phone.startsWith('0') ? '254' + phone.substring(1) : phone;
        console.log(`📱 Phone number formatted to: ${formattedPhone}`);

        const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
        const shortcode = process.env.MPESA_SHORTCODE;
        const passkey = process.env.MPESA_PASSKEY;
        const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');

        const payload = {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: shortcode,
            PhoneNumber: formattedPhone,
            CallBackURL: `${process.env.MPESA_CALLBACK_URL}`,
            AccountReference: 'YourWebsiteName',
            TransactionDesc: 'Payment for services'
        };

        console.log('🔍 Sending STK Push request to Daraja with payload:', JSON.stringify(payload, null, 2));

        const response = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ STK Push request accepted by Daraja. Response data:', JSON.stringify(response.data, null, 2));
        res.status(200).json(response.data);

    } catch (error) {
        console.error('❌ STK Push Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'An error occurred during the STK push process.' });
    }
});

// A simple callback endpoint for logging the result from Safaricom
app.post('/callback', (req, res) => {
    console.log('--- 📞 M-PESA Callback Received ---');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('-------------------------------');
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
});

// Serve the HTML file as the main entry point
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'payment.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
