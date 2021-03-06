# frozen_string_literal: true

# Renames "Toggl API Token" field to "Toggl API Key".
class RenameTogglApiKeyField < ActiveRecord::Migration[4.2]
  def self.up
    field = UserCustomField.find_by_name('Toggl API Key')
    field.name = 'Toggl API Token'
    field.save!
  end

  def self.down
    field = UserCustomField.find_by_name('Toggl API Token')
    field.name = 'Toggl API Key'
    field.save!
  end
end
