import { NextResponse } from 'next/server';
import { URL, URLSearchParams } from 'node:url';

import { UserDAL } from '@/prismaClient';

export const runtime = 'nodejs';
function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function asyncOperation() {
  return await new Promise((resolve) => {
    setTimeout(
      () => {
        resolve(true);
      },
      getRandomInt(500, 1500),
    );
  });
}

const handleFixcdn = async (arr: any[], handleData: any[], result: any[]) => {
  const data = arr.splice(0, getRandomInt(1, 3));
  console.log('操作：' + data.length);
  const res = await Promise.all(
    data.map(async (item) => {
      const content = JSON.parse(item.content);
      if (content && content.imageUrl) {
        const res = await fetch(
          content.imageUrl.replace('cdn.discordapp.com', 'fixcdn.hyonsu.com'),
          {
            method: 'GET',
            redirect: 'manual',
          },
        );
        if (res.status < 400) {
          content.imageUrl = res.headers.get('location');
          item.content = JSON.stringify(content);
          handleData.push(item);
          return true;
        } else {
          console.log(`${res.status}:${res.statusText}`);
          return item.id;
        }
      } else {
        return item.id;
      }
    }),
  );
  result.push(...res);
  if (arr.length) {
    await asyncOperation();
    console.log('剩余：' + arr.length);
    await handleFixcdn(arr, handleData, result);
  }
};

export async function GET() {
  try {
    console.log('开始处理');
    let res = await UserDAL.clearData();
    let imgList = await UserDAL.getAllHistory();
    const handleData = [] as typeof imgList;
    const result: any[] = [];
    const needList = imgList.filter((item) => {
      const content = JSON.parse(item.content || '{}');
      if (content && content.imageUrl) {
        const url = new URL(content.imageUrl);
        const queryParams = new URLSearchParams(url.search);
        const ex = queryParams.get('ex') || '';
        console.log(parseInt(ex, 16) - Math.floor(Date.now() / 1000));
        return parseInt(ex, 16) - Math.floor(Date.now() / 1000) <= 50_000;
      } else {
        return false;
      }
    });
    const allNumber = JSON.stringify(needList.length);
    console.log('需要处理：' + allNumber + '个数据');
    await handleFixcdn(needList, handleData, result);
    await UserDAL.updateHistory(handleData);
    // console.log(handleData);
    const msg =
      '数据清除：' +
      res +
      ';cdn刷新情况' +
      `共：${allNumber}，成功：${result.filter((item) => item === true).length}，失败id：${result.filter((item) => item !== true)}`;
    // console.log(imgList);
    return NextResponse.json(msg);
  } catch (error) {
    console.log('处理失败');
    console.log(error);
    return NextResponse.json(error);
  }
}
