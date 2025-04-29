const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Разрешаем запросы с Webflow
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// 🔐 Переменные окружения
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_TO = process.env.EMAIL_TO;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

// 🌐 Meta Pixel (CAPI)
const PIXEL_ID = '3163893020418003';
const ACCESS_TOKEN = 'EAAS0krqjrZBQBO8UNFcg6dZB3RpompdfjDmepVzxQUhzljdEemnRJLq9xnbZCsnHT78uZAGPCnBHuZBrUWnXCcgSZBPLaPX5w9iP2RVaOJ7C91ceZBkRmaSMMBBTUBXpnjjkBHpykZA2voA9YAqwZA5ppcD0VR8IU0PjJIGmPVZAMa2OJGpyo3ZCgiHi4Lbg4IxywZDZD';

const hashSHA256 = (input) =>
  crypto.createHash('sha256').update(input.trim().toLowerCase()).digest('hex');

async function sendLeadToMeta({ email, phone, firstName, url, userAgent }) {
  const payload = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: url || 'https://www.pinkrabbit.marketing/thankyou',
        action_source: 'website',
        user_data: {
          em: hashSHA256(email || ''),
          ph: hashSHA256(phone || ''),
          fn: hashSHA256(firstName || ''),
          client_user_agent: userAgent
        }
      }
    ]
  };

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('[Meta CAPI] Lead sent:', result);
  } catch (err) {
    console.error('[Meta CAPI] Error:', err.message);
  }
}

// 🚀 Telegram
const sendToTelegram = async (text) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
    }),
  });
};

// 📩 Email
const sendEmail = async (subject, html) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: EMAIL_TO,
    subject,
    html,
  });
};

// ✅ Обработка формы
app.post('/notify', async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    const lines = entries.map(([key, val]) =>
      `${key.charAt(0).toUpperCase() + key.slice(1)}: ${val}`
    );
    const message = lines.join('\n');

    await sendToTelegram(message);
    await sendEmail('New Webflow Form Submission', `<pre>${message}</pre>`);

    // 💥 Отправка события Lead в Meta CAPI
    await sendLeadToMeta({
      email: req.body.email,
      phone: req.body.phone,
      firstName: req.body.name,
      url: 'https://www.pinkrabbit.marketing/thankyou',
      userAgent: req.headers['user-agent']
    });

    res.status(200).send('ok');
  } catch (err) {
    console.error('Notification error:', err);
    res.status(500).send('error');
  }
});

app.get('/', (req, res) => {
  res.send('Webhook is alive');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
