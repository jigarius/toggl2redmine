# frozen_string_literal: false

require_relative '../test_helper'

class T2rTestController < T2rBaseController
  def index
    render plain: 'OK', status: 200
  end
end

class T2rBaseControllerTest < T2r::IntegrationTest
  fixtures :all

  def setup
    @user = users(:jsmith)
    @field = custom_fields(:toggl_api_token)
  end

  test '#index requires login' do
    get '/toggl2redmine/test'

    assert_redirected_to signin_url(back_url: 'http://www.example.com/toggl2redmine/test')
  end

  test '#index requires a Toggl API key' do
    set_custom_field_value(@user, @field, '')
    log_user(@user.login, @user.login)

    get '/toggl2redmine/test'

    assert_redirected_to '/my/account'
    assert_equal 'To use Toggl 2 Redmine, please add a Toggl API Token to your account.', flash[:error]
  end

  test '#index succeeds for a user with a Toggl API key' do
    set_custom_field_value(@user, @field, 'fake-toggl-api-token')
    log_user(@user.login, @user.login)

    get '/toggl2redmine/test'

    assert_response :success
  end
end
