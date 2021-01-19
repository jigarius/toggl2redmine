# frozen_string_literal: true

# A time entry tag object received from Toggl.
class TogglWorkspace
  include ActiveModel::Model
  include ActiveModel::Conversion

  attr_reader :id, :name

  def initialize(attributes = {})
    @id = attributes[:id]
    @name = attributes[:name]
  end

  def ==(other)
    TogglWorkspace === other &&
      @id == other.id &&
      @name == other.name
  end
end
