# frozen_string_literal: true

# A group of time entries that have the same key.
class TogglTimeEntryGroup
  include ActiveModel::Model

  attr_reader :duration

  # Constructor
  def initialize(*entries)
    @entries = {}
    @duration = 0

    entries.each { |e| self << e }
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
    unless TogglTimeEntry === entry
      raise ArgumentError, "Argument must be a #{TogglTimeEntry.name}"
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

  def entries
    @entries.values
  end

  def to_hash
    {
      key: key,
      ids: @entries.keys,
      issue_id: issue_id,
      comments: comments,
      duration: duration,
      status: status
    }
  end

  #
  # Groups TogglTimeEntry objects into TogglTimeEntryGroup objects.
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
