import { NextResponse } from 'next/server';
import fetch from 'node-fetch';

import { UserDAL } from '@/prismaClient';
import { serverStatus } from '@/prismaClient/serverStatus';

export const runtime = 'nodejs';
type JobDetails = {
  batch_size: number;
  current_status: string;
  enqueue_time: string;
  event_type: string;
  full_command: string;
  height: number;
  id: string;
  job_type: string;
  liked_by_user: boolean;
  parent_grid: number;
  parent_id: string;
  parsed_version: string;
  published: boolean;
  service: string;
  shown: boolean;
  user_id: string;
  username: string;
  width: number;
};
const getMjTem = async (page: number) => {
  const res = await fetch(`https://www.midjourney.com/api/pg/user-likes?page=${page}&_ql=explore`, {
    body: null,
    headers: {
      'Referer': 'https://www.midjourney.com/explore?tab=likes',
      'Referrer-Policy': 'origin-when-cross-origin',
      'accept': '*/*',
      'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'cookie':
        '__stripe_mid=514499dc-ecb3-451e-8f35-f6c65a589b5decae0d; _ga=GA1.1.657617495.1706182034; AMP_MKTG_437c42b22c=JTdCJTdE; darkMode=disabled; _gcl_au=1.1.1472547694.1713956173; __Host-Midjourney.AuthUserToken=eyJpZFRva2VuIjoiZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNklqSmtPV0kwWlRZNVpUTXlZamMyTVRWa05HTmtOMk5oWm1JNFptTTVZak5tT0RGaE5ERmhZekFpTENKMGVYQWlPaUpLVjFRaWZRLmV5SnVZVzFsSWpvaU9UbHJZV2tpTENKd2FXTjBkWEpsSWpvaU0yUmpZemxsWTJVM05EZGpZemcwWkRReE1EaGhaakpsTjJZNU9XSmxaallpTENKdGFXUnFiM1Z5Ym1WNVgybGtJam9pWVdNd1pEVmtNRE10WkRkaE1DMDBZekkzTFdFeU56SXRNRFkxTVRNM1pHWmpZVFUwSWl3aWFYTnpJam9pYUhSMGNITTZMeTl6WldOMWNtVjBiMnRsYmk1bmIyOW5iR1V1WTI5dEwyRjFkR2hxYjNWeWJtVjVJaXdpWVhWa0lqb2lZWFYwYUdwdmRYSnVaWGtpTENKaGRYUm9YM1JwYldVaU9qRTNNVE01TlRZeU1ETXNJblZ6WlhKZmFXUWlPaUp4WldkeFkwWm5OR1JHVFdvd2JVVkJUMVJXUWsxdlJFVkJjREF6SWl3aWMzVmlJam9pY1dWbmNXTkdaelJrUmsxcU1HMUZRVTlVVmtKTmIwUkZRWEF3TXlJc0ltbGhkQ0k2TVRjeE5EQXpNelV3TVN3aVpYaHdJam94TnpFME1ETTNNVEF4TENKbGJXRnBiQ0k2SWprNWQyRnVaMnRoYVVCbmJXRnBiQzVqYjIwaUxDSmxiV0ZwYkY5MlpYSnBabWxsWkNJNmRISjFaU3dpWm1seVpXSmhjMlVpT25zaWFXUmxiblJwZEdsbGN5STZleUprYVhOamIzSmtMbU52YlNJNld5SXhNVFExTmpBMk1qazJORFV5TnpNNU1UWXpJbDBzSW1WdFlXbHNJanBiSWprNWQyRnVaMnRoYVVCbmJXRnBiQzVqYjIwaVhYMHNJbk5wWjI1ZmFXNWZjSEp2ZG1sa1pYSWlPaUprYVhOamIzSmtMbU52YlNKOWZRLlVjM3E0bnU2eFJlaGIzcGpPUGZkZjNFZHhvanBmV1NxallhTmFQWFliVzZjRWh1ZEcxSm11WklDNkJSVkM2ekd4TlMwV2Z6WHNXdjFhY3FWZVBYNFJOckZ1U04yVDBXT1BTZ3dEOEoxVklzVjdsWTRZMm95UERhRDc1S2FZZ2ZjYXloM1M1RlE5eTVzU0Q5RFZLVmRrdmQybGdrUlkyN3piUncxRU93OEpnWlNoR1RoQnZkY05RbjhVWUd6TlI3WXJTOU43VTdBcjlSQkpUWkFIM2RPN213S05qRXF4RzhLYnNpRHV2LWp1UTZDOElNWWg3bzhSTTduOWhWeVRxUEp1YVBXZ1FxNHVjby04SU9oYk9HQ1piVjl6RzkzQ0NZc3ZRTmRHX2N3R0o0NUMtMlMwbEpKeGVURWJ5OFRtQ3ViaVRacC1DdmlWMnhrVE93MUhBdng4dyIsInJlZnJlc2hUb2tlbiI6IkFNZi12Qnlaa21pdzhsakNHTjdJbV9zN3l5Y3FuZ005X0ZLYWM4ekJMMlUxQVFvb3RkanpuZlNza0x4Y1NzMDB6a0FDa1pDdTRwcXpSUEQ2emVKNDhwTjN0dHoxdUdNUGVMSVpVMUZGM1ktUU5sQUtQT2NNdmR6SnRBcThqdWhsMTZoSHpud2xpWHBSVThPNWdOM2t6U0dmVHUyREZ2a1I3QjdaalUzQTVIUWVtOTBvNEh4ZTdVSHZMZWp2Ti1fYm1pTC1BMEpwTE9BcFJsQlJpTkl5emJka1YxT3NtbE1QX1RSSTlhenNVTUdadGtJZmFLVTVTczJtUXhzVHZoUEpuOU9ic1VNQ0VNdTNBQjlvRjVkTld1VndBd3RoZy1uU2JrcG5HMThvS2p1LVJkNGxjYjRqNjUwIn0; __Host-Midjourney.AuthUserToken.sig=9wz5IVRAiXiSxcS8LWB9T7gMAyEuDb6RYAyms64gg_Y; __Host-Midjourney.AuthUser=eyJpZCI6InFlZ3FjRmc0ZEZNajBtRUFPVFZCTW9ERUFwMDMiLCJtaWRqb3VybmV5X2lkIjoiYWMwZDVkMDMtZDdhMC00YzI3LWEyNzItMDY1MTM3ZGZjYTU0IiwiZW1haWwiOiI5OXdhbmdrYWlAZ21haWwuY29tIiwiZW1haWxWZXJpZmllZCI6dHJ1ZSwicGhvbmVOdW1iZXIiOm51bGwsImRpc3BsYXlOYW1lIjoiOTlrYWkiLCJwaG90b1VSTCI6IjNkY2M5ZWNlNzQ3Y2M4NGQ0MTA4YWYyZTdmOTliZWY2IiwiYWJpbGl0aWVzIjp7ImFkbWluIjpmYWxzZSwiZGV2ZWxvcGVyIjpmYWxzZSwiYWNjZXB0ZWRfdG9zIjp0cnVlLCJtb2RlcmF0b3IiOmZhbHNlLCJndWlkZSI6ZmFsc2UsImNvbW11bml0eSI6ZmFsc2UsInZpcCI6ZmFsc2UsImVtcGxveWVlIjpmYWxzZSwiYWxsb3dfbnNmdyI6ZmFsc2UsInRlc3RlciI6ZmFsc2UsImNvb2xkb3duc19yZW1vdmVkIjpmYWxzZSwiYmxvY2tlZCI6ZmFsc2UsImJpbGxpbmciOmZhbHNlLCJjbHViXzFrIjp0cnVlLCJjbHViXzJwNWsiOmZhbHNlLCJjbHViXzVrIjpmYWxzZSwiY2x1Yl8xMGsiOmZhbHNlLCJjbHViXzI1ayI6ZmFsc2UsIndlYl90ZXN0ZXIiOnRydWUsImNhbl90ZXN0IjpmYWxzZSwiaXNfc3Vic2NyaWJlciI6dHJ1ZSwiY2FuX3ByaXZhdGUiOmZhbHNlLCJjYW5fcmVsYXgiOnRydWUsInBsYW5fdHlwZSI6InN0YW5kYXJkIiwiaXNfdHJpYWwiOmZhbHNlLCJkZWxldGVfYXQiOm51bGx9LCJ3ZWJzb2NrZXRBY2Nlc3NUb2tlbiI6ImV5SjFjMlZ5WDJsa0lqb2lZV013WkRWa01ETXRaRGRoTUMwMFl6STNMV0V5TnpJdE1EWTFNVE0zWkdaallUVTBJaXdpZFhObGNtNWhiV1VpT2lJNU9XdGhhU0lzSW1saGRDSTZNVGN4TkRBek16VXdNWDAuTGdBX2kwdTBSc0I4dGUtYkQ3MXV1Q0FkaFdKOFZHaUdla1JaN2hneG1pdyJ9; __cf_bm=wYJSBo89jFiJyFfHpLUDDzPXorzbO1A3SZ17rnqzD0c-1714034606-1.0.1.1-AJ943UqegIKy0guUY2o9zs_jFN2lmxKNFhkhCROPWodnr.fYZJk3CEESQ_qi5RbnOuKgMPzNOqYGko9yhUfO8Q; AMP_437c42b22c=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjJjZmQ3ZmNlYi05YmVhLTQ1NGEtYmI2Mi0wNDExNDRjMGQ1MDclMjIlMkMlMjJ1c2VySWQlMjIlM0ElMjJhYzBkNWQwMy1kN2EwLTRjMjctYTI3Mi0wNjUxMzdkZmNhNTQlMjIlMkMlMjJzZXNzaW9uSWQlMjIlM0ExNzE0MDM0NjQ0MjY0JTJDJTIyb3B0T3V0JTIyJTNBZmFsc2UlMkMlMjJsYXN0RXZlbnRUaW1lJTIyJTNBMTcxNDAzNDY5MTYyOCUyQyUyMmxhc3RFdmVudElkJTIyJTNBOTQ0JTdE; cf_clearance=IUy2hbbzaD6j8cZdYz8ZRBD3RZncWz1Z9UE0vrb1rL0-1714034694-1.0.1.1-6NbxzzSKYmyVPfHfgp0YqJSpmVRdlNSZqZc1ms81u1Xfxi1g4_ZsvqOfwbp7umFEHl3.QYfh.Wud01zatMVSgQ; _ga_Q0DQ5L7K0D=GS1.1.1714034645.5.1.1714034694.0.0.0',
      'if-none-match': 'W/"cyqnht1y0mi4p"',
      'priority': 'u=1, i',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-csrf-protection': '1',
    },
    method: 'GET',
  });
  const data: { jobs: JobDetails[] } = (await res?.json()) as { jobs: JobDetails[] };
  return data?.jobs || [];
};
export async function GET() {
  console.log('async begin');
  const pageArr = Array.from({ length: 10 }).fill(0);
  const resAll = await Promise.all(pageArr.map((item: any, key: number) => getMjTem(key + 1)));
  const allData = resAll.flat();
  const isRight = allData.every((item) => {
    return item.parent_id && item.full_command && item.enqueue_time;
  });
  if (isRight) await UserDAL.asyncMidTem(JSON.stringify(allData));
  console.log('async end');
  return NextResponse.json({
    body: isRight,
    status: serverStatus.success,
  });
}
