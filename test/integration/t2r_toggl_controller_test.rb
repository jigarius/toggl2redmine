# frozen_string_literal: true

require_relative '../test_helper'

class T2rTogglControllerTest < T2r::IntegrationTest
  include Rails.application.routes.url_helpers
  fixtures :all
  make_my_diffs_pretty!

  def setup
    @user = users(:jsmith)
    @field = custom_fields(:toggl_api_token)

    set_custom_field_value(@user, @field, 'fake-toggl-api-token')
    log_user(@user.login, @user.login)
  end

  test 'Includes T2rBaseController' do
    assert(T2rTogglController < T2rBaseController)
  end

  test '.read_time_entries returns time entries as JSON' do
    issue = issues(:alpha_001)

    time_entries = [
      TogglTimeEntry.new(
        id: 154,
        wid: 2,
        duration: 300,
        at: '2021-01-17T21:21:34+00:00',
        description: "##{issue.id} Prepare food"
      ),
      TogglTimeEntry.new(
        id: 155,
        wid: 2,
        duration: 150,
        at: '2021-01-17T21:22:34+00:00',
        description: "##{issue.id} Prepare food"
      ),
      TogglTimeEntry.new(
        id: 246,
        wid: 2,
        duration: -1,
        at: '2021-01-17T21:51:34+00:00',
        description: "##{issue.id} Feed bunny"
      )
    ]

    data = {
      from: '2021-01-17T05:00:00.000Z',
      till: '2021-01-18T04:59:59.000Z',
      workspace_id: 619
    }

    TogglService
      .any_instance
      .expects(:load_time_entries)
      .with(
        start_date: DateTime.parse(data[:from]),
        end_date: DateTime.parse(data[:till]),
        workspace_id: 619
      )
      .returns(time_entries)

    get "/toggl2redmine/toggl/time_entries?#{data.to_query}"

    assert_response :success

    expectation = {
      "#{issue.id}:prepare food:pending" => {
        'key' => "#{issue.id}:prepare food:pending",
        'ids' => [154, 155],
        'issue_id' => issue.id,
        'comments' => 'Prepare food',
        'duration' => 450,
        'status' => 'pending',
        'errors' => [],
        'issue' => {
          'id' => issue.id,
          'subject' => 'Abstract apples',
          'tracker' => {
            'id' => issue.tracker.id,
            'name' => 'Task'
          },
          'is_closed' => issue.closed?,
          'path' => "/issues/#{issue.id}"
        },
        'project' => {
          'id' => issue.project.id,
          'name' => 'Project alpha',
          'status' => 1,
          'path' => '/projects/alpha'
        }
      },
      "#{issue.id}:feed bunny:running" => {
        'key' => "#{issue.id}:feed bunny:running",
        'ids' => [246],
        'issue_id' => issue.id,
        'comments' => 'Feed bunny',
        'duration' => -1,
        'status' => 'running',
        'errors' => [],
        'issue' => {
          'id' => issue.id,
          'subject' => 'Abstract apples',
          'tracker' => {
            'id' => issue.tracker.id,
            'name' => 'Task'
          },
          'is_closed' => false,
          'path' => "/issues/#{issue.id}"
        },
        'project' => {
          'id' => issue.project.id,
          'name' => 'Project alpha',
          'status' => 1,
          'path' => '/projects/alpha'
        }
      }
    }

    assert_equal(expectation, @response.parsed_body)
  end

  test ".read_time_entries fails if param 'from' is missing" do
    data = { till: DateTime.now }

    get "/toggl2redmine/toggl/time_entries?#{data.to_query}"

    assert_response 400
    assert_equal(
      { 'errors' => ['param is missing or the value is empty: from'] },
      @response.parsed_body
    )
  end

  test ".read_time_entries fails if param 'till' is missing" do
    data = { from: DateTime.now }

    get "/toggl2redmine/toggl/time_entries?#{data.to_query}"

    assert_response 400
    assert_equal(
      { 'errors' => ['param is missing or the value is empty: till'] },
      @response.parsed_body
    )
  end

  test '.read_time_entries returns issue when it exists and the user belongs to the project' do
    issue = issues(:alpha_001)

    time_entries = [
      TogglTimeEntry.new(
        id: 246,
        wid: 2,
        duration: -1,
        at: '2021-01-17T21:51:34+00:00',
        description: "##{issue.id} Feed bunny"
      )
    ]

    data = {
      from: '2021-01-17T05:00:00.000Z',
      till: '2021-01-18T04:59:59.000Z'
    }

    TogglService
      .any_instance
      .expects(:load_time_entries)
      .with(
        start_date: DateTime.parse(data[:from]),
        end_date: DateTime.parse(data[:till]),
        workspace_id: nil
      )
      .returns(time_entries)

    get "/toggl2redmine/toggl/time_entries?#{data.to_query}"

    assert_response :success

    expectation = {
      "#{issue.id}:feed bunny:running" => {
        'key' => "#{issue.id}:feed bunny:running",
        'ids' => [246],
        'issue_id' => issue.id,
        'comments' => 'Feed bunny',
        'duration' => -1,
        'status' => 'running',
        'errors' => [],
        'issue' => {
          'id' => issue.id,
          'subject' => issue.subject,
          'tracker' => {
            'id' => issue.tracker.id,
            'name' => issue.tracker.name
          },
          'is_closed' => issue.closed?,
          'path' => "/issues/#{issue.id}"
        },
        'project' => {
          'id' => issue.project.id,
          'name' => issue.project.name,
          'status' => issue.project.status,
          'path' => project_path(issue.project)
        }
      }
    }

    assert_equal(expectation.as_json, @response.parsed_body)
  end

  test ".read_time_entries returns issue as nil when it doesn't exist" do
    time_entries = [
      TogglTimeEntry.new(
        id: 246,
        wid: 2,
        duration: 300,
        at: '2021-01-17T21:51:34+00:00',
        description: '#19 Feed bunny'
      )
    ]

    data = {
      from: '2021-01-17T05:00:00.000Z',
      till: '2021-01-18T04:59:59.000Z'
    }

    TogglService
      .any_instance
      .expects(:load_time_entries)
      .with(
        start_date: DateTime.parse(data[:from]),
        end_date: DateTime.parse(data[:till]),
        workspace_id: nil
      )
      .returns(time_entries)

    get "/toggl2redmine/toggl/time_entries?#{data.to_query}"

    assert_response :success

    expectation = {
      '19:feed bunny:pending' => {
        'key' => '19:feed bunny:pending',
        'ids' => [246],
        'issue_id' => 19,
        'comments' => 'Feed bunny',
        'duration' => 300,
        'status' => 'pending',
        'errors' => [I18n.t('t2r.error.issue_not_found')],
        'issue' => nil,
        'project' => nil
      }
    }

    assert_equal(expectation.as_json, @response.parsed_body)
  end

  test ".read_time_entries returns issue as nil when user doesn't belong to the project" do
    issue = issues(:delta_001)

    time_entries = [
      TogglTimeEntry.new(
        id: 246,
        wid: 2,
        duration: 300,
        at: '2021-01-17T21:51:34+00:00',
        description: "##{issue.id} Feed bunny"
      )
    ]

    data = {
      from: '2021-01-17T05:00:00.000Z',
      till: '2021-01-18T04:59:59.000Z'
    }

    TogglService
      .any_instance
      .expects(:load_time_entries)
      .with(
        start_date: DateTime.parse(data[:from]),
        end_date: DateTime.parse(data[:till]),
        workspace_id: nil
      )
      .returns(time_entries)

    get "/toggl2redmine/toggl/time_entries?#{data.to_query}"

    assert_response :success

    expectation = {
      "#{issue.id}:feed bunny:pending" => {
        'key' => "#{issue.id}:feed bunny:pending",
        'ids' => [246],
        'issue_id' => issue.id,
        'comments' => 'Feed bunny',
        'duration' => 300,
        'status' => 'pending',
        'errors' => [],
        'issue' => nil,
        'project' => nil
      }
    }

    assert_equal(expectation.as_json, @response.parsed_body)
  end

  test '.read_workspaces exposes workspaces as JSON' do
    workspaces = [
      TogglWorkspace.new(id: 1, name: 'Workspace 1'),
      TogglWorkspace.new(id: 2, name: 'Workspace 2')
    ]

    TogglService
      .any_instance
      .expects(:load_workspaces)
      .returns(workspaces)

    get '/toggl2redmine/toggl/workspaces'

    expectation = [
      { 'id' => 1, 'name' => 'Workspace 1' },
      { 'id' => 2, 'name' => 'Workspace 2' }
    ]

    assert_response :success
    assert_equal(expectation, @response.parsed_body)
  end
end
