class ChatroomsChannel < ApplicationCable::Channel
  STREAM = "chatrooms".freeze

  def subscribed
    stream_from STREAM
  end

  def unsubscribed
    # nothing needed; stream_from handles cleanup
  end
end
