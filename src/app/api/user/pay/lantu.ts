import { type NextRequest } from 'next/server';
import md5 from 'spark-md5';

const mch_id = process.env.LANTU_PAY_SHOPID!;
const appSecret = process.env.LANTU_PAY_APPSECRET!;

const domain = process.env.DOMAIN;
const callbackDomain = process.env.CALLBACK_DOMAIN || domain;

interface PaymentArgs {
  attach: string | null;
  body: string;
  developer_appid?: string;
  mch_id: string;
  notify_url: string;
  out_trade_no: string;
  return_url: string | null;
  sign?: string;
  time_expire: string | null;
  timestamp: string;
  total_fee: string;
}

interface PaymentResponse {
  errcode: number;
  errmsg: string;
  hash?: string;
  openid: number;
  url: string;
  // 来自文档：订单id(此处有个历史遗留错误，返回名称是openid，值是orderid，一般对接不需要这个参数)
  url_qrcode: string;
}

export interface CallbackBody {
  attach?: string | null;
  code: string;
  mch_id: string;
  openid?: string | null;
  order_no: string;
  out_trade_no: string;
  pay_channel: string | null;
  pay_no: string;
  sign?: string | null;
  success_time?: string | null;
  timestamp: string;
  total_fee?: string;
  trade_type: string | null;
}

/**
 * Sort the key names and link together
 * @param parameters
 * @return linked sting
 */
function sortAndSignParameters(parameters: PaymentArgs | CallbackBody): string {
  const paramsArr = Object.keys(parameters);
  paramsArr.sort();
  const stringArr = [];
  for (const key of paramsArr) {
    if (parameters[key as keyof typeof parameters]) {
      stringArr.push(key + '=' + parameters[key as keyof typeof parameters]);
    }
  }
  // 最后加上商户Key
  stringArr.push('key=' + appSecret);
  const string = stringArr.join('&');
  return md5.hash(string).toString().toUpperCase();
}
/**
 * Request a order
 * @param orderId internal order id
 * @param price the price need to be paid
 * @param attach encrypted field being transmitted.
 * @param title payment title
 */
export async function startPay({
  orderId,
  price,
  attach,
  title,
  isMobile,
}: {
  attach: string;
  isMobile?: boolean;
  orderId: string;
  price: number;
  title?: string;
}) {
  const fetchBody: PaymentArgs = {
    // After the user has successfully made the payment, we will automatically redirect the user's browser to this URL.
    // plugins: string;
    attach,

    body: title || '购买套餐',

    mch_id: mch_id,

    notify_url: `${callbackDomain}`,

    out_trade_no: orderId,

    return_url: `${domain}`,

    // Return as is during callback. 📢We use it to confirm that the order has not been tampered with.
    time_expire: '5m',

    timestamp: Math.floor(Date.now() / 1000).toString(),
    // total_fee: "0.01",
    total_fee: (price / 100).toFixed(2).toString(),
  };
  // const stringA = sortAndSignParameters({...fetchBody,return_url:null,attach:null,time_expire:null});
  const sign = sortAndSignParameters({
    ...fetchBody,
    attach: null,
    return_url: null,
    time_expire: null,
  });
  // console.log(sign);
  // return;
  const params: string = Object.keys({ ...fetchBody, sign: sign })
    .map((key: string) => key + '=' + { ...fetchBody, sign: sign }[key])
    .join('&');
  const resp = await fetch(
    isMobile
      ? 'https://api.ltzf.cn/api/wxpay/jump_h5'
      : 'https://api.ltzf.cn/api/wxpay/jsapi_convenient',
    {
      body: params,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      method: 'POST',
    },
  );
  try {
    return (await resp.json()) as PaymentResponse;
  } catch {
    return null;
  }
}

function urlEncodedStringToJson(encodedString: string): Record<string, string> {
  const urlParams = new URLSearchParams(encodedString);
  return Object.fromEntries(urlParams.entries());
}

/**
 * Verification callback data
 * @param req
 * @return return order id in system
 */
export async function handleCallback(req: NextRequest) {
  // const body =  await req.clone().json()
  const body = urlEncodedStringToJson(await req.clone().text()) as unknown as CallbackBody;
  // console.log(req.body);
  // const body = req.body as unknown as CallbackBody;
  /* == Verify Security field == */
  /*
   Currently only the appId is being validated.
   In the future, attach will also need to be validated to improve security.
   */
  // return null;
  console.log(body);
  if (body.mch_id !== mch_id) return null;
  /* == Verify Signature == */
  const trueHash = body.sign!;
  delete body.sign; /* remove hash before sign */
  //
  const hash = sortAndSignParameters({
    ...body,
    attach: null,
    openid: null,
    pay_channel: null,
    sign: null,
    success_time: null,
    trade_type: null,
  });
  //
  if (hash !== trueHash) return null;
  /* ====================== */
  return body.out_trade_no;
}
