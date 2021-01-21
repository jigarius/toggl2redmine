# frozen_string_literal: true

require_relative '../../test_helper'

class TogglTimeEntryGroupTest < ActiveSupport::TestCase
  test '.new' do
    expected = [
      build_time_entry_record,
      build_time_entry_record,
      build_time_entry_record
    ]

    subject = TogglTimeEntryGroup.new(*expected)

    assert_equal(expected, subject.entries)
  end

  test '.key' do
    subject = TogglTimeEntryGroup.new

    assert_nil(subject.key)

    record = build_time_entry_record
    subject << record

    refute_nil(subject.key)
    assert_equal(record.key, subject.key)
  end

  test '.issue_id' do
    subject = TogglTimeEntryGroup.new

    assert_nil(subject.issue_id)

    record = build_time_entry_record
    subject << record

    refute_nil(subject.issue_id)
    assert_equal(record.issue_id, subject.issue_id)
  end

  test '.duration' do
    subject = TogglTimeEntryGroup.new

    assert_predicate(subject.duration, :zero?)

    record = build_time_entry_record
    subject << record

    refute_nil(subject.duration)
    assert_equal(record.duration, subject.duration)
  end

  test '.comments' do
    subject = TogglTimeEntryGroup.new

    assert_nil(subject.comments)

    record = build_time_entry_record
    subject << record

    refute_nil(subject.comments)
    assert_equal(record.comments, subject.comments)
  end

  test '.status' do
    subject = TogglTimeEntryGroup.new

    assert_nil(subject.status)

    record = build_time_entry_record
    subject << record

    refute_nil(subject.status)
    assert_equal(record.status, subject.status)
  end

  test '.imported?' do
    subject = TogglTimeEntryGroup.new

    refute(subject.imported?)

    record = build_time_entry_record
    subject << record

    refute_nil(subject.duration)
    assert_equal(record.imported?, subject.imported?)
  end

  test '.running? returns false if the group contains stopped entries' do
    subject = TogglTimeEntryGroup.new

    refute(subject.running?)

    subject << build_time_entry_record(duration: 300)

    refute(subject.running?)
  end

  test '.running? returns true if the group contains running entries' do
    subject = TogglTimeEntryGroup.new

    refute(subject.running?)

    subject << build_time_entry_record(duration: -1)

    assert(subject.running?)
  end

  test '<< inserts entries with same key' do
    subject = TogglTimeEntryGroup.new

    r1 = build_time_entry_record(description: '#150 Play video games', duration: 300)
    r2 = build_time_entry_record(description: '#150 Play video games', duration: 500)

    assert_equal(r1.key, r2.key)

    subject << r1
    subject << r2

    assert_equal(2, subject.entries.length)
  end

  test '<< inserts raises on entry type mismatch' do
    subject = TogglTimeEntryGroup.new(
      build_time_entry_record(description: '#150 Play video games', duration: 300)
    )

    error = assert_raises(ArgumentError) { subject << BasicObject.new }
    assert_match('Argument must be a TogglTimeEntry', error.message)
  end

  test '<< inserts raises on entry key mismatch' do
    subject = TogglTimeEntryGroup.new(
      build_time_entry_record(description: '#150 Play video games', duration: 300)
    )

    entries = [
      # key different due to issue ID
      build_time_entry_record(description: '#152 Play video games'),
      # key different due to comments
      build_time_entry_record(description: '#150 Play games'),
      # key different due to status
      build_time_entry_record(description: '#150 Play video games', duration: -1)
    ]
    entries.each do |entry|
      error = assert_raises(ArgumentError) { subject << entry }
      assert_equal("Only items with key '#{subject.key}' can be added", error.message)
    end

    assert_equal(1, subject.entries.length)
  end

  test '.as_json serializes a group without entries' do
    subject = TogglTimeEntryGroup.new

    expected = {
      'key' => nil,
      'ids' => [],
      'issue_id' => nil,
      'duration' => 0,
      'comments' => nil,
      'status' => nil
    }

    assert_equal(expected, subject.as_json)
  end

  test '.as_json serializes a group with entries' do
    subject = TogglTimeEntryGroup.new

    r1 = build_time_entry_record(id: 20, duration: 30, description: '#151 Hello world')
    subject << r1

    r2 = build_time_entry_record(id: 30, duration: 20, description: '#151 Hello world')
    subject << r2

    expected = {
      'key' => r1.key,
      'ids' => [r1.id, r2.id],
      'issue_id' => r1.issue_id,
      'duration' => r1.duration + r2.duration,
      'comments' => r1.comments,
      'status' => r1.status
    }

    assert_equal(expected, subject.as_json)
  end

  test '.group' do
    g1e1 = build_time_entry_record(description: '#121 Board meeting')
    g1e2 = build_time_entry_record(description: '#121 Board meeting')
    g1e3 = build_time_entry_record(description: '#121 Board meeting')

    g2e1 = build_time_entry_record(duration: -1, description: '#2 Timer running')

    g3e1 = build_time_entry_record(description: '#19 Board meeting')
    g3e2 = build_time_entry_record(description: '#19 Board meeting')

    g4e1 = build_time_entry_record(description: '#19 Send post-meeting report')

    expected = {
      g1e1.key => TogglTimeEntryGroup.new(g1e1, g1e2, g1e3),
      g2e1.key => TogglTimeEntryGroup.new(g2e1),
      g3e1.key => TogglTimeEntryGroup.new(g3e1, g3e2),
      g4e1.key => TogglTimeEntryGroup.new(g4e1)
    }

    assert_equal(
      expected,
      TogglTimeEntryGroup.group(
        [
          g1e1, g1e2, g1e3,
          g2e1,
          g3e1, g3e2,
          g4e1
        ]
      )
    )
  end

  private

  # TODO: Create TogglTimeEntry#example
  def build_time_entry_record(attributes = {})
    attributes = {
      id: rand(1..999),
      wid: rand(1..99),
      duration: rand(1..999),
      at: '2021-01-16T15:30:04+00:00',
      description: '#19 Lorem impsum'
    }.merge(attributes)

    TogglTimeEntry.new(attributes)
  end
end
