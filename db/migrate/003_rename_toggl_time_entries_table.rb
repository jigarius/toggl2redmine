# frozen_string_literal: true

# Renames "toggl_time_entries" table to "toggl_mappings".
class RenameTogglTimeEntriesTable < ActiveRecord::Migration
  def self.up
    rename_table :toggl_time_entries, :toggl_mappings
  end

  def self.down
    rename_table :toggl_mappings, :toggl_time_entries
  end
end
