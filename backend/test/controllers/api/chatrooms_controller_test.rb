require "test_helper"

class Api::ChatroomsControllerTest < ActionDispatch::IntegrationTest
  include ActionCable::TestHelper

  setup do
    PresenceTracker.reset!
    @chatroom = chatrooms(:general)
  end

  teardown do
    PresenceTracker.reset!
  end

  test "returns list of chatrooms" do
    get api_chatrooms_url, as: :json

    assert_response :success
    body = response.parsed_body
    assert_kind_of Array, body
    names = body.map { |chatroom| chatroom["name"] }
    assert_includes names, @chatroom.name
  end

  test "shows chatroom with messages" do
    get api_chatroom_url(@chatroom), as: :json

    assert_response :success
    body = response.parsed_body
    assert_equal @chatroom.name, body["name"]
    assert_equal @chatroom.messages.count, body["messages"].length
  end

  test "creates chatroom" do
    assert_difference("Chatroom.count") do
      post api_chatrooms_url, params: { chatroom: { name: "Support" } }, as: :json
    end

    assert_response :created
    body = response.parsed_body
    assert_equal "Support", body["name"]

    # Verify broadcast was sent
    assert_broadcasts(ChatroomsChannel::STREAM, 1)
  end

  test "rejects invalid chatroom" do
    assert_no_difference("Chatroom.count") do
      post api_chatrooms_url, params: { chatroom: { name: "" } }, as: :json
    end

    assert_response :unprocessable_entity
    body = response.parsed_body
    assert_includes body["errors"], "Name can't be blank"
  end

  test "returns 404 for missing chatroom" do
    get api_chatroom_url(id: "missing"), as: :json

    assert_response :not_found
  end

  test "deletes chatroom" do
    chatroom = Chatroom.create!(name: "Temp")
    PresenceTracker.join(chatroom_id: chatroom.id, user_id: "u1", user_name: "Alex")

    assert_broadcast_on(ChatroomsChannel::STREAM, event: "chatroom.deleted", data: { id: chatroom.id, name: chatroom.name }) do
      assert_difference("Chatroom.count", -1) do
        delete api_chatroom_url(chatroom), as: :json
      end
    end

    assert_response :no_content
    assert_empty PresenceTracker.active_names(chatroom_id: chatroom.id)
  end

  test "prevent deleting missing chatroom" do
    assert_no_difference("Chatroom.count") do
      delete api_chatroom_url(id: "missing"), as: :json
    end

    assert_response :not_found
  end

  test "cannot delete default chatroom" do
    general = chatrooms(:general)

    assert_no_difference("Chatroom.count") do
      delete api_chatroom_url(general), as: :json
    end

    assert_response :unprocessable_entity
  end

  test "index ensures default chatroom exists" do
    # Delete messages first to avoid foreign key constraint
    general = Chatroom.find_by(name: Chatroom::DEFAULT_NAME)
    general&.messages&.delete_all
    Chatroom.where(name: Chatroom::DEFAULT_NAME).delete_all

    get api_chatrooms_url, as: :json

    assert_response :success
    body = response.parsed_body
    assert_includes body.map { |chatroom| chatroom["name"] }, Chatroom::DEFAULT_NAME
  end

  test "presence returns active names" do
    PresenceTracker.reset!
    PresenceTracker.join(chatroom_id: @chatroom.id, user_id: "u1", user_name: "Alex")

    get presence_api_chatroom_url(@chatroom), as: :json

    assert_response :success
    body = response.parsed_body
    assert_includes body["active_names"], "Alex"
  ensure
    PresenceTracker.reset!
  end

  test "online users aggregates across rooms" do
    PresenceTracker.reset!
    PresenceTracker.join(chatroom_id: @chatroom.id, user_id: "u1", user_name: "Alex")
    PresenceTracker.join(chatroom_id: chatrooms(:random).id, user_id: "u2", user_name: "Taylor")

    get "/api/chatrooms/online_users", as: :json

    assert_response :success
    body = response.parsed_body
    assert_equal %w[Alex Taylor].sort, body["active_names"].sort
  ensure
    PresenceTracker.reset!
  end
end
