# frozen_string_literal: true

# A group of time entries that have the same key.
class TogglTimeEntryGroup
  include TogglTimeEntry
  include ActiveModel::Conversion

  extend ActiveModel::Naming

  attr_reader :entries, :comments, :duration

  # Constructor
  def initialize(_attributes = {})
    @entries = {}
    @comments = nil
    @duration = 0
  end

  # TODO: Do we need this method?
  def ids
    @entries.keys
  end

  def wid
    @entries.first&.wid
  end

  def at
    @entries.first&.at
  end

  def key
    @entries.values.first&.key
  end

  def issue_id
    @entries.values.first&.issue_id
  end

  def issue
    @entries.values.first&.issue
  end

  def imported?
    @entries.values.first&.imported? || false
  end

  def running?
    @entries.values.first&.running? || false
  end

  def status
    @entries.values.first&.status
  end

  # Add a time entry to the group.
  def add_entry(entry)
    if !key.nil? && key != entry.key
      raise 'Only issues with the same grouping key can be grouped together.'
    end

    @entries[entry.id] = entry
    @comments = entry.comments if @comments.nil?
    @duration += entry.duration
  end

  # Normalizes and groups Toggl time entries.
  def self.new_from_feed(entries)
    output = {}
    entries.each do |entry|
      entry = TogglTimeEntryRecord.new(entry)
      key = entry.key
      output[key] = TogglTimeEntryGroup.new if output[key].nil?
      output[key].add_entry(entry)
    end
    output
  end

  # As JSON.
  def as_json(options = {})
    output = super(options)
    output[:key] = key
    output[:ids] = ids
    output[:issue_id] = issue_id
    output[:status] = status
    output
  end
end
