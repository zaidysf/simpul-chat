class CreateChatrooms < ActiveRecord::Migration[8.1]
  def change
    create_table :chatrooms do |t|
      t.string :name, null: false

      t.timestamps
    end

    add_index :chatrooms, :name, unique: true
  end
end
