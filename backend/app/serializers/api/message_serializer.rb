module Api
  class MessageSerializer
    def initialize(message)
      @message = message
    end

    def as_json(_options = {})
      {
        id: @message.id,
        chatroom_id: @message.chatroom_id,
        content: @message.content,
        sender_name: @message.sender_name,
        created_at: @message.created_at.iso8601
      }
    end
  end
end
