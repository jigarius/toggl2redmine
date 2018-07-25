class TogglTimeEntry < ActiveRecord::Base

  belongs_to :time_entry
  validates :time_entry,
    presence: true
  validates :toggl_id,
    presence: true,
    numericality: true,
    uniqueness: { message: "cannot be re-imported" }

  attr_protected :id

end
