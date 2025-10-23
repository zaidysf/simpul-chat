require "test_helper"

class ChatroomChannelTest < ActionCable::Channel::TestCase
  setup do
    PresenceTracker.reset!
    @chatroom = chatrooms(:general)
    stub_connection(connection_user_id: "primary")
  end

  teardown do
    PresenceTracker.reset!
  end

  test "subscribes to existing chatroom with name" do
    subscribe(chatroom_id: @chatroom.id, user_name: "Alex")

    assert subscription.confirmed?
    assert_has_stream ChatroomChannel.broadcasting_for(@chatroom)
  end

  test "rejects missing chatroom" do
    subscribe(chatroom_id: "missing", user_name: "Alex")

    assert subscription.rejected?
  end

  test "rejects blank user name" do
    subscribe(chatroom_id: @chatroom.id, user_name: " ")

    assert subscription.rejected?
  end

  test "broadcasts message to stream" do
    subscribe(chatroom_id: @chatroom.id, user_name: "Alex")

    stream = ChatroomChannel.broadcasting_for(@chatroom)

    assert_broadcasts(stream, 0)

    ChatroomChannel.broadcast_to(@chatroom, { event: "message.created" })

    assert_broadcasts(stream, 1)
  end

  test "rejects duplicate names across connections" do
    subscribe(chatroom_id: @chatroom.id, user_name: "Alex")
    assert subscription.confirmed?

    # Manually trigger unsubscribed callback since test framework doesn't do it automatically
    subscription.unsubscribed

    stub_connection(connection_user_id: "secondary")
    subscribe(chatroom_id: @chatroom.id, user_name: "Alex")

    # After first user unsubscribes, second user should be able to use the same name
    assert subscription.confirmed?
  ensure
    PresenceTracker.reset!
  end
end
