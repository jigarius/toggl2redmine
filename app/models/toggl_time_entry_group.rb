# frozen_string_literal: true

# A group of time entries that have the same key.
class TogglTimeEntryGroup
  include Enumerable
  include TogglTimeEntry
  include ActiveModel::Conversion

  extend ActiveModel::Naming

  attr_reader :duration

  # Constructor
  def initialize(*entries)
    @entries = {}
    @duration = 0

    entries.each { |e| self << e }
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

  def <<(entry)
    unless TogglTimeEntryRecord === entry
      raise ArgumentError, "Argument must be a #{TogglTimeEntryRecord.name}"
    end

    if !@entries.empty? && key != entry.key
      raise ArgumentError, "Only items with key '#{key}' can be added"
    end

    @entries[entry.id] = entry
    @duration += entry.duration
  end

  def ==(other)
    TogglTimeEntryGroup === other &&
      entries.to_set == other.entries.to_set
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
  def as_json(_options = {})
    {
      'ids' => ids,
      'wid' => wid,
      'duration' => @duration,
      'at' => at,
      'key' => key,
      'issue_id' => issue_id,
      'comments' => comments,
      'status' => status
    }
  end

  #
  # Groups TogglTimeEntryRecord objects into TogglTimeEntryGroup objects.
  #
  # Items with the same .key are put in the same group.
  def self.group(entries)
    output = {}
    entries.each do |entry|
      output[entry.key] = TogglTimeEntryGroup.new unless output.key?(entry.key)
      output[entry.key] << entry
    end
    output
  end
end
