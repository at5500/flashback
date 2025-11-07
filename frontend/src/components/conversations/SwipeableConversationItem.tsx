import { memo } from 'react';
import {
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import type { Conversation } from '@/types';
import { ConversationItem } from './ConversationItem';
import { useTranslation } from '@/lib/i18n';

interface SwipeableConversationItemProps {
  conversation: Conversation;
  isActive?: boolean;
  onClick?: () => void;
  onAssign?: (conversationId: string) => void;
  onClose?: (conversationId: string) => void;
  onDelete?: (conversationId: string) => void;
}

function SwipeableConversationItemComponent({
  conversation,
  isActive,
  onClick,
  onAssign,
  onClose,
  onDelete,
}: SwipeableConversationItemProps) {
  const { t } = useTranslation();

  // Trailing actions (swipe from right to left)
  const trailingActions = () => (
    <TrailingActions>
      {conversation.status !== 'closed' && onAssign && (
        <SwipeAction onClick={() => onAssign(conversation.id)}>
          <div className="flex flex-col items-center justify-center gap-1 bg-blue-500 text-white px-6 h-full">
            <span className="text-2xl">👤</span>
            <span className="text-xs font-medium">{t.conversations_actions.assign_short}</span>
          </div>
        </SwipeAction>
      )}
      {conversation.status !== 'closed' && onClose && (
        <SwipeAction onClick={() => onClose(conversation.id)}>
          <div className="flex flex-col items-center justify-center gap-1 bg-yellow-500 text-white px-6 h-full">
            <span className="text-2xl">✕</span>
            <span className="text-xs font-medium">{t.conversations_actions.close}</span>
          </div>
        </SwipeAction>
      )}
      {onDelete && (
        <SwipeAction destructive={true} onClick={() => onDelete(conversation.id)}>
          <div className="flex flex-col items-center justify-center gap-1 bg-red-500 text-white px-6 h-full">
            <span className="text-2xl">🗑</span>
            <span className="text-xs font-medium">{t.conversations_actions.delete}</span>
          </div>
        </SwipeAction>
      )}
    </TrailingActions>
  );

  return (
    <SwipeableList threshold={0.25}>
      <SwipeableListItem trailingActions={trailingActions()}>
        <ConversationItem
          conversation={conversation}
          isActive={isActive}
          onClick={onClick}
        />
      </SwipeableListItem>
    </SwipeableList>
  );
}

export const SwipeableConversationItem = memo(SwipeableConversationItemComponent);
