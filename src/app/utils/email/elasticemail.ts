/**
 * Elastice Email sender
 */
const apiKey = process.env.ELASTICE_EMAIL_API_KEY!;
const senderEmail = process.env.ELASTICE_EMAIL_SENDER!;

export default async function sendEmail(to: string, code: string | number) {
  const params = {
    apikey: apiKey,
    bodyHtml: `
    <table>
    <tr><td><p style="margin: 0px; padding: 0px;width:100%">您正在进行登录/注册操作，您的验证码是${code}，有效期5分钟请妥善保存不要泄露给他人。</p></td></tr>
    <tr><td><p style="margin: 0px; padding: 0px;width:100%">关注公众号获取最新动态、免费领取使用额度！</p></td></tr>
    <tr><td><img src="https://api.smtprelay.co/userfile/377b5095-84c2-4544-9f24-75d49cf5c002/weixingongzhonghao.jpg"
      alt="Image" style="border-width: 0px; border-style: none; width: 100%;"
      width="1280"></td></tr>
  </table>`,
    from: senderEmail,
    subject: '[AI聊天室] 激活码',
    to: to,
  };

  const formData = new FormData();
  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      formData.append(key, params[key as keyof typeof params]);
    }
  }

  const response = await fetch('https://api.elasticemail.com/v2/email/send', {
    body: formData,
    method: 'POST',
  });
  console.log(await response.json());
  return response.ok;
}
