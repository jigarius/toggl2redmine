# frozen_string_literal: true

# A group of time entries that have the same key.
class TogglTimeEntryGroup
  include Enumerable
  include TogglTimeEntry
  include ActiveModel::Conversion

  extend ActiveModel::Naming

  attr_reader :duration

  # Constructor
  def initialize
    @entries = {}
    @duration = 0
  end

  # TODO: Do we need this method?
  def ids
    @entries.keys
  end

  def wid
    @entries.values.first&.wid
  end

  def at
    @entries.values.first&.at
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

  def comments
    @entries.values.first&.comments
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

  # TODO: Rename to <<.
  def add_entry (entry)
    unless TogglTimeEntryRecord === entry
      raise ArgumentError, "Argument must be a #{TogglTimeEntryRecord.name}"
    end

    if !@entries.empty? && key != entry.key
      raise ArgumentError, "Only items with key '#{key}' can be added"
    end

    @entries[entry.id] = entry
    @duration += entry.duration
  end

  def << (entry)
    add_entry(entry)
  end

  # Enumerable#each
  def each(&block)
    @entries.each(&block)
  end

  # Enumerable#entries
  def entries(*args)
    @entries.values.entries(*args)
  end

  # As JSON.
  def as_json(options = {})
    {
      'ids' => ids,
      'wid' => wid,
      'duration' => @duration,
      'at' => at,
      'key' => key,
      'issue_id' => issue_id,
      'comments' => comments,
      'status' => status,
    }
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
end
