# frozen_string_literal: true

class T2rBaseController < ApplicationController
  attr_reader :user

  before_action :require_login, :validate_user

  protected

  def toggl_service
    @toggl_service ||= TogglService.new(@toggl_api_token)
  end

  # Checks if the current user has a valid Toggl API token.
  def validate_user
    @user = User.current

    # Must have a Toggl API token.
    field = UserCustomField.find_by_name('Toggl API Token')
    @toggl_api_token = @user.custom_field_value(field)
    return if @toggl_api_token.present?

    flash[:error] = I18n.t 't2r.text_add_toggl_api_key'
    redirect_to my_account_path
  end

  def user_can_view_issue?(issue)
    return true if @user.admin?

    user_is_member_of?(@user, issue.project)
  end

  def user_is_member_of?(user, project)
    Member.where(user: user, project: project).count.positive?
  end
end
