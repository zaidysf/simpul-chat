require "test_helper"

class ChatroomTest < ActiveSupport::TestCase
  test "is valid with valid attributes" do
    chatroom = Chatroom.new(name: "Support")

    assert chatroom.valid?
  end

  test "is invalid without name" do
    chatroom = Chatroom.new

    assert_not chatroom.valid?
    assert_includes chatroom.errors[:name], "can't be blank"
  end

  test "enforces unique name" do
    existing = chatrooms(:general)
    chatroom = Chatroom.new(name: existing.name)

    assert_not chatroom.valid?
    assert_includes chatroom.errors[:name], "has already been taken"
  end

  test "destroys dependent messages" do
    chatroom = chatrooms(:random)

    assert_difference("Message.count", -chatroom.messages.count) do
      chatroom.destroy
    end
  end

  test "messages are ordered oldest first" do
    chatroom = chatrooms(:general)

    timestamps = chatroom.messages.order(:created_at).pluck(:created_at)

    assert_equal timestamps.sort, timestamps
  end

  test "ensure_default! creates general when missing" do
    # Delete messages first to avoid foreign key constraint
    general = Chatroom.find_by(name: Chatroom::DEFAULT_NAME)
    general&.messages&.delete_all
    Chatroom.where(name: Chatroom::DEFAULT_NAME).delete_all

    assert_difference("Chatroom.count", 1) do
      chatroom = Chatroom.ensure_default!
      assert chatroom.default?
    end
  end

  test "ensure_default! returns existing general" do
    general = chatrooms(:general)

    assert_no_difference("Chatroom.count") do
      assert_equal general.id, Chatroom.ensure_default!.id
    end
  end
end
