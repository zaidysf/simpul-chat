class ChatroomChannel < ApplicationCable::Channel
  def subscribed
    chatroom = Chatroom.find_by(id: params[:chatroom_id])
    reject and return unless chatroom

    user_name = params[:user_name].to_s.strip
    reject and return if user_name.blank?

    PresenceTracker.join(
      chatroom_id: chatroom.id,
      user_id: connection.connection_user_id,
      user_name: user_name,
    )

    stream_for chatroom
  rescue PresenceTracker::NameTakenError
    reject
  end

  def unsubscribed
    stop_all_streams
    chatroom_id = params[:chatroom_id]
    PresenceTracker.leave(chatroom_id: chatroom_id, user_id: connection.connection_user_id) if chatroom_id
  end
end
