import { memo, useEffect } from 'react';

const PageTitle = memo<{ title: string }>(({ title }) => {
  useEffect(() => {
    document.title = title ? `${title} · AI聊天室` : 'AI聊天室';
  }, [title]);

  return null;
});

export default PageTitle;
