class CreateMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :messages do |t|
      t.references :chatroom, null: false, foreign_key: true
      t.text :content, null: false
      t.string :sender_name, null: false

      t.timestamps
    end

    add_index :messages, :created_at
  end
end
