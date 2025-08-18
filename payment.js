
// script.js
document.getElementById('paymentForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const phone = document.getElementById('phone').value;
    const amount = document.getElementById('amount').value;
    const responseMessage = document.getElementById('responseMessage');
    const payButton = document.getElementById('payButton');

    payButton.textContent = 'Processing...';
    payButton.disabled = true;
    responseMessage.textContent = '';

    try {
        const response = await fetch('/stkpush', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone, amount }),
        });

        const data = await response.json();

        if (response.ok) {
            responseMessage.textContent = 'STK push sent! Please check your phone to complete the payment.';
            responseMessage.style.color = 'green';
        } else {
            throw new Error(data.message || 'An unknown error occurred.');
        }

    } catch (error) {
        responseMessage.textContent = `Error: ${error.message}`;
        responseMessage.style.color = 'red';
    } finally {
        payButton.textContent = 'Pay Now';
        payButton.disabled = false;
    }
});

