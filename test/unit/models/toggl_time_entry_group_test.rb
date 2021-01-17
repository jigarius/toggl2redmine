# frozen_string_literal: true

require_relative '../../test_helper'

class TogglTimeEntryGroupTest < ActiveSupport::TestCase
  test 'implements TogglTimeEntry interface' do
    assert(TogglTimeEntryGroup.include?(TogglTimeEntry))

    subject = TogglTimeEntryGroup.new
    TogglTimeEntry.instance_methods.each do |method|
      subject.public_send method
    end
  end

  test 'implements Enumerable interface' do
    assert(TogglTimeEntryGroup.include?(Enumerable))

    entries = [
      build_time_entry_record(duration: 300),
      build_time_entry_record(duration: 50),
      build_time_entry_record(duration: 150)
    ]

    subject = TogglTimeEntryGroup.new
    entries.each { |e| subject << e }

    assert_equal(3, subject.count)
    assert_equal(entries, subject.entries)
  end

  test '.wid' do
    subject = TogglTimeEntryGroup.new

    assert_nil(subject.wid)

    record = build_time_entry_record
    subject << record

    refute_nil(subject.wid)
    assert_equal(record.wid, subject.wid)
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

  test '.at' do
    subject = TogglTimeEntryGroup.new

    assert_nil(subject.at)

    record = build_time_entry_record
    subject << record

    refute_nil(subject.at)
    assert_equal(record.at, subject.at)
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

  test '.as_json serializes a group without entries' do
    subject = TogglTimeEntryGroup.new

    expected = {
      'ids' => [],
      'wid' => nil,
      'duration' => 0,
      'at' => nil,
      'key' => nil,
      'issue_id' => nil,
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
      'ids' => [r1.id, r2.id],
      'wid' => r1.wid,
      'duration' => r1.duration + r2.duration,
      'at' => r1.at,
      'key' => r1.key,
      'issue_id' => r1.issue_id,
      'comments' => r1.comments,
      'status' => r1.status
    }

    assert_equal(expected, subject.as_json)
  end

  private

  # TODO: Create TogglTimeEntryRecord#example
  def build_time_entry_record(attributes = {})
    attributes = {
      id: rand(1..999),
      wid: rand(1..99),
      duration: rand(1..999),
      at: '2021-01-16T15:30:04+00:00',
      description: '#19 Lorem impsum'
    }.merge(attributes)

    TogglTimeEntryRecord.new(attributes)
  end
end
