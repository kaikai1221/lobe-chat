import client, { type Order, OrderStatus, Prisma } from '../client';
import { serverStatus } from '../serverStatus';

export const OrderDAL = {
  getNextId(): string {
    const timestamp: string = Date.now().toString();
    const randomDigits: string = (Math.random() * 1e6).toFixed(0).padStart(6, '0');
    return `${timestamp}${randomDigits}`;
  },

  async newOrder({
    amount,
    userId,
    priceId,
    count,
  }: {
    amount?: number;
    count: number;
    planId: number;
    priceId: number;
    userId: number;
  }): Promise<Order> {
    let price = undefined;
    if (priceId) {
      price = await client.prices.findUniqueOrThrow({
        where: {
          id: priceId,
        },
      });
    }
    const orderInput: Prisma.OrderCreateInput = {
      amount: price ? price.amount : amount || 0,
      count: count,
      orderId: this.getNextId(),
      price: price
        ? {
            connect: {
              id: priceId,
            },
          }
        : undefined,
      status: OrderStatus.Pending,
      user: {
        connect: {
          userId,
        },
      },
    };
    return await client.order.create({ data: orderInput });
  },

  async payOrder(orderId: string): Promise<{ code: number; order?: Order }> {
    const orderData = await client.order.findUnique({
      where: {
        orderId: orderId,
      },
    });
    if (orderData?.status === 'Paid') return { code: 500, order: undefined };
    const newOrder = await client.order.update({
      data: {
        status: OrderStatus.Paid,
      },
      include: {
        price: {
          include: {
            plan: {
              select: {
                level: true,
                limits: true,
              },
            },
          },
        },
        user: {
          include: {
            subscriptions: {
              include: {
                plan: true,
              },
              orderBy: [
                {
                  expiredAt: 'desc',
                },
              ],
              where: {
                expiredAt: {
                  gte: new Date() /* Includes time offset for UTC */,
                },
              },
            },
          },
        },
      },
      where: {
        orderId: orderId,
      },
    });
    const priceDate = newOrder.price;
    if (priceDate) {
      const modelList = priceDate.plan.limits;
      let currentDate = new Date();
      const levelSubscriptions = newOrder.user.subscriptions.filter(
        (item) => item.plan.level === priceDate.plan.level,
      );
      if (levelSubscriptions.length) {
        currentDate = new Date(levelSubscriptions[0].expiredAt);
      }
      const subscriptionInput: Prisma.SubscriptionCreateInput = {
        createdAt: new Date(),
        expiredAt: new Date(currentDate.getTime() + priceDate.duration * 1000),
        order: {
          connect: {
            orderId: orderId,
          },
        },
        plan: {
          connect: {
            planId: priceDate.planId,
          },
        },
        startAt: currentDate,
        user: {
          connect: {
            userId: newOrder.userId,
          },
        },
      };
      let userLimitsInput = {
        data: [] as Prisma.UserLimitsUncheckedCreateInput[],
      };
      const res = await client.subscription.create({
        data: subscriptionInput,
      });
      for (const item of modelList) {
        for (let i = 1; item.duration * i <= priceDate.duration; i++) {
          userLimitsInput.data.push({
            createdAt: new Date(),
            expiredAt: new Date(currentDate.getTime() + item.duration * i * 1000),
            modelName: item.modelName,
            startAt: new Date(currentDate.getTime() + item.duration * (i - 1) * 1000),
            subscriptionId: res.subscriptionId,
            userId: newOrder.userId,
          });
        }
      }
      await client.userLimits.createMany(userLimitsInput);
    } else {
      await client.user.update({
        data: {
          integral: {
            increment: newOrder.amount * 10,
          },
        },
        where: {
          userId: newOrder.userId,
        },
      });
      await client.integralUsed.create({
        data: {
          desc: '充值',
          modelName: undefined,
          useValue: newOrder.amount * 10,
          userId: newOrder.userId,
        },
      });
    }
    return {
      code: serverStatus.success,
      order: newOrder,
    };
  },
};
