const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Environment variables
const shortCode = process.env.PAYBILL;         
const passKey = process.env.PASSKEY;           
const consumerKey = process.env.CONSUMER_KEY;  
const consumerSecret = process.env.CONSUMER_SECRET; 

// Serve the donation form
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Function to get access token
async function getAccessToken() {
  const resp = await axios({
    method: "GET",
    url: "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    auth: { username: consumerKey, password: consumerSecret }
  });
  return resp.data.access_token;
}

// Donation POST route
app.post("/donate", async (req, res) => {
  const { phone, amount } = req.body;

  if (!phone || !amount) {
    return res.status(400).send("Phone number and amount are required");
  }

  try {
    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = Buffer.from(shortCode + passKey + timestamp).toString("base64");

    const stkResponse = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: shortCode,
        PhoneNumber: phone,
        CallBackURL: `https://${process.env.RENDER_EXTERNAL_URL}/callback`,
        AccountReference: "MAXX TECH DONATION",
        TransactionDesc: "Donation to Maxx Tech"
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.send("Donation request sent! Check your phone to complete payment.");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Error initiating STK Push.");
  }
});

// Callback route to receive M-Pesa confirmation
app.post("/callback", (req, res) => {
  console.log("M-Pesa Callback:", req.body); 
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));