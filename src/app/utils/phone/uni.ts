/**
 * This is uni-sms API : https://unisms.apistd.com/
 * We currently support Easy Mode
 */

const accessKeyId = process.env.SMS_UNI_KEY_ID!;
const signature = process.env.SMS_UNI_SIGNATURE!;

interface UniResponse {
  code: string;
  data?: {
    currency: string;
    message: {
      countryCode: string;
      id: string;
      messageCount: number;
      price: string;
      regionCode: string;
      status: string;
      to: string;
      upstream: string;
    };
    messageCount: number;
    payAmount: string;
    recipients: number;
    totalAmount: string;
    virtualAmount: string;
  };
  message: string;
}
export async function uniSMS(number: string, code: string | number) {
  const response = (await (
    await fetch(`https://code-api.99wangkai.workers.dev/`, {
      body: JSON.stringify({ accessKeyId, code, number, signature }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
  )
    // eslint-disable-next-line unicorn/no-await-expression-member
    .json()) as UniResponse;
  if (response.code !== '0') return false;
  //   throw
  return true;
}
