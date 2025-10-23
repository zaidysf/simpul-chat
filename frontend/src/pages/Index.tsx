import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ChatHeader } from "@/components/ChatHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  fetchChatrooms,
  fetchMessages,
  createMessage,
  deserializeMessage,
  createChatroom,
  deleteChatroom,
  fetchOnlineUsers,
} from "@/lib/api";
import { consumer } from "@/lib/cable";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_AUTHOR } from "@/lib/branding";
import { cn } from "@/lib/utils";
import type {
  ChatMessage as ChatMessageDto,
  Chatroom,
  RealtimeMessageEvent,
  ChatroomEvent,
} from "@/types/chat";

const USER_STORAGE_KEY = "simpul-chat:user-name";

const getStoredUser = (): { name: string } | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const storedName = window.localStorage.getItem(USER_STORAGE_KEY);
  return storedName ? { name: storedName } : null;
};

const Index = () => {
  const storedUserRef = useRef<{ name: string } | null | undefined>(undefined);
  if (storedUserRef.current === undefined) {
    storedUserRef.current = getStoredUser();
  }
  const initialUser = storedUserRef.current ?? null;

  const [currentUser, setCurrentUser] = useState<{ name: string } | null>(
    initialUser,
  );
  const [nameInput, setNameInput] = useState(initialUser?.name ?? "");
  const [isDialogOpen, setIsDialogOpen] = useState(!initialUser);
  const [nameError, setNameError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [selectedChatroomId, setSelectedChatroomId] = useState<number | null>(
    null,
  );
  const [isCreateChatroomDialogOpen, setIsCreateChatroomDialogOpen] =
    useState(false);
  const [chatroomNameInput, setChatroomNameInput] = useState("");
  const [chatroomNameError, setChatroomNameError] = useState("");
  const [chatroomPendingDeletion, setChatroomPendingDeletion] =
    useState<Chatroom | null>(null);
  const [pendingDeletionId, setPendingDeletionId] = useState<number | null>(
    null,
  );
  const [deletedChatroomNotice, setDeletedChatroomNotice] = useState<
    { id: number; name: string } | null
  >(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedChatroomIdRef = useRef<number | null>(selectedChatroomId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: chatrooms = [],
    isLoading: isLoadingChatrooms,
    isError: isChatroomsError,
    error: chatroomsError,
  } = useQuery<Chatroom[]>({
    queryKey: ["chatrooms"],
    queryFn: fetchChatrooms,
  });

  const messagesQueryKey = useMemo(
    () => ["messages", selectedChatroomId] as const,
    [selectedChatroomId],
  );

  const {
    data: messages = [],
    isLoading: isLoadingMessages,
  } = useQuery<ChatMessageDto[]>({
    queryKey: messagesQueryKey,
    queryFn: () => fetchMessages(selectedChatroomId as number),
    enabled: selectedChatroomId !== null,
  });

  const createMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (selectedChatroomId === null) {
        throw new Error("Chatroom is not available yet.");
      }
      if (!currentUser) {
        throw new Error("Please join the chat before sending messages.");
      }

      return createMessage(selectedChatroomId, {
        content,
        senderName: currentUser.name,
      });
    },
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessageDto[]>(messagesQueryKey, (existing) => {
        const previous = existing ?? [];
        if (previous.some((item) => item.id === message.id)) {
          return previous;
        }
        return [...previous, message];
      });
    },
  });

  const createChatroomMutation = useMutation({
    mutationFn: async (name: string) => createChatroom(name),
    onSuccess: (chatroom) => {
      queryClient.setQueryData<Chatroom[]>(["chatrooms"], (existing = []) => {
        if (existing.some((room) => room.id === chatroom.id)) {
          return existing;
        }
        return [...existing, chatroom].sort((a, b) => a.id - b.id);
      });

      setIsCreateChatroomDialogOpen(false);
      setChatroomNameInput("");
      setChatroomNameError("");
      setSelectedChatroomId((current) => current ?? chatroom.id);

      toast({
        title: "Chatroom created",
        description: `"${chatroom.name}" is ready to use.`,
      });
    },
    onError: (error) => {
      const description =
        error instanceof Error ? error.message : "Please try again.";
      setChatroomNameError(description);
      toast({
        variant: "destructive",
        title: "Unable to create chatroom",
        description,
      });
    },
  });

  const deleteChatroomMutation = useMutation({
    mutationFn: async (chatroomId: number) => {
      setPendingDeletionId(chatroomId);
      await deleteChatroom(chatroomId);
      return chatroomId;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Chatroom[]>(["chatrooms"], (existing = []) =>
        existing.filter((room) => room.id !== deletedId),
      );

      setSelectedChatroomId((current) =>
        current === deletedId ? null : current,
      );

      queryClient.removeQueries({ queryKey: ["messages", deletedId] });

      toast({
        title: "Chatroom deleted",
        description: "The chatroom and its messages have been removed.",
      });
    },
    onError: (error) => {
      const description =
        error instanceof Error ? error.message : "Please try again.";
      toast({
        variant: "destructive",
        title: "Unable to delete chatroom",
        description,
      });
    },
    onSettled: () => {
      setPendingDeletionId(null);
      setChatroomPendingDeletion(null);
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (currentUser) {
      window.localStorage.setItem(USER_STORAGE_KEY, currentUser.name);
    } else {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    selectedChatroomIdRef.current = selectedChatroomId;
  }, [selectedChatroomId]);

  useEffect(() => {
    const subscription = consumer.subscriptions.create(
      { channel: "ChatroomsChannel" },
      {
        received: (payload: ChatroomEvent) => {
          switch (payload.event) {
            case "chatroom.created": {
              const chatroom = payload.data;
              queryClient.setQueryData<Chatroom[]>(["chatrooms"], (existing = []) => {
                if (existing.some((room) => room.id === chatroom.id)) {
                  return existing;
                }
                return [...existing, chatroom].sort((a, b) => a.id - b.id);
              });

              setSelectedChatroomId((current) => current ?? chatroom.id);
              break;
            }
            case "chatroom.deleted": {
              queryClient.setQueryData<Chatroom[]>(["chatrooms"], (existing = []) =>
                existing.filter((room) => room.id !== payload.data.id),
              );

              queryClient.removeQueries({ queryKey: ["messages", payload.data.id] });

              const currentSelected = selectedChatroomIdRef.current;
              if (currentSelected === payload.data.id && currentUser) {
                const updatedChatrooms =
                  queryClient.getQueryData<Chatroom[]>(["chatrooms"]) ?? [];
                const fallback =
                  updatedChatrooms.find((room) => room.name.toLowerCase() === "general") ??
                  updatedChatrooms[0] ?? null;

                setDeletedChatroomNotice({ id: payload.data.id, name: payload.data.name });
                setSelectedChatroomId(fallback?.id ?? null);
              }
              break;
            }
            default:
              break;
          }
        },
      },
    );

    return () => {
      consumer.subscriptions.remove(subscription);
    };
  }, [currentUser, queryClient]);

  useEffect(() => {
    if (chatrooms.length > 0 && selectedChatroomId === null) {
      setSelectedChatroomId(chatrooms[0].id);
    }
  }, [chatrooms, selectedChatroomId]);

  const selectedChatroom = useMemo(() => {
    return chatrooms.find((chatroom) => chatroom.id === selectedChatroomId) ?? null;
  }, [chatrooms, selectedChatroomId]);

  const generalChatroom = useMemo(
    () => chatrooms.find((chatroom) => chatroom.name.toLowerCase() === "general"),
    [chatrooms],
  );

  useEffect(() => {
    if (chatrooms.length === 0) {
      if (selectedChatroomId !== null) {
        setSelectedChatroomId(null);
      }
      return;
    }

    const fallbackId = generalChatroom?.id ?? chatrooms[0].id;

    if (!selectedChatroomId || !chatrooms.some((room) => room.id === selectedChatroomId)) {
      setSelectedChatroomId(fallbackId);
    }
  }, [chatrooms, generalChatroom?.id, selectedChatroomId]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.title = selectedChatroom
      ? `${BRAND_NAME} · ${selectedChatroom.name}`
      : BRAND_NAME;
  }, [selectedChatroom]);

  useEffect(() => {
    if (selectedChatroomId === null || !currentUser) {
      return;
    }

    const subscription = consumer.subscriptions.create(
      {
        channel: "ChatroomChannel",
        chatroom_id: selectedChatroomId,
        user_name: currentUser.name,
      },
      {
        received: (payload: RealtimeMessageEvent) => {
          if (payload.event !== "message.created") {
            return;
          }

          const message = deserializeMessage(payload.data);
          queryClient.setQueryData<ChatMessageDto[]>(
            ["messages", selectedChatroomId],
            (existing) => {
              const previous = existing ?? [];
              if (previous.some((item) => item.id === message.id)) {
                return previous;
              }
              return [...previous, message];
            },
          );
        },
        rejected: () => {
          setCurrentUser(null);
          setIsDialogOpen(true);
          setNameError("This name is already in use. Please choose another name.");
          setIsJoining(false);
          toast({
            variant: "destructive",
            title: "Unable to join chatroom",
            description: "That name is currently in use.",
          });
        },
      },
    );

    return () => {
      consumer.subscriptions.remove(subscription);
    };
  }, [currentUser, queryClient, selectedChatroomId, toast]);

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) {
      return;
    }

    const scrollElement = scrollRef.current.querySelector(
      "[data-radix-scroll-area-viewport]",
    );

    if (scrollElement instanceof HTMLElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, []);

  const displayMessages = useMemo(() => {
    return messages.map((message) => ({
      ...message,
      isCurrentUser:
        currentUser !== null &&
        message.senderName.toLowerCase() === currentUser.name.toLowerCase(),
    }));
  }, [messages, currentUser]);

  useEffect(() => {
    if (displayMessages.length === 0) {
      return;
    }
    scrollToBottom();
  }, [displayMessages, scrollToBottom]);

  const handleJoinChat = async () => {
    const trimmedName = nameInput.trim();

    if (!trimmedName) {
      setNameError("Name cannot be empty");
      return;
    }

    if (trimmedName.length < 2) {
      setNameError("Please use at least 2 characters.");
      return;
    }

    setIsJoining(true);

    const targetChatroom =
      selectedChatroom ?? generalChatroom ?? chatrooms[0] ?? null;

    if (!targetChatroom) {
      setNameError("No chatrooms available yet.");
      setIsJoining(false);
      return;
    }

    try {
      const onlineUsers = await fetchOnlineUsers();
      const nameTaken = onlineUsers.some(
        (name) => name.toLowerCase() === trimmedName.toLowerCase(),
      );

      if (nameTaken) {
        setNameError("This name is already in use. Please choose another name.");
        setIsJoining(false);
        return;
      }

      setCurrentUser({ name: trimmedName });
      setNameInput(trimmedName);
      setNameError("");
      setIsDialogOpen(false);
    } catch (error) {
      setIsJoining(false);
      toast({
        variant: "destructive",
        title: "Unable to verify name",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
      return;
    }

    setIsJoining(false);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open && !currentUser) {
      return;
    }

    setIsDialogOpen(open);
  };

  const handleCreateChatroom = async () => {
    const trimmedName = chatroomNameInput.trim();

    if (!trimmedName) {
      setChatroomNameError("Name cannot be empty");
      return;
    }

    if (trimmedName.length < 2) {
      setChatroomNameError("Please use at least 2 characters.");
      return;
    }

    try {
      await createChatroomMutation.mutateAsync(trimmedName);
    } catch (error) {
      if (error instanceof Error) {
        setChatroomNameError(error.message);
      }
    }
  };

  const handleDeleteChatroom = (chatroom: Chatroom) => {
    if (deleteChatroomMutation.isPending || pendingDeletionId === chatroom.id) {
      return;
    }

    setChatroomPendingDeletion(chatroom);
  };

  const handleReturnToGeneral = useCallback(() => {
    const currentChatrooms = queryClient.getQueryData<Chatroom[]>(["chatrooms"]) ?? [];
    const general = currentChatrooms.find((room) => room.name.toLowerCase() === "general");
    const fallback = general ?? currentChatrooms[0] ?? null;

    if (fallback) {
      setSelectedChatroomId(fallback.id);
    } else {
      setSelectedChatroomId(null);
    }

    setDeletedChatroomNotice(null);
  }, [queryClient]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!currentUser) {
        setIsDialogOpen(true);
        toast({
          variant: "destructive",
          title: "Join the chat",
          description: "Please enter your name before sending messages.",
        });
        throw new Error("User has not joined the chat");
      }

      if (selectedChatroomId === null) {
        toast({
          variant: "destructive",
          title: "Chatroom not ready",
          description: "Please wait for the chatroom to finish loading.",
        });
        throw new Error("Chatroom not ready");
      }

      try {
        await createMessageMutation.mutateAsync(text);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Unable to send message",
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
        throw error;
      }
    },
    [createMessageMutation, currentUser, selectedChatroomId, toast],
  );

  return (
    <>
      <Dialog
        open={isCreateChatroomDialogOpen}
        onOpenChange={(open) => {
          setIsCreateChatroomDialogOpen(open);
          if (!open) {
            setChatroomNameInput("");
            setChatroomNameError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Chatroom</DialogTitle>
            <DialogDescription>
              Name your new space for conversations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="chatroom-name">Chatroom Name</Label>
              <Input
                id="chatroom-name"
                placeholder="E.g. Product Squad"
                value={chatroomNameInput}
                onChange={(event) => {
                  setChatroomNameInput(event.target.value);
                  setChatroomNameError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleCreateChatroom();
                  }
                }}
                autoFocus
                className={chatroomNameError ? "border-destructive" : ""}
              />
              {chatroomNameError && (
                <p className="text-sm text-destructive">{chatroomNameError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateChatroomDialogOpen(false)}
                disabled={createChatroomMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateChatroom}
                disabled={
                  createChatroomMutation.isPending ||
                  chatroomNameInput.trim().length === 0
                }
              >
                {createChatroomMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={chatroomPendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) {
            setChatroomPendingDeletion(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Chatroom</DialogTitle>
            <DialogDescription>
              This will remove the chatroom and all of its messages for everyone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete
              {" "}
              <span className="font-semibold text-foreground">
                {chatroomPendingDeletion?.name}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setChatroomPendingDeletion(null)}
                disabled={deleteChatroomMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (chatroomPendingDeletion) {
                    deleteChatroomMutation.mutate(chatroomPendingDeletion.id);
                  }
                }}
                disabled={deleteChatroomMutation.isPending}
              >
                {deleteChatroomMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deletedChatroomNotice !== null} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chatroom deleted</DialogTitle>
            <DialogDescription>
              This chatroom was removed. You will be redirected to General.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              "{deletedChatroomNotice?.name}" is no longer available.
            </p>
            <Button type="button" onClick={handleReturnToGeneral} className="w-full">
              Go to General Room
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join Chatroom</DialogTitle>
            <DialogDescription>
              Please enter your name to start chatting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  setNameError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleJoinChat();
                  }
                }}
                autoFocus
                className={nameError ? "border-destructive" : ""}
              />
              {nameError && (
                <p className="text-sm text-destructive">{nameError}</p>
              )}
            </div>
            <Button
              onClick={() => void handleJoinChat()}
              className="w-full"
              disabled={!nameInput.trim() || isJoining}
            >
              {isJoining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join Chat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-6xl h-[90vh] bg-card rounded-3xl shadow-[var(--shadow-card)] border border-border flex flex-col md:flex-row overflow-hidden animate-slide-up">
          <aside className="w-full md:w-72 md:border-r border-border flex flex-col bg-card">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Chatrooms</p>
                <p className="text-xs text-muted-foreground">
                  {chatrooms.length} active
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsCreateChatroomDialogOpen(true)}
                aria-label="Create chatroom"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-1 p-2">
                {chatrooms.length === 0 ? (
                  <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                    No chatrooms yet. Create one to start chatting.
                  </p>
                ) : (
                  chatrooms.map((chatroom) => {
                    const isActive = selectedChatroomId === chatroom.id;
                    const isDefault = chatroom.name.toLowerCase() === "general";
                    return (
                      <div
                        key={chatroom.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedChatroomId(chatroom.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedChatroomId(chatroom.id);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isActive && "border-primary/40 bg-primary/10",
                        )}
                      >
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate font-medium text-foreground">
                            {chatroom.name}
                          </p>
                          {isActive && (
                            <p className="text-xs text-muted-foreground">
                              Active chatroom
                            </p>
                          )}
                        </div>
                        {!isDefault && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteChatroom(chatroom);
                            }}
                            disabled={
                              pendingDeletionId === chatroom.id ||
                              deleteChatroomMutation.isPending
                            }
                            aria-label={`Delete chatroom ${chatroom.name}`}
                          >
                            {pendingDeletionId === chatroom.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </aside>

          <div className="flex-1 flex flex-col">
            <div className="border-b border-border px-6 pt-6 pb-4">
              <ChatHeader
                title={selectedChatroom?.name ?? BRAND_NAME}
                subtitle={
                  isLoadingChatrooms
                    ? "Loading chatrooms..."
                    : selectedChatroom
                      ? BRAND_TAGLINE
                      : "Select or create a chatroom to begin."
                }
              />
              {isChatroomsError && (
                <p className="mt-2 text-sm text-destructive">
                  {chatroomsError instanceof Error
                    ? chatroomsError.message
                    : "Unable to load chatrooms."}
                </p>
              )}
            </div>

            <ScrollArea ref={scrollRef} className="flex-1 px-6 pt-4">
              <div className="space-y-6 pb-6">
                {!selectedChatroom ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    {chatrooms.length === 0
                      ? "No chatrooms yet. Create one to start chatting."
                      : "Select a chatroom from the list to begin chatting."}
                  </p>
                ) : isLoadingMessages ? (
                  <div className="flex h-full items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading messages...
                  </div>
                ) : displayMessages.length > 0 ? (
                  displayMessages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No messages yet. Start the conversation!
                  </p>
                )}
              </div>
            </ScrollArea>

            <div className="border-t border-border bg-card/50 p-6 backdrop-blur-sm">
              {selectedChatroom ? (
                <ChatInput onSendMessage={handleSendMessage} />
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Create or select a chatroom to start typing.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 border-t border-border bg-card px-6 py-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
              <span>
                Built for <span className="font-medium text-foreground">Simpul Technologies</span>
              </span>
              <span>
                Crafted by{" "}
                <a
                  href={BRAND_AUTHOR.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  {BRAND_AUTHOR.name}
                </a>
                {" "}
                (<a
                  href={BRAND_AUTHOR.github}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  GitHub
                </a>)
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Index;
