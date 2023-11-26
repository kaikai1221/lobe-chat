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
  const res = await fetch(
    `https://uni.apistd.com?action=sms.message.send&accessKeyId=${accessKeyId}`,
    {
      body: JSON.stringify({
        signature /* Must be 4-6 numbers TODO Make a validation here */,
        templateData: {
          code,
          ttl: '5' /* The unit is minutes*/,
        },
        templateId: 'pub_verif_ttl3',
        to: number,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
  );
  const response = (await res.json()) as UniResponse;
  if (response.code !== '0') return false;
  //   throw
  return true;
}
