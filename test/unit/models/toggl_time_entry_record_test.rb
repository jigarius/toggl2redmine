# frozen_string_literal: true

require_relative '../../test_helper'

class TogglTimeEntryRecordTest < ActiveSupport::TestCase
  SAMPLE_ATTRIBUTES = {
    id: 900_123,
    wid: 500,
    duration: 300,
    at: '2021-01-16T15:30:04+00:00',
    description: '#19 Bunny wabbit'
  }.freeze

  test 'implements TogglTimeEntry interface' do
    assert(TogglTimeEntryRecord.include?(TogglTimeEntry))

    subject = TogglTimeEntryRecord.new
    TogglTimeEntry.instance_methods.each do |method|
      subject.public_send method
    end
  end

  test '.new treats string and symbol keys indifferently' do
    entry1 = TogglTimeEntryRecord.new(SAMPLE_ATTRIBUTES)
    entry2 = TogglTimeEntryRecord.new(
      'id' => 900_123,
      'wid' => 500,
      'duration' => 300,
      'at' => '2021-01-16T15:30:04+00:00',
      'description' => '#19 Bunny wabbit'
    )

    assert_equal(entry1, entry2)
  end

  test 'simple attribute readers work correctly' do
    subject = build_subject

    assert_equal(SAMPLE_ATTRIBUTES[:id], subject.id)
    assert_equal(SAMPLE_ATTRIBUTES[:wid], subject.wid)
    assert_equal(SAMPLE_ATTRIBUTES[:duration], subject.duration)
    assert_equal(SAMPLE_ATTRIBUTES[:at], subject.at)
    assert_equal(19, subject.issue_id)
    assert_equal('Bunny wabbit', subject.comments)
  end

  test ".new can parse the description '#123'" do
    subject = build_subject(description: '#123')

    assert_equal(123, subject.issue_id)
    assert_equal('', subject.comments)
  end

  test ".new can parse the description '#123 hey there, amigo'" do
    subject = build_subject(description: '#123 hey there, amigo')

    assert_equal(123, subject.issue_id)
    assert_equal('hey there, amigo', subject.comments)
  end

  test ".new can parse the description 'hey there, amigo'" do
    subject = build_subject(description: 'hey there, amigo')

    assert_nil(subject.issue_id)
    assert_nil(subject.comments)
  end

  test ".new can parse the description ''" do
    subject = build_subject(description: '')

    assert_nil(subject.issue_id)
    assert_nil(subject.comments)
  end

  test ".new can parse the description '#123 #456 bunny wabbit'" do
    subject = build_subject(description: '#123 #456 bunny wabbit')

    assert_equal(123, subject.issue_id)
    assert_equal('#456 bunny wabbit', subject.comments)
  end

  test ".new can parse the description '##123 bunny wabbit'" do
    subject = build_subject(description: '##123 bunny wabbit')

    assert_equal(123, subject.issue_id)
    assert_equal('bunny wabbit', subject.comments)
  end

  test ".new can parse the description '#123 Bunny wrote <markup>'" do
    subject = build_subject(description: '#123 Bunny wrote <markup>')

    assert_equal(123, subject.issue_id)
    assert_equal('Bunny wrote <markup>', subject.comments)
  end

  test '.new ignores unimportant whitespace in description' do
    subject = build_subject(description: '  #123   hey there,   amigo ')

    assert_equal(123, subject.issue_id)
    assert_equal('hey there,   amigo', subject.comments)
  end

  test '.key returns correct key' do
    descriptions = {
      '19:bunny wabbit:pending' => build_subject(description: '#19 Bunny wabbit'),
      '19::pending' => build_subject(description: '#19'),
      '0::pending' => build_subject(description: ''),
      '19:bunny wabbit:running' => build_subject(duration: -1)
    }

    descriptions.each do |k, subject|
      assert_equal(k, subject.key)
    end
  end

  test '.imported? returns false when a related TogglMapping doesnt exist' do
    refute(build_subject.imported?)
  end

  test '.imported? returns true when a related TogglMapping exists' do
    subject = build_subject

    TogglMapping
      .expects(:find_by)
      .with(toggl_id: subject.id)
      .returns(TogglMapping.new)

    assert(subject.imported?)
  end

  test '.running? returns false when duration is non-negative' do
    refute(build_subject.running?)
    refute(build_subject(duration: 0).running?)
  end

  test '.running? returns true when duration is negative' do
    assert(build_subject(duration: -1).running?)
  end

  test ".status returns 'pending' when entry is not imported" do
    assert_equal('pending', build_subject.status)
  end

  test ".status returns 'running' when entry is running" do
    assert_equal('running', build_subject(duration: -1).status)
  end

  test ".status returns 'imported' when entry is imported" do
    subject = build_subject
    subject.expects(:imported?).returns(true)

    assert_equal('imported', subject.status)
  end

  test '.issue returns nil if issue does not exist' do
    subject = build_subject(description: "#999_999_999 doesn't exist")
    assert_nil(subject.issue)
  end

  test '.issue returns Issue if issue exists' do
    subject = build_subject
    issue = Issue.new

    Issue.expects(:find_by).with(id: subject.issue_id).once.returns(issue)

    assert_same(issue, subject.issue)
  end

  test '.as_json' do
    subject = build_subject
    expected = {
      'id' => subject.id,
      'wid' => subject.wid,
      'duration' => subject.duration,
      'at' => subject.at,
      'issue_id' => subject.issue_id,
      'comments' => subject.comments,
      'status' => subject.status
    }

    assert_equal(expected, subject.as_json)
  end

  test '.== compares correctly' do
    subject = TogglTimeEntryRecord.new(SAMPLE_ATTRIBUTES)

    assert_equal(
      subject,
      build_subject
    )
    refute_equal(
      subject,
      build_subject(id: 50)
    )
    refute_equal(
      subject,
      build_subject(wid: 35)
    )
    refute_equal(
      subject,
      build_subject(at: '2020-01-16T15:30:04+00:00')
    )
    refute_equal(
      subject,
      build_subject(duration: 200)
    )
    refute_equal(
      subject,
      build_subject(description: '#007 James Bond')
    )
  end

  private

  def build_subject(attributes = {})
    attributes = SAMPLE_ATTRIBUTES.merge(attributes)
    TogglTimeEntryRecord.new(attributes)
  end
end
