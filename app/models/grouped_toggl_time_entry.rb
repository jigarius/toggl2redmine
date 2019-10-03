# frozen_string_literal: true

# A grouping of time entries related to the same Redmine issue.
class GroupedTogglTimeEntry
  include ActiveModel::Validations
  include ActiveModel::Conversion

  extend ActiveModel::Naming

  attr_reader :entries, :comments, :duration

  # Constructor
  def initialize(_attributes = {})
    @entries = {}
    @comments = nil
    @duration = 0
  end

  def key
    @entries.values.first.key unless @entries.empty?
  end

  def ids
    @entries.keys
  end

  def issue_id
    return @entries.values.first.issue_id unless @entries.empty?
  end

  def issue
    return @entries.values.first.issue unless @entries.empty?
  end

  def status
    return @entries.values.first.status unless @entries.empty?
  end

  # Add a time entry to the group.
  def add_entry(entry)
    raise 'Only issues with the same grouping key can be grouped together.' if !key.nil? && key != entry.key

    @entries[entry.id] = entry
    @comments = entry.comments if @comments.nil?
    @duration += entry.duration
  end

  # Normalizes and groups Toggl time entries.
  def self.new_from_feed(entries)
    output = {}
    entries.each do |entry|
      entry = TogglTimeEntry.new(entry)
      key = entry.key
      output[key] = GroupedTogglTimeEntry.new if output[key].nil?
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
