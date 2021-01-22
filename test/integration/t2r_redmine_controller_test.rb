# frozen_string_literal: true

require_relative '../test_helper'

class T2rRedmineControllerTest < T2r::IntegrationTest
  fixtures :custom_fields, :users, :time_entries, :issues, :issue_statuses, :projects, :trackers, :enumerations

  def setup
    @user = users(:jsmith)
    @field = custom_fields(:toggl_api_token)

    set_custom_field_value(@user, @field, 'fake-toggl-api-token')
    log_user(@user.login, @user.login)
  end

  test 'Includes T2rBaseController' do
    assert(T2rRedmineController < T2rBaseController)
  end

  test '.read_time_entries returns time entries as JSON' do
    data = {
      from: '2012-11-03T00:00:00Z',
      till: '2012-11-03T00:00:00Z'
    }

    get "/toggl2redmine/redmine_time_entries?#{data.to_query}"

    e1 = time_entries(:entry_001)
    e2 = time_entries(:entry_002)
    e3 = time_entries(:entry_003)
    e4 = time_entries(:entry_004)

    expectation = {
      'time_entries' => [
        {
          'id' => e3.id,
          'hours' => 1.25,
          'comments' => 'Ut fermentum massa justo sit amet risus.',
          'issue' => {
            'id' => e3.issue.id,
            'subject' => 'Boil bananas',
            'tracker' => { 'id' => e3.issue.tracker.id, 'name' => 'Task' }
          },
          'project' => { 'id' => e3.project.id, 'name' => 'Project alpha', 'status' => 1 },
          'activity' => { 'id' => e3.activity.id, 'name' => 'Development' }
        },
        {
          'id' => e4.id,
          'hours' => 2.0,
          'comments' => 'Fusce dapibus, tellus ac cursus commodo tortor mauris condimentum.',
          'issue' => {
            'id' => e4.issue.id,
            'subject' => 'Extract essence',
            'tracker' => { 'id' => e4.issue.tracker.id, 'name' => 'Task' }
          },
          'project' => { 'id' => e4.project.id, 'name' => 'Project charlie', 'status' => 0 },
          'activity' => { 'id' => e4.activity.id, 'name' => 'Other' }
        },
        {
          'id' => e1.id,
          'hours' => 0.5,
          'comments' => 'Pellentesque ornare sem lacinia quam venenatis vestibulum.',
          'issue' => {
            'id' => e1.issue.id,
            'subject' => 'Abstract apples',
            'tracker' => { 'id' => e1.issue.tracker.id, 'name' => 'Task' }
          },
          'project' => { 'id' => e1.project.id, 'name' => 'Project alpha', 'status' => 1 },
          'activity' => { 'id' => e1.activity.id, 'name' => 'Development' }
        },
        {
          'id' => e2.id,
          'hours' => 0.25,
          'comments' => 'Cras mattis consectetur purus sit amet fermentum.',
          'issue' => {
            'id' => e2.issue.id,
            'subject' => 'Abstract apples',
            'tracker' => { 'id' => e2.issue.tracker.id, 'name' => 'Task' }
          },
          'project' => { 'id' => e2.project.id, 'name' => 'Project alpha', 'status' => 1 },
          'activity' => { 'id' => e2.activity.id, 'name' => 'Development' }
        }
      ]
    }

    assert_response :success

    # Comparing each record separately makes the diffs easier to read.
    assert_equal(expectation.keys, @response.parsed_body.keys)
    assert_equal(expectation['time_entries'].length, @response.parsed_body['time_entries'].length)

    expectation['time_entries'].each_with_index do |expected_item, i|
      assert_equal(
        expected_item,
        @response.parsed_body['time_entries'][i],
        "Item #{i + 1} is not as expected"
      )
    end
  end

  test ".read_time_entries fails if param 'from' is missing" do
    data = { till: DateTime.now }

    get "/toggl2redmine/redmine_time_entries?#{data.to_query}"

    assert_response 400
    assert_equal(
      { 'errors' => ['param is missing or the value is empty: from'] },
      @response.parsed_body
    )
  end

  test ".read_time_entries fails if param 'till' is missing" do
    data = { from: DateTime.now }

    get "/toggl2redmine/redmine_time_entries?#{data.to_query}"

    assert_response 400
    assert_equal(
      { 'errors' => ['param is missing or the value is empty: till'] },
      @response.parsed_body
    )
  end
end
