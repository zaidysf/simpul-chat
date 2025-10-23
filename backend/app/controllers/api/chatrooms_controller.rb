module Api
  class ChatroomsController < BaseController
    before_action :set_chatroom, only: %i[show destroy presence]
    before_action :ensure_default_chatroom, only: %i[index]

    def index
      chatrooms = Chatroom.order(:id)
      render json: chatrooms.map { |chatroom| chatroom_payload(chatroom) }
    end

    def show
      render json: chatroom_payload(@chatroom, include_messages: true)
    end

    def create
      chatroom = Chatroom.new(chatroom_params)
      if chatroom.save
        broadcast_chatroom(chatroom, "chatroom.created")
        render json: chatroom_payload(chatroom, include_messages: true), status: :created
      else
        render json: { errors: chatroom.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      if @chatroom.default?
        render json: { errors: ["The default chatroom cannot be deleted."] }, status: :unprocessable_entity
        return
      end

      payload = { id: @chatroom.id, name: @chatroom.name }
      if @chatroom.destroy
        broadcast_event(payload, "chatroom.deleted")
        PresenceTracker.clear_chatroom(payload[:id])
        head :no_content
      else
        render json: { errors: @chatroom.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def presence
      render json: { active_names: PresenceTracker.active_names(chatroom_id: @chatroom.id) }
    end

    def online_users
      render json: { active_names: PresenceTracker.all_active_names }
    end

    private

    def set_chatroom
      @chatroom = Chatroom.find(params[:id])
    end

    def chatroom_params
      params.require(:chatroom).permit(:name)
    end

    def chatroom_payload(chatroom, include_messages: false)
      payload = {
        id: chatroom.id,
        name: chatroom.name
      }

      if include_messages
        payload[:messages] = chatroom.messages.map do |message|
          Api::MessageSerializer.new(message).as_json
        end
      end

      payload
    end

    def broadcast_chatroom(chatroom, event)
      broadcast_event(chatroom_payload(chatroom), event)
    end

    def broadcast_event(data, event)
      ActionCable.server.broadcast(ChatroomsChannel::STREAM, { event:, data: data })
    end

    def ensure_default_chatroom
      Chatroom.ensure_default!
    end
  end
end
