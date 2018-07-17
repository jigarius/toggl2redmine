class TogglTimeEntry < ActiveRecord::Base

  belongs_to :time_entry
  validates :time_entry, presence: true
  validates :toggl_id, presence: true

end
