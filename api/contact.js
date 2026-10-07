// POST /api/contact — 無料相談・お問い合わせフォーム (contact.html)
const { clean, isEmail, readRequest, isBot, sendMail, nowJst } = require('./_lib/mail');

module.exports = async (req, res) => {
  const body = readRequest(req, res);
  if (!body) return;
  if (isBot(body)) return res.status(200).json({ ok: true });

  const d = {
    type: clean(body.type, 100),
    company: clean(body.company, 200),
    name: clean(body.name, 100),
    email: clean(body.email, 254),
    phone: clean(body.phone, 40),
    message: clean(body.message, 5000, true),
    agree: body.agree === true || body.agree === 'on' || body.agree === 'true',
  };

  const missing = [];
  if (!d.type) missing.push('type');
  if (!d.name) missing.push('name');
  if (!isEmail(d.email)) missing.push('email');
  if (!d.message) missing.push('message');
  if (!d.agree) missing.push('agree');
  if (missing.length) return res.status(400).json({ ok: false, error: 'invalid_fields', fields: missing });

  const text = [
    'kindvija.com のお問い合わせフォームから送信がありました。',
    '',
    `お問い合わせの種類：${d.type}`,
    `会社名　　　　　　：${d.company || '（未記入）'}`,
    `お名前　　　　　　：${d.name}`,
    `メールアドレス　　：${d.email}`,
    `電話番号　　　　　：${d.phone || '（未記入）'}`,
    '',
    '■ ご相談内容',
    d.message,
    '',
    '────────────────',
    `送信日時：${nowJst()}（日本時間）`,
    'このメールに返信すると、お客様のメールアドレス宛てに送られます。',
  ].join('\n');

  try {
    await sendMail({
      subject: `【kindvija お問い合わせ】${d.name}様（${d.type}）`,
      text,
      replyTo: { name: d.name, address: d.email },
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact: send failed', err);
    return res.status(500).json({ ok: false, error: 'send_failed' });
  }
};
