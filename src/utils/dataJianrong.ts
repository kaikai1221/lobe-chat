import { messageService } from '@/services/message';
import { topicService } from '@/services/topic';
import { ChatMessage } from '@/types/message';
import { ChatTopic } from '@/types/topic';

export default async () => {
  if (typeof window !== 'undefined') {
    if (localStorage.getItem('chat-next-web-store')) {
      const oldData = JSON.parse(localStorage.getItem('chat-next-web-store') || '{}');
      const oldMessage = oldData.state.sessions;
      const newMessage: ChatMessage[] = [];
      const newTopic: ChatTopic[] = [];
      oldMessage.forEach((item: any, index: number) => {
        newTopic.push({
          createdAt: item.lastUpdate + index,
          favorite: false,
          id: item.id.slice(0, 8).replace('_', 'a').replace('-', 'b'),
          sessionId: 'inbox',
          title: item.topic,
          updatedAt: item.lastUpdate + index,
        });
        item.messages.forEach((msgItem: any, msgIndex: number) => {
          newMessage.push({
            content: msgItem.content,
            createdAt: new Date(msgItem.date).valueOf() + msgIndex,
            files: [],
            id: msgItem.id.slice(0, 8).replace('_', 'a').replace('-', 'b'),
            meta: {},
            role: msgItem.role,
            sessionId: 'inbox',
            topicId: item.id.slice(0, 8).replace('_', 'a').replace('-', 'b'),
            updatedAt: new Date(msgItem.date).valueOf() + msgIndex,
          });
        });
      });
      topicService.batchCreateTopics(newTopic);
      messageService.batchCreate(newMessage);
    }
  } else {
    return null;
  }
};
