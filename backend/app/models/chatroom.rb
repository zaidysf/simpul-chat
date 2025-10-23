class Chatroom < ApplicationRecord
  DEFAULT_NAME = "General".freeze

  has_many :messages, -> { order(created_at: :asc) }, dependent: :destroy

  validates :name, presence: true, uniqueness: { case_sensitive: false }

  scope :default, -> { where("LOWER(name) = ?", DEFAULT_NAME.downcase) }

  before_validation :normalize_name

  def self.ensure_default!
    default.first || create!(name: DEFAULT_NAME)
  rescue ActiveRecord::RecordInvalid
    default.first!
  end

  def default?
    name.casecmp?(DEFAULT_NAME)
  end

  private

  def normalize_name
    self.name = name.strip if name.respond_to?(:strip)
  end
end
