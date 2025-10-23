Rails.application.config.to_prepare do
  begin
    Chatroom.ensure_default!
  rescue ActiveRecord::NoDatabaseError, ActiveRecord::StatementInvalid
    # Database may not be ready during assets precompile or initial setup.
  end
end
