module Api
  class MessagesController < BaseController

    before_action :set_chatroom

    def index
      render json: @chatroom.messages.map { |message| Api::MessageSerializer.new(message).as_json }
    end

    def create
      message = @chatroom.messages.build(message_params)
      if message.save
        payload = Api::MessageSerializer.new(message).as_json
        ChatroomChannel.broadcast_to(@chatroom, { event: "message.created", data: payload })
        render json: payload, status: :created
      else
        render json: { errors: message.errors.full_messages }, status: :unprocessable_entity
      end
    end

    private

    def set_chatroom
      @chatroom = Chatroom.find(params[:chatroom_id])
    end

    def message_params
      params.require(:message).permit(:content, :sender_name)
    end
  end
end
