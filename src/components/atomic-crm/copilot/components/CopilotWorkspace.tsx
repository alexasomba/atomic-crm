import {
  CopilotChatView,
  CopilotChatToolCallsView,
  useAttachments,
  useAgent,
  useCopilotKit,
} from "@copilotkit/react-core/v2";
import type { Attachment as CopilotAttachment } from "@copilotkit/react-core/v2";
import type { InputContent } from "@ag-ui/core";
import { Loader2, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Message, MessageContent } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire";
import { Button } from "@/components/ui/button";
import { CopilotHeader } from "./CopilotHeader";
import { ThreadHistory } from "./ThreadHistory";

const DEFAULT_AGENT_ID = "copilot-workspace";

function WorkspaceAssistantMessage({
  message,
  messages,
  isRunning,
}: {
  message: {
    id: string;
    role: string;
    content?: string;
    toolCalls?: unknown[];
  };
  messages: unknown[];
  isRunning: boolean;
  [key: string]: unknown;
}) {
  const hasToolCalls = Boolean(message.toolCalls?.length);
  const textContent = message.content?.trim();
  const isLatest =
    (messages as Array<{ id: string }>)?.at(-1)?.id === message.id;
  const isThinking = isRunning && isLatest && !textContent && !hasToolCalls;

  if (isThinking) {
    return (
      <Message>
        <MessageContent>
          <Marker role="status">
            <MarkerIcon>
              <Loader2 className="animate-spin" />
            </MarkerIcon>
            <MarkerContent>Thinking…</MarkerContent>
          </Marker>
        </MessageContent>
      </Message>
    );
  }
  if (!textContent && !hasToolCalls) return null;

  return (
    <Message>
      <MessageContent>
        {hasToolCalls && (
          <CopilotChatToolCallsView
            message={message as any}
            messages={messages as any}
          />
        )}
        {textContent && (
          <Bubble variant="ghost">
            <BubbleContent>
              <span className="flex items-start gap-2">
                <span aria-hidden="true">🪁</span>
                <span className="whitespace-pre-line">
                  {textContent}
                  {isRunning && isLatest && (
                    <Marker role="status" className="mt-1">
                      <MarkerIcon>
                        <Loader2 className="animate-spin" />
                      </MarkerIcon>
                      <MarkerContent>Streaming response…</MarkerContent>
                    </Marker>
                  )}
                </span>
              </span>
            </BubbleContent>
          </Bubble>
        )}
      </MessageContent>
    </Message>
  );
}

function WorkspaceReasoningMessage({
  message,
}: {
  message: { content?: string };
  [key: string]: unknown;
}) {
  if (!message.content?.trim()) return null;
  return (
    <Collapsible className="mb-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
      <CollapsibleTrigger className="flex w-full items-center justify-between text-left font-medium">
        <span>Reasoning details</span>
        <span aria-hidden="true">+</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="whitespace-pre-wrap pt-2 leading-relaxed">
        {message.content}
      </CollapsibleContent>
    </Collapsible>
  );
}

function WorkspaceUserMessage({
  message,
}: {
  message: { content?: string };
  [key: string]: unknown;
}) {
  if (!message?.content?.trim()) return null;
  return (
    <Message align="end">
      <MessageContent>
        <Bubble align="end" variant="secondary">
          <BubbleContent>{message.content}</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}

function WorkspaceScrollView({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}) {
  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller>
        <MessageScrollerViewport
          className={className}
          aria-label="Copilot conversation"
        >
          <MessageScrollerContent>
            <MessageScrollerItem messageId="copilot-transcript" scrollAnchor>
              {children}
            </MessageScrollerItem>
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

function WorkspaceAttachmentQueue({
  attachments,
  onRemove,
}: {
  attachments: CopilotAttachment[];
  onRemove: (id: string) => void;
}) {
  if (attachments.length === 0) return null;
  return (
    <AttachmentGroup className="shrink-0 px-3">
      {attachments.map((attachment) => (
        <Attachment
          key={attachment.id}
          size="sm"
          state={attachment.status === "uploading" ? "uploading" : "done"}
        >
          <AttachmentMedia>
            <span aria-hidden="true">📎</span>
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>
              {attachment.filename ?? "Attachment"}
            </AttachmentTitle>
            <AttachmentDescription>{attachment.status}</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              aria-label={`Remove ${attachment.filename ?? "attachment"}`}
              onClick={() => onRemove(attachment.id)}
            >
              ×
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ))}
    </AttachmentGroup>
  );
}

function CopilotBrief({ onSubmit }: { onSubmit: (prompt: string) => void }) {
  const [open, setOpen] = useState(false);
  const items = [
    {
      name: "intent",
      prompt: "What should Copilot help with?",
      choices: [
        { value: "Find and prioritize leads" },
        { value: "Prepare a customer follow-up" },
        { value: "Review pipeline risks" },
      ],
    },
    {
      name: "context",
      prompt: "What context matters most?",
      choices: [
        { value: "Contacts and companies" },
        { value: "Deals and tasks" },
        { value: "Notes and activity" },
      ],
    },
  ];
  if (!open)
    return (
      <div className="shrink-0 px-3 py-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Sparkles data-icon="inline-start" />
          Guided brief
        </Button>
      </div>
    );
  return (
    <div className="shrink-0 border-b px-3 py-3">
      <Questionnaire
        items={items}
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const intent = String(form.get("intent") ?? "");
          const context = String(form.get("context") ?? "");
          onSubmit(
            `Help me with this CRM brief. Goal: ${intent}. Relevant context: ${context}. Show the next best actions.`,
          );
          setOpen(false);
        }}
      >
        <div className="flex items-center justify-between">
          <QuestionnaireProgress />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </div>
        {items.map((item) => (
          <QuestionnaireItem key={item.name} name={item.name}>
            <QuestionnaireTitle>{item.prompt}</QuestionnaireTitle>
            <QuestionnaireDescription>
              Choose one answer to continue.
            </QuestionnaireDescription>
            <QuestionnaireChoices>
              {item.choices.map((choice) => (
                <QuestionnaireChoice key={choice.value} value={choice.value}>
                  {choice.value}
                </QuestionnaireChoice>
              ))}
              <QuestionnaireInput placeholder="Add another detail (optional)" />
            </QuestionnaireChoices>
          </QuestionnaireItem>
        ))}
        <QuestionnaireActions>
          <QuestionnairePrevious />
          <QuestionnaireSkip />
          <QuestionnaireNext />
          <QuestionnaireSubmit />
        </QuestionnaireActions>
      </Questionnaire>
    </div>
  );
}

