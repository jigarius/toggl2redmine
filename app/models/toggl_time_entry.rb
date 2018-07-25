class TogglTimeEntry < ActiveRecord::Base

  belongs_to :time_entry
  validates :time_entry,
    presence: true
  validates :toggl_id,
    presence: true,
    numericality: {
      only_integer: true,
      greater_than: 0
    },
    uniqueness: { message: "has already been imported" }

  attr_protected :id

end
