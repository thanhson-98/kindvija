// POST /api/leads — ドライバー応募フォーム (/lp, Vietnamese)
const { clean, isEmail, readRequest, isBot, sendMail, nowJst } = require('./_lib/mail');

const GENDER = { male: '男性（Nam）', female: '女性（Nữ）' };
const LICENSE = {
  none: '免許なし（Chưa có bằng lái）',
  A: 'A（二輪 / xe máy）',
  B1: 'B1',
  B2: 'B2',
  C: 'C（トラック / xe tải）',
  D: 'D以上（D trở lên）',
};
const JAPANESE = {
  none: '日本語なし（Chưa biết tiếng Nhật）',
  N5: 'N5',
  N4: 'N4',
  N3: 'N3',
  'N2-N1': 'N2 / N1',
};

module.exports = async (req, res) => {
  const body = readRequest(req, res);
  if (!body) return;
  if (isBot(body)) return res.status(200).json({ ok: true });

  const d = {
    name: clean(body.name, 100),
    phone: clean(body.phone, 40),
    email: clean(body.email, 254),
    age: clean(body.age, 3),
    gender: clean(body.gender, 20),
    province: clean(body.province, 60),
    license: clean(body.license, 20),
    japanese: clean(body.japanese, 20),
    utm_source: clean(body.utm_source, 100),
    utm_medium: clean(body.utm_medium, 100),
    utm_campaign: clean(body.utm_campaign, 100),
    page_url: clean(body.page_url, 500),
  };

  const age = Number(d.age);
  const missing = [];
  if (!d.name) missing.push('name');
  if (!/^[0-9+()\-.\s]{6,}$/.test(d.phone)) missing.push('phone');
  if (d.email && !isEmail(d.email)) missing.push('email');
  if (!Number.isInteger(age) || age < 18 || age > 60) missing.push('age');
  if (!GENDER[d.gender]) missing.push('gender');
  if (!d.province) missing.push('province');
  if (!LICENSE[d.license]) missing.push('license');
  if (d.japanese && !JAPANESE[d.japanese]) missing.push('japanese');
  if (missing.length) return res.status(400).json({ ok: false, error: 'invalid_fields', fields: missing });

  const utm = [d.utm_source, d.utm_medium, d.utm_campaign].some(Boolean)
    ? `${d.utm_source || '-'} / ${d.utm_medium || '-'} / ${d.utm_campaign || '-'}`
    : '（なし）';

  const text = [
    'SAKURA DRIVE 応募ページ（kindvija.com/lp）から応募がありました。',
    '',
    `氏名（Họ và tên）　　　：${d.name}`,
    `電話番号（SĐT）　　　　：${d.phone}`,
    `メール（Email）　　　　：${d.email || '（未記入）'}`,
    `年齢（Tuổi）　　　　　：${age}`,
    `性別（Giới tính）　　　：${GENDER[d.gender]}`,
    `居住地（Tỉnh/Thành）　 ：${d.province}`,
    `運転免許（Bằng lái）　 ：${LICENSE[d.license]}`,
    `日本語（Tiếng Nhật）　 ：${d.japanese ? JAPANESE[d.japanese] : '（未選択）'}`,
    '',
    '────────────────',
    `広告（utm source / medium / campaign）：${utm}`,
    `送信ページ：${d.page_url || '-'}`,
    `送信日時：${nowJst()}（日本時間）`,
  ].join('\n');

  try {
    await sendMail({
      subject: `【LP応募】${d.name}（${age}歳・${d.province}）`,
      text,
      replyTo: d.email ? { name: d.name, address: d.email } : undefined,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('leads: send failed', err);
    return res.status(500).json({ ok: false, error: 'send_failed' });
  }
};
