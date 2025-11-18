const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Pesapal credentials from environment variables
const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;

// Live Pesapal API URL
const PESAPAL_API_URL = "https://www.pesapal.com/API/iframepayment";

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/donate", async (req, res) => {
  const { phone, amount } = req.body;

  if (!phone || !amount) return res.status(400).send("Phone and amount required");

  try {
    const timestamp = new Date().toISOString();
    const nonce = crypto.randomBytes(16).toString("hex");

    // Generate HMAC SHA256 signature
    const signature = crypto.createHmac("sha256", consumerSecret)
                            .update(`${consumerKey}${nonce}${timestamp}`)
                            .digest("base64");

    const requestBody = {
      amount: amount,
      currency: "KES",
      description: "Donation to Maxx Tech",
      type: "MERCHANT",
      reference: "MAXXTECH" + Date.now(),
      first_name: "Donor",
      last_name: "",
      email: "donor@example.com",
      phone_number: phone,
      callback_url: `https://${process.env.RENDER_EXTERNAL_URL}/callback`,
      // Important: Make sure your Pesapal account is linked to Paybill 714888
      paybill_number: "714888"
    };

    const response = await axios.post(
      PESAPAL_API_URL,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${signature}`,
          "Content-Type": "application/json"
        }
      }
    );

    // Redirect donor to Pesapal checkout (STK Push will appear here)
    res.redirect(response.data.checkout_url);

  } catch (err) {
    console.error("Pesapal Error:", err.response?.data || err.message);
    res.status(500).send("Error initiating Pesapal payment: " + (err.response?.data?.message || err.message));
  }
});

// Callback route for Pesapal payment notifications
app.post("/callback", (req, res) => {
  console.log("Pesapal Callback:", req.body);
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Maxx Tech donation portal running on port ${PORT}`));

// Redeploy to renew SSL certificate