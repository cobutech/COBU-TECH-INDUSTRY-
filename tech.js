// server.js
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Serve static files from the root directory

// Function to get Daraja API access token
const getAccessToken = async () => {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    const auth = 'Basic ' + Buffer.from(consumerKey + ':' + consumerSecret).toString('base64');

    try {
        const response = await axios.get(url, { headers: { Authorization: auth } });
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error.response ? error.response.data : error.message);
        throw error;
    }
};

// STK Push endpoint
app.post('/stkpush', async (req, res) => {
    try {
        const accessToken = await getAccessToken();
        const url = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

        const { amount, phone } = req.body;

        // Format phone number to 254...
        const formattedPhone = phone.startsWith('0') ? '254' + phone.substring(1) : phone;

        const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
        const shortcode = process.env.MPESA_SHORTCODE;
        const passkey = process.env.MPESA_PASSKEY;
        const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');

        const payload = {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline', // or 'CustomerBuyGoodsOnline'
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: shortcode,
            PhoneNumber: formattedPhone,
            CallBackURL: `${process.env.MPESA_CALLBACK_URL}/callback`,
            AccountReference: 'YourWebsiteName',
            TransactionDesc: 'Payment for services'
        };

        const response = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        res.status(200).json(response.data);

    } catch (error) {
        console.error('STK Push Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'An error occurred during the STK push process.' });
    }
});

// A simple callback endpoint for logging the result from Safaricom
app.post('/callback', (req, res) => {
    console.log('--- M-PESA Callback Received ---');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('-------------------------------');
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
});

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(__dirname + 'payment.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

