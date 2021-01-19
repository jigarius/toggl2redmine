# frozen_string_literal: true

# A mapping between a TogglTimeEntry and a Redmine TimeEntry.
class TogglMapping < ActiveRecord::Base
  attr_readonly :id

  belongs_to :time_entry

  validates :time_entry, presence: true
  validates :toggl_id,
            presence: true,
            numericality: {
              only_integer: true,
              greater_than: 0
            },
            uniqueness: { message: 'has already been imported' }
end
