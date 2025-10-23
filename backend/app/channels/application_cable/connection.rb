module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :connection_user_id

    def connect
      self.connection_user_id = SecureRandom.uuid
    end
  end
end
