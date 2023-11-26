// const smsService = process.env.SMS_SERVICE;
export async function sendPhone(number: string, code: string | number): Promise<boolean> {
  const sms = await import('./uni');
  return sms.uniSMS(number, code);
}
