# frozen_string_literal: false

require_relative '../../test_helper'

class T2rTestController < T2rBaseController
  def index
    render plain: 'OK', status: 200
  end
end

class T2rBaseControllerTest < Redmine::IntegrationTest
  setup do
    @user =
      User.find_by(login: 't2r.user') ||
      User.create!(
        login: 't2r.user',
        mail: 't2r.user@example.com',
        firstname: 'Bunny',
        lastname: 'Wabbit',
        password: 'toggl2redmine'
      )

    set_toggl_api_token(@user, nil)
  end

  test '#index requires login' do
    get '/toggl2redmine/test'

    assert_redirected_to signin_url(back_url: 'http://www.example.com/toggl2redmine/test')
  end

  test '#index requires a Toggl API key' do
    log_user

    get '/toggl2redmine/test'

    assert_redirected_to '/my/account'
    assert_equal 'To use Toggl 2 Redmine, please add a Toggl API Token to your account.', flash[:error]
  end

  test '#index succeeds for a user with a Toggl API key' do
    set_toggl_api_token(@user, 'fake-toggl-api-token')
    log_user

    get '/toggl2redmine/test'

    assert_response :success
  end

  private

  def log_user
    post signin_url,
         params: { username: @user.login, password: 'toggl2redmine' }
  end

  def set_toggl_api_token(user, token)
    field = UserCustomField.find_by_name('Toggl API Token')

    custom_value =
      CustomValue.find_by(customized: user, custom_field: field) ||
      CustomValue.new(customized: user, custom_field: field)

    custom_value.value = token
    custom_value.save!
  end
end
