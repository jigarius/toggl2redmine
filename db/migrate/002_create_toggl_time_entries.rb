class CreateTogglTimeEntries < ActiveRecord::Migration

  def change
    create_table :toggl_time_entries do |t|
      t.integer :toggl_id, null: false, index: true, unique: true
      t.belongs_to :time_entry, null: false
      t.datetime :created_at, null: false
    end
  end

end
