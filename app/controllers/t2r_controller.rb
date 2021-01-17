# frozen_string_literal: true

# Toggl 2 Redmine Controller.
class T2rController < ApplicationController
  menu_item :toggl2redmine
  before_action :require_login, :validate_user

  attr_reader :user, :toggl_api_key

  # Current user.
  @user = nil

  # Toggl API token of the current user.
  @toggl_api_key = nil

  # Determines the currently logged in user.
  def validate_user
    @user = find_current_user

    # Must have a Toggl API key.
    field = UserCustomField.find_by_name('Toggl API Token')
    @toggl_api_key = @user.custom_field_value(field)
    return unless @toggl_api_key.nil? || @toggl_api_key.empty?

    flash[:error] = I18n.t 't2r.text_add_toggl_api_key'
    redirect_to controller: 'my', action: 'account'
  end

  # Creates time entries from request data.
  def import
    begin
      # TODO: Investigate usage of before_action with rescue_from.
      import_parse_params
    rescue ActionController::ParameterMissing => e
      return render json: { errors: [e.message] }, status: 400
    end

    # If project associated to the time entry could be identified.
    @project = @time_entry.project
    unless @project.nil?
      # Check if the user is a member of the project.
      # TODO: Do we need this check?
      unless @project.members.pluck(:user_id).include?(@user.id)
        return render json: {
          errors: 'You are not a member of this project.'
        }, status: 403
      end

      # Check if the user has permission to log time on the project.
      unless @user.allowed_to?(:log_time, @time_entry.project)
        return render json: {
          errors: 'You are not allowed to log time on this project.'
        }, status: 403
      end
    end

    # Abort if Toggl entries have already been imported.
    # This prevents re-imports for databases which do not support transactions.
    unless TogglMapping.where(toggl_id: params[:toggl_ids]).empty?
      return render json: {
        errors: 'Toggl ID has already been imported.'
      }, status: 400
    end

    begin
      # Save the Redmine time entry and map each Toggl entry to it.
      ActiveRecord::Base.transaction do
        @time_entry.save!
        params[:toggl_ids].each do |toggl_id|
          toggl_mapping = TogglMapping.new(
            time_entry: @time_entry,
            toggl_id: toggl_id
          )
          toggl_mapping.save!
        end
      end
    rescue StandardError => e
      messages = [e.message]

      # If the transaction couldn't be rolled back, raise an alert.
      unless @time_entry.id.nil?
        @time_entry.delete
        messages.push(I18n.t('t2r.text_db_transaction_warning'))
      end

      return render json: { errors: messages }, status: 400
    end

    # Render response.
    render json: { time_entry: @time_entry }, status: 201
  end

  protected

  # Parses request parameters for "import" action.
  #
  # - Prepares a @time_entry object
  # - Prepares a @toggl_ids array
  def import_parse_params
    # Prepare toggl_ids.
    @toggl_ids = params.require :toggl_ids

    # Build a time entry.
    time_entry_data = params
                      .require(:time_entry)
                      .permit(
                        :activity_id,
                        :comments,
                        :hours,
                        :issue_id,
                        :spent_on
                      )
    @time_entry = TimeEntry.new time_entry_data

    # Assign user.
    @time_entry.user = @user

    # Assign project.
    issue = @time_entry.issue
    @time_entry.project = issue.project if issue.present?
  end
end
