# Creates a "toggl_time_entries" table.
class CreateTogglTimeEntriesTable < ActiveRecord::Migration
  def change
    create_table :toggl_time_entries do |t|
      t.integer :toggl_id, null: false
      t.belongs_to :time_entry, null: false
      t.datetime :created_at, null: false
    end
    add_index :toggl_time_entries, [:toggl_id], unique: true, name: :toggle_id
  end
end
