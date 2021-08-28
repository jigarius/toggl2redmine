# frozen_string_literal: true

class ChangeTogglMappingsTogglIdToBigint < ActiveRecord::Migration[4.2]
  def up
    change_column :toggl_mappings, :toggl_id, :bigint
  end
end
