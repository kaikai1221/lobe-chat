import { PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { GradientButton, Image } from '@lobehub/ui';
import { Alert, Input, Segmented, Select, Slider, Tooltip, Upload, message } from 'antd';
import { createStyles } from 'antd-style';
import type { RcFile, UploadProps } from 'antd/es/upload';
import type { UploadFile } from 'antd/es/upload/interface';
import Compressor from 'compressorjs';
import React, { useEffect, useState } from 'react';

import { LOBE_CHAT_ACCESS_CODE } from '@/const/fetch';
import { useGlobalStore } from '@/store/global';

const { TextArea } = Input;
const useStyles = createStyles(({ css, token, isDarkMode }) => ({
  action: css`
    border: 1px solid ${isDarkMode ? token.colorFillTertiary : token.colorFillSecondary};
    border-radius: ${token.borderRadiusLG}px;
  `,
  aspect: css`
    height: 100%;
    padding: 10px 0;
  `,
  aspectText: css`
    width: 32px;
    margin-top: 5px;
    line-height: 16px;
  `,
  aspectWrap: css`
    display: flex;
    align-items: center;
    justify-content: center;

    width: 32px;
    height: 32px;
  `,
}));
const filterOption = (input: string, option?: { label: string; value: string }) =>
  (option?.label ?? '').toLowerCase().includes(input.toLowerCase());
const getBase64 = (file: RcFile): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.addEventListener('load', () => resolve(reader.result as string));
    // eslint-disable-next-line unicorn/prefer-add-event-listener
    reader.onerror = (error) => reject(error);
  });
