# frozen_string_literal: true

# A time entry tag object received from Toggl.
class TogglTimeEntry
  include ActiveModel::Validations
  include ActiveModel::Conversion

  extend ActiveModel::Naming

  attr_reader :id, :wid, :issue_id, :duration, :at, :description, :comments

  validates :id, :wid, :duration, :at, presence: true
  validates :id, :wid, :duration,
            numericality: {
              only_integer: true,
              greater_than: 0
            }

  # Constructor
  def initialize(attributes = {})
    @id = attributes['id'].to_i
    @wid = attributes['wid'].to_i
    @duration = attributes['duration'].to_i
    @at = attributes['at']

    # Interpret the description
    description = parse_description(attributes['description'])
    @description = description[:original]
    @issue_id = description[:issue_id]
    @comments = description[:comments]
  end

  # Returns a key for grouping the time entry.
  def key
    key = []
    key.push(@issue_id.nil? ? '0' : @issue_id.to_s)
    key.push(@comments.downcase)
    key.push(status)
    key.join(':')
  end

  # Parses a Toggl description and returns it's components.
  def parse_description(description)
    description = '' if description.nil?
    description = description.strip

    # Prepare default output.
    output = {
      original: description,
      issue_id: nil,
      comments: description
    }

    # Scan the description.
    matches = description.scan(/^[^#]*#(\d+)\s*(.*)?$/).first
    if !matches.nil? && matches.count == 2
      output[:issue_id] = matches[0].to_i
      output[:comments] = matches[1]
    end

    output
  end

  # Finds the associated Redmine issue.
  def issue
    begin
      output = Issue.find(@issue_id) unless @issue_id.nil?
    rescue StandardError
      output = nil
    end
    output
  end

  # Finds the associated Toggl mapping.
  def mapping
    TogglMapping.find_by(toggl_id: @id)
  end

  # Gets the status of the entry.
  def status
    return 'running' if running?
    return 'imported' if imported?

    'pending'
  end

  # Whether the record has already been imported to Redmine.
  def imported?
    !mapping.nil?
  end

  # Whether the timer is currently running.
  def running?
    @duration.negative?
  end

  # As JSON.
  def as_json(options = {})
    output = super(options)
    output[:status] = status
    output
  end
end
