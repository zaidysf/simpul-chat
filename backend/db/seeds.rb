# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
general_chatroom = Chatroom.find_or_create_by!(name: "General")

if general_chatroom.messages.none?
  general_chatroom.messages.create!(
    sender_name: "System",
    content: "Welcome to the General chatroom!"
  )
end
