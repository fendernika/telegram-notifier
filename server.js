const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Настройки
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_TO = process.env.EMAIL_TO;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

// Telegram notify
const sendToTelegram = (text) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  const params = new URLSearchParams({
    chat_id: TELEGRAM_CHAT_ID,
    text
  });
  return fetch(`${url}?${params.toString()}`);
};

// Email notify
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});
const sendEmail = (subject, html) => {
  return transporter.sendMail({
    from: EMAIL_FROM,
    to: EMAIL_TO,
    subject,
    html
  });
};

// Получение формы
app.post('/notify', async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    const lines = entries.map(([key, val]) =>
      `${key.charAt(0).toUpperCase() + key.slice(1)}: ${val}`
    );
    const message = lines.join('\n');

    await sendToTelegram(message);
    await sendEmail('New Webflow Form Submission', `<pre>${message}</pre>`);

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
