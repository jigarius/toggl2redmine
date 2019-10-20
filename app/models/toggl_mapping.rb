# frozen_string_literal: true

# A mapping between a Toggl time entry and a Redmine time entry.
class TogglMapping < ActiveRecord::Base
  belongs_to :time_entry
  validates :time_entry,
            presence: true
  validates :toggl_id,
            presence: true,
            numericality: {
              only_integer: true,
              greater_than: 0
            },
            uniqueness: { message: 'has already been imported' }

  attr_readonly :id

  # Returns any mappings related to given Toggl Ids.
  def self.find_by_toggl_ids(*ids)
    where(toggl_id: ids)
  end
end
