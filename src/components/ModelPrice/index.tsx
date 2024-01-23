import { Table } from 'antd';
import { memo } from 'react';
import useSWR from 'swr';

const ModelPrice = memo(() => {
  const columns = [
    {
      dataIndex: 'modelName',
      title: '模型',
    },
    {
      dataIndex: 'inputPrice',
      title: '输入价格',
    },
    {
      dataIndex: 'outPrice',
      title: '输出价格',
    },
    {
      dataIndex: 'desc',
      render: (val: string) => val || '--',
      title: '描述',
    },
  ];
  const { data, isLoading = true } = useSWR('/api/user/modelList', async () => {
    const res = await fetch('/api/user/modelList', {
      cache: 'no-cache',
      method: 'GET',
    });
    const resData = await res.json();
    return resData.data || [];
  });
  return (
    <>
      <p style={{ margin: '10px 0' }}>
        本站大多模型比官方要更便宜，如claude价格是官方的2/5的价格
        表中价格为每1000个字符（约等于500个汉字）消耗的积分，用英文问答省一半价格
      </p>
      <Table
        columns={columns}
        dataSource={data}
        loading={isLoading}
        pagination={false}
        rowKey={'id'}
      />
    </>
  );
});

export default ModelPrice;
