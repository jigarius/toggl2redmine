class GroupedTogglTimeEntry

  include ActiveModel::Validations
  include ActiveModel::Conversion

  extend ActiveModel::Naming

  attr_reader :entries, :ids, :comments, :duration

  # Constructor
  def initialize(attributes = {})
    @entries = {}
    @comments = nil
    @duration = 0
  end

  def key
    @entries.values.first.key if @entries.size > 0
  end

  def ids
    return @entries.keys
  end

  def issue_id
    return @entries.values.first.issue_id if @entries.size > 0
  end

  def issue
    return @entries.values.first.issue if @entries.size > 0
  end

  def status
    return @entries.values.first.status if @entries.size > 0
  end

  # Add a time entry to the group.
  def addEntry(entry)
    if !key.nil? && key != entry.key
      raise 'Only issues with the same grouping key can be grouped together.'
    end

    # @issue_id = entry.issue_id
    # if @issue.nil? && !@issue_id.nil?
    #   begin
    #     @issue = Issue.find(@issue_id)
    #   rescue
    #     @issue = nil
    #   end
    # end

    @entries[entry.id] = entry
    # @ids.push(entry.id)
    @comments = entry.comments if @comments.nil?
    @duration = @duration + entry.duration
  end

  # Normalizes and groups Toggl time entries.
  def self.newFromFeed(entries)
    output = {}
    entries.each do |entry|
      entry = TogglTimeEntry.new(entry)
      key = entry.key
      output[key] = GroupedTogglTimeEntry.new() if output[key].nil?
      output[key].addEntry(entry)
    end
    return output
  end

  # As JSON.
  def as_json(options={})
    output = super(options)
    output[:key] = key
    output[:ids] = ids
    output[:issue_id] = issue_id
    output[:status] = status
    return output
  end

end
