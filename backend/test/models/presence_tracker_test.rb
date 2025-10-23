require "test_helper"

class PresenceTrackerTest < ActiveSupport::TestCase
  setup do
    PresenceTracker.reset!
  end

  teardown do
    PresenceTracker.reset!
  end

  test "tracks unique names per chatroom" do
    PresenceTracker.join(chatroom_id: 1, user_id: "a", user_name: "Alex")
    PresenceTracker.join(chatroom_id: 1, user_id: "b", user_name: "Jordan")

    assert_equal %w[Alex Jordan].sort, PresenceTracker.active_names(chatroom_id: 1).sort
  end

  test "name_taken ignores same user" do
    PresenceTracker.join(chatroom_id: 1, user_id: "a", user_name: "Alex")

    assert_not PresenceTracker.name_taken?("Alex", except_user_id: "a")
  end

  test "name_taken detects duplicates across rooms" do
    PresenceTracker.join(chatroom_id: 1, user_id: "a", user_name: "Alex")

    assert PresenceTracker.name_taken?("alex")
  end

  test "clear_chatroom removes entries" do
    PresenceTracker.join(chatroom_id: 1, user_id: "a", user_name: "Alex")

    PresenceTracker.clear_chatroom(1)

    assert_empty PresenceTracker.active_names(chatroom_id: 1)
  end
end
