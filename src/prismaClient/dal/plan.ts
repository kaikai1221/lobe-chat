import client from '../client';
import { Plan } from '../serverStatus';

// @dalErrorCatcher
export class PlanDAL {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor() {}

  static async getPlan(): Promise<Plan[]> {
    return await client.plan.findMany({
      include: {
        limits: {
          select: {
            duration: true,
            modelName: true,
            times: true,
          },
        },
        prices: {
          orderBy: [
            {
              amount: 'asc',
            },
          ],
          select: {
            amount: true,
            duration: true,
            id: true,
            name: true,
          },
          where: {
            isCurrent: true,
          },
        },

        // orders: false,
        redeems: false,
        subscriptions: false,
      },
    });
  }

  // static async newPlan(plan: DALType.newPlan): Promise<Plan> {
  //   return await client.plan.create({
  //     data: {
  //       name: plan.name,
  //       prices: {
  //         createMany: {
  //           data: [
  //             ...plan.prices.map((price) => ({
  //               name: price.name,
  //               amount: price.amount,
  //               duration: price.duration,
  //             })),
  //           ],
  //         },
  //       },
  //     },
  //   });
  // }
}
