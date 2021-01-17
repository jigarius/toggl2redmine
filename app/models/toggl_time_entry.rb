# frozen_string_literal: true

# Interface TogglTimeEntry.
module TogglTimeEntry
  def wid
    raise NotImplementedError
  end

  # Returns a key for grouping the time entry.
  # Format: issue-id:comment:status
  def key
    raise NotImplementedError
  end

  def issue_id
    raise NotImplementedError
  end

  def issue
    raise NotImplementedError
  end

  def at
    raise NotImplementedError
  end

  def duration
    raise NotImplementedError
  end

  def comments
    raise NotImplementedError
  end

  def status
    raise NotImplementedError
  end

  def imported?
    raise NotImplementedError
  end

  def running?
    raise NotImplementedError
  end
end