const customUpload = async (data: any) => {
  const { file, onError, onSuccess } = data;
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
  if (!isJpgOrPng) {
    message.error('只能上传jpg、png图片');
    file.status = 'error';
    onError('只能上传jpg、png图片', file);
    return;
  }
  const isLt2M = file.size / 1024 / 1024 < 5;
  if (!isLt2M) {
    message.error('图片不能大于5m');
    file.status = 'error';
    onError('图片不能大于5m', file);
    return;
  }
  let quality = 1;
  if (file && file.size) {
    if (file.size > 100_000 && file.size < 1_000_000) quality = 0.8;
    if (file.size > 1_000_000 && file.size < 4_000_000) quality = 0.5;
    if (file.size > 4_000_000) quality = 0.3;
    new Compressor(file, {
      error(err) {
        file.status = 'error';
        onError(err.message, file);
        message.error(err.message);
      },
      quality: quality,
      success(result) {
        onSuccess(result);
      },
    });
  } else {
    file.status = 'error';
    onError('图片不能大于5m', file);
    message.error('图片有问题请换张图片');
  }
};
const ActionPanel = (props: {
  isGenerating: boolean;
  mobile?: boolean;
  setGenerating: (data: boolean) => void;
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewImage, setPreviewImage] = useState('');
  const [disableChat, setDisableChat] = useState(false);
  const [setting, setSettingConfig] = useState<{
    aspect: string;
    iw: number;
    module: string;
    prompt: string;
    quality: string;
    user_prompt: string;
    version: string;
    version_name: string;
  }>({
    aspect: '1:1',
    iw: 0.5,
    module: 'midjourney',
    prompt: '',
    quality: '4k',
    user_prompt: '',
    version: '5.2',
    version_name: '',
  });
  const generateImage = async () => {
    props.setGenerating(true);
    setDisableChat(true);
    let base64Array: string[] = [];
    if (fileList.length) {
      const getBase64 = new Promise<string[]>((req, rej) => {
        const baseArr: string[] = [];
        for (const item of fileList) {
          const fileReader = new FileReader();
          fileReader.readAsDataURL(item.response);
          fileReader.addEventListener('load', function () {
            if (fileReader.result) {
              baseArr.push(fileReader.result as string);
            } else {
              rej([]);
            }
            if (baseArr.length === fileList.length) {
              req(baseArr);
            }
          });
        }
      });
      base64Array = await getBase64;
    }
    if (setting.prompt.length === 0 && fileList.length < 2) {
      message.error('无描述时至少上传两张图片');
      return;
    }
    if (setting.prompt.length > 0 || fileList.length > 0) {
      const res = await fetch(
        `/api/user/mj/ai/draw/mj/${
          fileList.length >= 2 && setting.prompt.length === 0 ? 'blend' : 'imagine'
        }`,
        {
          body: JSON.stringify({
            base64Array,
            model: 'midjourney',
            prompt: setting.prompt,
          }),
          cache: 'no-store',
          headers: {
            [LOBE_CHAT_ACCESS_CODE]: useGlobalStore.getState().settings.token || '',
          },
          method: 'POST',
        },
      );
      if (res?.status === 413) {
        message.error('图片过大请删除或压缩后重试');
        props.setGenerating(false);
      }
      if (res?.status !== 200) {
        console.log(res.statusText);
        message.error(res.statusText || '系统异常请稍后再试');
        props.setGenerating(false);
      }
      const resData = await res?.clone().json();

      if (res?.status === 200 && resData.code === 0) {
        setSettingConfig({ ...setting, prompt: '' });
        setFileList([]);
        props.setGenerating(true);
        // GetStatus(setChatHistory, 3000);
        message.success('正在生成，请稍等');
      } else {
        props.setGenerating(false);
        message.error(resData.msg);
      }
      setDisableChat(false);
    } else {
      message.error('请输入描述或上传图片');
    }
  };
  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
    console.log(newFileList);
  };
  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as RcFile);
    }
    setPreviewImage(file.url || (file.preview as string));
  };
  useEffect(() => {
    setSettingConfig({ ...setting, prompt: sessionStorage.getItem('aiImagePrompt') || '' });
  }, [typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('aiImagePrompt') : null]);
  useEffect(() => {
    const prompt = `${setting.user_prompt} ${setting.quality} ${
      fileList.length ? '--iw ' + setting.iw : ''
    } ${setting.version_name ? '--' + setting.version_name + ' ' : '--version '}${
      setting.version
    } --aspect ${setting.aspect}`;
    setSettingConfig({ ...setting, prompt });
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('aiImagePrompt', prompt);
    }
  }, [
    setting.aspect,
    setting.quality,
    setting.version,
    setting.version_name,
    setting.user_prompt,
    setting.iw,
  ]);
  const sizeOption = [
    {
      height: '32px',
      label: '1:1',
      value: '1:1',
      width: '32px',
    },
    {
      height: '32px',
      label: '3:4',
      value: '3:4',
      width: '24px',
    },
    {
      height: '24px',
      label: '4:3',
      value: '4:3',
      width: '32px',
    },
    {
      height: '32px',
      label: '9:16',
      value: '9:16',
      width: '18px',
    },
    {
      height: '18px',
      label: '16:9',
      value: '16:9',
      width: '32px',
    },
  ];
  const configOption = [
    {
      Tooltip: '选择Midjourney的版本',
      options:
        setting.version_name !== 'niji'
          ? [
              { label: 'V 5.2', value: '5.2' },
              { label: 'V 5.1', value: '5.1' },
              { label: 'V 5', value: '5' },
              { label: 'V 4', value: '4' },
            ]
          : [{ label: 'V 5', value: '5' }],
      title: '版本选择',
      value: 'version',
    },
    {
      Tooltip: '选择生成的图片画质',
      options: [
        { label: '4k', value: '4k' },
        { label: '8k', value: '8k' },
        { label: '16k', value: '16k' },
        { label: '32k', value: '32k' },
        { label: '超高清', value: 'Super-Resolution' },
        { label: 'HD', value: 'HD' },
        { label: 'UHD', value: 'UHD' },
        { label: 'Ultra-HD', value: 'Ultra-HD' },
        { label: 'Full-HD', value: 'Full-HD' },
        { label: '144p', value: '144p' },
        { label: '240p', value: '240p' },
        { label: '480p', value: '480p' },
        { label: '720p', value: '720p' },
        { label: '1080p', value: '1080p' },
      ],
      title: '画质选择',
      value: 'quality',
    },
  ];

  const { styles } = useStyles();
  return (
    <div style={{ padding: props.mobile ? '16px' : '' }}>
      <p>
        功能选择
        <Tooltip title="MJ是目前最强大简单的的图像生成器，SD是可定制化更高的图像生成器，DALL-E是由 OpenAI 开发的图像生成器">
          <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
        </Tooltip>
      </p>
      <Segmented
        onChange={(v) => setSettingConfig({ ...setting, module: v.toString() })}
        options={[
          { label: 'MJ', value: 'midjourney' },
          { disabled: true, label: 'SD', value: 'stable_diffusion' },
          { disabled: true, label: 'DELLE', value: 'dall_e' },
        ]}
        style={{ marginBottom: '20px' }}
        value={setting.module}
      />
      <p>
        图片比例
        <Tooltip title="选择生成的图片宽高比">
          <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
        </Tooltip>
      </p>
      <Segmented
        onChange={(v) => setSettingConfig({ ...setting, aspect: v.toString() })}
        options={sizeOption.map((item) => ({
          label: (
            <div className={styles.aspect}>
              <div className={styles.aspectWrap}>
                <div
                  style={{
                    border: '2px solid #aaa',
                    borderRadius: '5px',
                    height: item.height,
                    width: item.width,
                  }}
                ></div>
              </div>
              <p className={styles.aspectText}>{item.label}</p>
            </div>
          ),
          value: item.value,
        }))}
        style={{ marginBottom: '20px' }}
        value={setting.aspect}
      />
      <p>
        模型选择
        <Tooltip title="Midjourney较为通用，而NijiJourney适合生成动漫风格的图像">
          <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
        </Tooltip>
      </p>
      <Segmented
        onChange={(v) =>
          setSettingConfig({
            ...setting,
            version: v.toString() ? '5' : '5.2',
            version_name: v.toString(),
          })
        }
        options={[
          { label: 'Midjourney', value: '' },
          // { label: 'Midjourney 5', value: '5' },
          { label: 'NijiJourney', value: 'niji' },
        ]}
        style={{ marginBottom: '20px' }}
        value={setting.version_name}
      />
      {configOption.map((item, index) => (
        <div key={index} style={{ alignItems: 'center', display: 'flex', marginBottom: '10px' }}>
          <p>{item.title}</p>
          <Tooltip title={item.Tooltip}>
            <QuestionCircleOutlined style={{ margin: '0 5px' }} />
          </Tooltip>
          <Select
            filterOption={filterOption}
            onChange={(v) => setSettingConfig({ ...setting, [item.value]: v.toString() })}
            options={item.options}
            showSearch
            style={{ flex: '1' }}
            value={setting[item.value as keyof typeof setting]}
          />
        </div>
      ))}
      <p>
        图片上传
        <Tooltip title="上传图片即使用图生图，最多上传5张图片，单张大小不得超过5M">
          <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
        </Tooltip>
      </p>
      <Alert
        message={
          <>
            图片总大小大于5M,会上传失败，请压缩图片可以点击
            <a href="https://tinypng.com/" rel="noopener noreferrer" target="_blank">
              这里
            </a>
            进行压缩
          </>
        }
        showIcon
        style={{ fontSize: '12px', margin: '5px 0' }}
        type="warning"
      ></Alert>
      <Upload
        accept="image/*"
        customRequest={customUpload}
        fileList={fileList}
        listType="picture-card"
        maxCount={5}
        onChange={handleChange}
        onPreview={handlePreview}
      >
        {fileList.length >= 5 ? null : (
          <div>
            <PlusOutlined />
            <div style={{ marginTop: 8 }}>上传图片</div>
          </div>
        )}
      </Upload>
      <Image
        preview={{
          onVisibleChange: (value: any) => {
            setPreviewImage(value);
          },
          scaleStep: 0.5,
          src: previewImage,
          toolbarRender: () => '',
          visible: previewImage,
        }}
        src=""
        style={{ display: 'none' }}
        width={200}
      />
      {fileList.length ? (
        <>
          <p>
            图片权重
            <Tooltip title="图文混合时上传图片占生成图片的相似性程度">
              <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
            </Tooltip>
          </p>
          <div style={{ alignItems: 'center', display: 'flex' }}>
            0
            <Slider
              max={2}
              min={0}
              onChange={(v) => setSettingConfig({ ...setting, iw: v })}
              step={0.01}
              style={{ flex: '1' }}
              value={typeof setting.iw === 'number' ? setting.iw : 0}
            />
            2
          </div>
        </>
      ) : (
        ''
      )}
      <p>
        提示词
        <Tooltip title="图像提示词，您想要生成什么样的图像？">
          <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
        </Tooltip>
      </p>
      <div>
        <TextArea
          maxLength={1000}
          onChange={(v) => setSettingConfig({ ...setting, user_prompt: v.currentTarget.value })}
          placeholder="图像提示词，您想要生成什么样的图像？"
          rows={4}
          style={{ resize: 'block' }}
          value={setting.user_prompt}
        />
      </div>
      <p style={{ marginTop: '10px' }}>
        最终提示词
        <Tooltip title="根据选项和输入的提示词整合，最终发送给Midjourney的指令，建议输入英文，中文在发送给Midjourney前会机翻为英文可能会翻译不够精准">
          <QuestionCircleOutlined style={{ marginLeft: '5px' }} />
        </Tooltip>
      </p>
      <div>
        <TextArea
          maxLength={1500}
          onChange={(v) => setSettingConfig({ ...setting, prompt: v.currentTarget.value })}
          placeholder="根据选项和输入的提示词整合，最终发送给Midjourney的指令"
          rows={4}
          style={{ resize: 'block' }}
          value={setting.prompt}
        />
      </div>

      <GradientButton
        disabled={props.isGenerating || disableChat}
        onClick={generateImage}
        size="middle"
        style={{ marginTop: '20px', width: '100%' }}
      >
        生成图片
      </GradientButton>
    </div>
  );
};

export default ActionPanel;
