# frozen_string_literal: false

require_relative '../test_helper'

class T2rTestController < T2rBaseController
  def index
    render plain: 'OK', status: 200
  end
end

class T2rBaseControllerTest < Redmine::IntegrationTest
  include(T2r::FixtureLoader)

  fixtures :custom_fields, :users

  setup do
    @user = users(:jsmith)
  end

  test '#index requires login' do
    get '/toggl2redmine/test'

    assert_redirected_to signin_url(back_url: 'http://www.example.com/toggl2redmine/test')
  end

  test '#index requires a Toggl API key' do
    set_toggl_api_token(@user, '')
    log_user(@user.login, @user.login)

    get '/toggl2redmine/test'

    assert_redirected_to '/my/account'
    assert_equal 'To use Toggl 2 Redmine, please add a Toggl API Token to your account.', flash[:error]
  end

  test '#index succeeds for a user with a Toggl API key' do
    set_toggl_api_token(@user, 'fake-toggl-api-token')
    log_user(@user.login, @user.login)

    get '/toggl2redmine/test'

    assert_response :success
  end

  private

  def log_user(login, password)
    post signin_url, params: {
      username: login,
      password: password
    }
  end

  def set_toggl_api_token(user, token)
    field = custom_fields(:toggl_api_token)
    assert_not_nil(field, "Unexpected: Field 'Toggl API Token' not found")

    custom_value =
      CustomValue.find_by(customized: user, custom_field: field) ||
      CustomValue.new(customized: user, custom_field: field)

    custom_value.value = token
    custom_value.save!
  end
end
