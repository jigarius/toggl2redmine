# Toggl 2 Redmine Controller.
class T2rController < ApplicationController
  menu_item :toggl2redmine
  before_action :require_login, :validate_user

  # TODO: Respond in HTML / JSON according to format requested.

  # Provides an interface for importing Toggl time entries to Redmine.
  def index
    @toggl_api_key = @user.custom_field_value(UserCustomField.find_by_name('Toggl API Token'))
    @redmine_api_key = @user.api_key
  end

  # Reads time entries from Redmine.
  def read_redmine_time_entries
    # Require 'from' parameter.
    unless params[:from]
      render json: { errors: "Parameter 'from' must be present." }, status: 403
      return
    end
    from = Time.parse(params[:from])

    # Require 'till' parameter.
    unless params[:till]
      render json: { errors: "Parameter 'till' must be present." }, status: 403
      return
    end
    till = Time.parse(params[:till])

    # Load time entries in range.
    @time_entries = TimeEntry.where(
      user: @user,
      spent_on: from..till
    )

    # Return time entries with associations.
    render json: { time_entries: @time_entries },
           include: {
             issue: {
               only: %i[id subject],
               include: {
                 tracker: {
                   only: %i[id name]
                 }
               }
             },
             project: {
               only: %i[id name status]
             },
             activity: {
               only: %i[id name]
             },
             user: {
               only: %i[id login]
             }
           }
  end

  # Reads time entries from Toggl.
  def read_toggl_time_entries
    # Require 'from' parameter.
    unless params[:from]
      render json: { errors: "Parameter 'from' must be present." }, status: 403
      return
    end
    from = Time.parse(params[:from])

    # Require 'till' parameter.
    unless params[:till]
      render json: { errors: "Parameter 'till' must be present." }, status: 403
      return
    end
    till = Time.parse(params[:till])

    # Determine 'workspaces' parameter.
    workspaces = []
    workspaces = params[:workspaces].split(',').map(&:to_i) if params[:workspaces]

    begin
      toggl_service = TogglService.new(@toggl_api_key)
      time_entries = toggl_service.load_time_entries(
        start_date: from,
        end_date: till,
        workspaces: workspaces
      )
    rescue TogglError => e
      response = e.response
      render json: { errors: response.body }, status: response.code
      return
    rescue e
      render json: { errors: e.message }, status: 400
    end

    # Prepare grouped time entries.
    @time_entries = GroupedTogglTimeEntry.newFromFeed(time_entries)
    output = {}
    # Expand certain Redmine models manually.
    @time_entries.values.each do |time_entry|
      hash = time_entry.as_json
      hash[:issue] = nil
      hash[:project] = nil
      hash[:errors] = []

      unless time_entry.issue.nil?
        # If the user has permission to see the project.
        if
          @user.admin? ||
          time_entry.issue.project.members.pluck(:user_id).include?(@user.id)

          # Include issue.
          issue = time_entry.issue
          hash[:issue] = {
            id: issue.id,
            subject: issue.subject,
            # Include tracker.
            tracker: {
              id: issue.tracker.id,
              name: issue.tracker.name
            },
            # Include project.
            project: {
              id: issue.project.id,
              name: issue.project.name,
              status: issue.project.status
            }
          }
        end
      end
      output[time_entry.key] = hash
    end

    render json: output
  end

  # Creates time entries from request data.
  def import
    # Prepare a Redmine time entry.
    @time_entry = TimeEntry.new(params[:time_entry])
    @time_entry.user = @user
    @time_entry.project = @time_entry.issue.project if @time_entry.issue.present?
    @project = @time_entry.project

    # If project associated to the time entry could be identified.
    unless @project.nil?
      # Check if the user is a member of the project.
      # TODO: Do we need this check?
      unless @project.members.pluck(:user_id).include?(@user.id)
        render json: { errors: 'You are not a member of this project.' }, status: 403
        return
      end

      # Check if the user has permission to log time on the project.
      unless @user.allowed_to?(:log_time, @time_entry.project)
        render json: { errors: 'You are not allowed to log time on this project.' }, status: 403
        return
      end
    end

    # Toggl IDs must be present.
    unless params[:toggl_ids].present?
      render json: { errors: "Parameter 'toggl_ids' must be present." }, status: 400
      return
    end

    # Abort if Toggl entries have already been imported.
    # This prevents reimports for databases which do not support transactions.
    params[:toggl_ids].each do |toggl_id|
      toggl_mapping = TogglMapping.where(toggl_id: toggl_id)
      unless toggl_mapping.empty?
        render json: { errors: 'Toggl ID has already been imported.' }, status: 400
        return
      end
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
        messages.push('Your database does not support transactions. Please ask your system administrator to refer to the README for "Toggle 2 Redmine".')
      end

      render json: { errors: messages }, status: 400
      return
    end

    # Render response.
    render json: { time_entry: @time_entry }, status: 201
  end

  # Determines the currently logged in user.
  def validate_user
    @user = find_current_user

    # Must have a Toggl API key.
    @toggl_api_key = @user.custom_field_value(UserCustomField.find_by_name('Toggl API Token'))
    if @toggl_api_key.nil? || @toggl_api_key.empty?
      flash[:error] = 'To import time entries from Toggl, please add a Toggl API Token to your account.'
      redirect_to controller: 'my', action: 'account'
    end
  end
end
