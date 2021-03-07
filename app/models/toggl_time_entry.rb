# frozen_string_literal: true

# A time entry tag object received from Toggl.
class TogglTimeEntry
  include ActiveModel::Model

  attr_reader :id, :wid, :pid, :pid_name, :issue_id, :duration, :at, :comments

  def initialize(attributes = {})

    @id = attributes[:id].to_i
    @wid = attributes[:wid].to_i
    @pid = attributes[:pid].to_i
    @pid_name = attributes[:pid_name].to_s
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
      (@pid || 0).to_s,
      @comments.to_s.downcase,
      status
    ].join(':')
  end

  # Finds the associated Redmine issue.
  def issue
    Issue.find_by(id: @issue_id)
  end

  # Finds the most aproximate associated Redmine project if applicable
  def redmine_project
    # Project.where("trim(lower(identifier)) = ?", @pid_name.downcase.strip)
    Project.where("trim(lower(name)) = ?", @pid_name.downcase.strip)
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

  def to_hash
    instance_values.merge({ status: status })
  end

  # == operator
  def ==(other)
    TogglTimeEntry === other &&
      @id == other.id &&
      @wid == other.wid &&
      @pid == other.pid &&
      @pid_name == other.pid_name &&
      @duration == other.duration &&
      @at == other.at &&
      @issue_id == other.issue_id &&
      @comments == other.comments
  end

  private

  # Parses a Toggl description and returns its components.
  # If the parses fails but there is an associated project id, try do group by the project and comment
  def parse_description(description)
    matches = description.to_s.strip.scan(/^[^#]*#+(\d+)\s*(.*)?$/).first
    if matches&.count == 2 then
      @issue_id = matches[0].to_i
      @comments = matches[1]  
    elsif @pid > 0
      @comments = description.to_s.strip
    else
      return
    end
  end

  # Finds the associated Toggl mapping.
  def mapping
    TogglMapping.find_by(toggl_id: @id)
  end
end
