require "test_helper"

class Api::MessagesControllerTest < ActionDispatch::IntegrationTest
  include ActionCable::TestHelper

  setup do
    @chatroom = chatrooms(:general)
  end

  test "lists messages for chatroom" do
    get api_chatroom_messages_url(@chatroom), as: :json

    assert_response :success
    body = response.parsed_body
    assert_equal @chatroom.messages.count, body.length
  end

  test "creates message" do
    stream = ChatroomChannel.broadcasting_for(@chatroom)

    assert_broadcasts(stream, 0)

    assert_difference("Message.count") do
      assert_broadcasts(stream, 1) do
        post api_chatroom_messages_url(@chatroom),
             params: { message: { content: "New message", sender_name: "Jordan" } },
             as: :json
      end
    end

    assert_response :created
    body = response.parsed_body
    assert_equal "New message", body["content"]
    assert_equal "Jordan", body["sender_name"]
  end

  test "rejects invalid message" do
    assert_no_difference("Message.count") do
      post api_chatroom_messages_url(@chatroom),
           params: { message: { content: "", sender_name: "Jordan" } },
           as: :json
    end

    assert_response :unprocessable_entity
    body = response.parsed_body
    assert_includes body["errors"], "Content can't be blank"
  end

  test "returns 404 for missing chatroom" do
    post api_chatroom_messages_url(chatroom_id: "missing"),
         params: { message: { content: "Hi", sender_name: "Alex" } },
         as: :json

    assert_response :not_found
  end

  test "requires message payload" do
    assert_no_difference("Message.count") do
      post api_chatroom_messages_url(@chatroom), params: {}, as: :json
    end

    assert_response :unprocessable_entity
    body = response.parsed_body
    assert_includes body["errors"], "param is missing or the value is empty or invalid: message"
  end

  test "returns iso8601 timestamps" do
    post api_chatroom_messages_url(@chatroom),
         params: { message: { content: "Timestamp test", sender_name: "Jordan" } },
         as: :json

    assert_response :created
    body = response.parsed_body
    assert_match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, body["created_at"])
  end
end
