# frozen_string_literal: true

# Creates a "Toggl API Key" field.
class CreateTogglApiKeyField < ActiveRecord::Migration
  def up
    custom_field = CustomField.new_subclass_instance('UserCustomField',
                                                     name: 'Toggl API Key',
                                                     field_format: 'string',
                                                     min_length: 32,
                                                     max_length: 32,
                                                     regexp: '',
                                                     default_value: '',
                                                     is_required: 0,
                                                     visible: 0,
                                                     editable: 1,
                                                     is_filter: 0)
    custom_field.save!
  end

  def down
    CustomField.find_by_name('Toggl API Key').destroy
  end
end
