import elasticeEmail from './elasticemail';

export async function sendEmail(to: string, code: number | string) {
  elasticeEmail(to, code);
}
