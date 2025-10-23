require "json"

class PresenceTracker
  EXPIRY = 30.seconds
  PREFIX = "presence:chatrooms".freeze

  class NameTakenError < StandardError; end

  class << self
    def join(chatroom_id:, user_id:, user_name:)
      name = user_name.to_s.strip
      return if name.blank?

      if name_taken?(name, except_user_id: user_id)
        raise NameTakenError, "Name #{name.inspect} is already present"
      end

      key = redis_key(chatroom_id)
      redis.hset(key, user_id, { name: name, last_seen_at: Time.current.to_i }.to_json)
      redis.expire(key, (EXPIRY * 2).to_i)
    end

    def leave(chatroom_id:, user_id:)
      redis.hdel(redis_key(chatroom_id), user_id)
    end

    def active_names(chatroom_id:)
      active_entries(chatroom_id: chatroom_id).map { |entry| entry[:name] }
    end

    def all_active_names
      active_entries.map { |entry| entry[:name] }.uniq
    end

    def name_taken?(name, except_user_id: nil)
      downcased = name.to_s.downcase
      active_entries.any? do |entry|
        next if entry[:user_id] == except_user_id

        entry[:name].to_s.downcase == downcased
      end
    end

    def clear_chatroom(chatroom_id)
      redis.del(redis_key(chatroom_id))
    end

    def reset!
      redis.scan_each(match: "#{PREFIX}:*").each { |key| redis.del(key) }
    end

    private

    def active_entries(chatroom_id: nil)
      keys = chatroom_id ? [redis_key(chatroom_id)] : redis.scan_each(match: "#{PREFIX}:*").to_a
      now = Time.current

      keys.flat_map do |key|
        redis.hgetall(key).filter_map do |user_id, payload|
          data = parse_payload(payload)
          next unless data
          next if expired?(data, now)

          { user_id:, name: data["name"], chatroom_key: key }
        end
      end
    end

    def parse_payload(payload)
      JSON.parse(payload)
    rescue JSON::ParserError
      nil
    end

    def expired?(data, now)
      Time.at(data["last_seen_at"].to_i) < (now - EXPIRY)
    end

    def redis
      @redis ||= Redis.new(url: Rails.configuration.redis_presence_url)
    end

    def redis_key(chatroom_id)
      "#{PREFIX}:#{chatroom_id}"
    end
  end
end
