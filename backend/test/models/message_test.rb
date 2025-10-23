require "test_helper"

class MessageTest < ActiveSupport::TestCase
  test "is valid with required attributes" do
    message = Message.new(
      chatroom: chatrooms(:general),
      content: "Hello",
      sender_name: "Alex"
    )

    assert message.valid?
  end

  test "requires content" do
    message = Message.new(chatroom: chatrooms(:general), sender_name: "Alex")

    assert_not message.valid?
    assert_includes message.errors[:content], "can't be blank"
  end

  test "requires sender name" do
    message = Message.new(chatroom: chatrooms(:general), content: "Hello")

    assert_not message.valid?
    assert_includes message.errors[:sender_name], "can't be blank"
  end

  test "belongs to a chatroom" do
    message = Message.new(content: "Hello", sender_name: "Alex")

    assert_not message.valid?
    assert_includes message.errors[:chatroom], "must exist"
  end
end
