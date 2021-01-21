# frozen_string_literal: true

# A time entry tag object received from Toggl.
class TogglTimeEntry
  include ActiveModel::Model
  include ActiveModel::Conversion

  extend ActiveModel::Naming

  attr_reader :id, :wid, :issue_id, :duration, :at, :comments

  def initialize(attributes = {})
    attributes = attributes.symbolize_keys

    @id = attributes[:id].to_i
    @wid = attributes[:wid].to_i
    @duration = attributes[:duration].to_i
    @at = attributes[:at]
    @issue_id = nil
    @comments = nil

    parse_description(attributes[:description])
  end

  # Returns a key for grouping the time entry.
  def key
    [
      (@issue_id || 0).to_s,
      @comments.to_s.downcase,
      status
    ].join(':')
  end

  # Finds the associated Redmine issue.
  def issue
    Issue.find_by(id: @issue_id)
  end

  # Gets the status of the entry.
  def status
    return 'running' if running?
    return 'imported' if imported?

    'pending'
  end

  # Whether the record has already been imported to Redmine.
  def imported?
    mapping.present?
  end

  # Whether the timer is currently running.
  def running?
    @duration.negative?
  end

  # As JSON.
  def as_json(options = {})
    super(options).merge('status' => status)
  end

  # == operator
  def ==(other)
    TogglTimeEntry === other &&
      @id == other.id &&
      @wid == other.wid &&
      @duration == other.duration &&
      @at == other.at &&
      @issue_id == other.issue_id &&
      @comments == other.comments
  end

  private

  # Parses a Toggl description and returns its components.
  def parse_description(description)
    matches = description.to_s.strip.scan(/^[^#]*#+(\d+)\s*(.*)?$/).first
    return unless matches&.count == 2

    @issue_id = matches[0].to_i
    @comments = matches[1]
  end

  # Finds the associated Toggl mapping.
  def mapping
    TogglMapping.find_by(toggl_id: @id)
  end
end