type WorkspaceAgent = ReturnType<typeof useAgent>["agent"];
type WorkspaceActions = {
  agent: WorkspaceAgent;
  runAgent: () => Promise<unknown>;
};

interface CopilotWorkspaceProps {
  className?: string;
  children?: React.ReactNode | ((actions: WorkspaceActions) => React.ReactNode);
  agentId?: string;
  threadId?: string;
  onNewConversation?: () => void;
  onSelectThread?: (id: string) => void;
}

export function CopilotWorkspace({
  className,
  children,
  agentId = DEFAULT_AGENT_ID,
  threadId,
  onNewConversation,
  onSelectThread,
}: CopilotWorkspaceProps) {
  const [view, setView] = useState<"chat" | "history">("chat");
  const [chatKey, setChatKey] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const { agent } = useAgent({
    agentId,
    runtimeAgentId: "default",
    threadId: threadId ?? "default",
  });
  const { copilotkit } = useCopilotKit();
  const {
    attachments,
    fileInputRef,
    handleFileUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeAttachment,
    consumeAttachments,
    dragOver,
    containerRef,
  } = useAttachments({
    config: {
      enabled: true,
      accept: "image/*,application/pdf,text/plain",
      maxSize: 10 * 1024 * 1024,
    },
  });
  const runAgent = useCallback(
    () => copilotkit.runAgent({ agent }),
    [agent, copilotkit],
  );
  const submitBrief = useCallback(
    async (prompt: string) => {
      agent.addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: prompt,
      });
      await copilotkit.runAgent({ agent });
    },
    [agent, copilotkit],
  );
  const submitMessage = useCallback(
    async (text: string) => {
      const readyAttachments = consumeAttachments();
      const content: string | InputContent[] = readyAttachments.length
        ? [
            { type: "text", text },
            ...readyAttachments.map(
              (attachment) =>
                ({
                  type: attachment.type,
                  source: attachment.source,
                  metadata: {
                    ...(attachment.filename
                      ? { filename: attachment.filename }
                      : {}),
                    ...attachment.metadata,
                  },
                }) as InputContent,
            ),
          ]
        : text;
      agent.addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content,
      });
      setInputValue("");
      await copilotkit.runAgent({ agent });
    },
    [agent, consumeAttachments, copilotkit],
  );
  const handleToggleView = useCallback(
    () =>
      setView((previous) => {
        if (previous === "chat") return "history";
        setChatKey((key) => key + 1);
        return "chat";
      }),
    [],
  );
  const handleNewConversation = useCallback(() => {
    onNewConversation?.();
    setChatKey((key) => key + 1);
    setView("chat");
  }, [onNewConversation]);
  const handleSelectThread = useCallback(
    (id: string) => {
      onSelectThread?.(id);
      setChatKey((key) => key + 1);
      setView("chat");
    },
    [onSelectThread],
  );

  return (
    <div
      className={`copilot-workspace-chat h-full flex flex-col [&_[data-testid=copilot-welcome-screen]]:px-0 ${className ?? ""}`}
    >
      <CopilotHeader
        view={view}
        onToggleView={handleToggleView}
        onNewConversation={handleNewConversation}
      />
      {view === "history" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ThreadHistory
            agentId={agentId}
            activeThreadId={threadId}
            onSelectThread={handleSelectThread}
          />
        </div>
      ) : (
        <>
          {typeof children === "function"
            ? children({ agent, runAgent })
            : children}
          <CopilotBrief onSubmit={submitBrief} />
          <div ref={containerRef} className="copilot-chat-area min-h-0 flex-1">
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept="image/*,application/pdf,text/plain"
              onChange={handleFileUpload}
            />
            <WorkspaceAttachmentQueue
              attachments={attachments}
              onRemove={removeAttachment}
            />
            <CopilotChatView
              key={chatKey}
              className="copilot-chat-inline"
              messages={[...agent.messages]}
              isRunning={agent.isRunning}
              inputValue={inputValue}
              onInputChange={setInputValue}
              onSubmitMessage={submitMessage}
              onStop={() => copilotkit.stopAgent({ agent })}
              onAddFile={() => fileInputRef.current?.click()}
              dragOver={dragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              hasExplicitThreadId={Boolean(threadId)}
              messageView={{
                assistantMessage: WorkspaceAssistantMessage as any,
                userMessage: WorkspaceUserMessage as any,
                reasoningMessage: WorkspaceReasoningMessage as any,
              }}
              scrollView={WorkspaceScrollView as any}
            >
              {({ messageView, input }) => (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="min-h-0 flex-1">{messageView}</div>
                  {input}
                </div>
              )}
            </CopilotChatView>
          </div>
        </>
      )}
    </div>
  );
}
