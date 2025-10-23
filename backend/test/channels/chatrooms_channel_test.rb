require "test_helper"

class ChatroomsChannelTest < ActionCable::Channel::TestCase
  test "streams from shared channel" do
    subscribe

    assert subscription.confirmed?
    assert_has_stream ChatroomsChannel::STREAM
  end

  test "broadcast reaches subscribers" do
    subscribe

    assert_broadcasts(ChatroomsChannel::STREAM, 0)

    ActionCable.server.broadcast(ChatroomsChannel::STREAM, { event: "chatroom.created" })

    assert_broadcasts(ChatroomsChannel::STREAM, 1)
  end
end
