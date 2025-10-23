class Message < ApplicationRecord
  belongs_to :chatroom

  validates :content, presence: true
  validates :sender_name, presence: true
end
