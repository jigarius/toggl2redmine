# Toggl 2 Redmine Controller.
class T2rController < ApplicationController
  menu_item :toggl2redmine
  before_action :require_login, :validate_user

  # TODO: Respond in HTML / JSON according to format requested.

  # Provides an interface for importing Toggl time entries to Redmine.
  def index
    @redmine_api_key = @user.api_key
  end

  # Reads time entries from Redmine.
  def read_redmine_time_entries
    # Require 'from' parameter.
    unless params[:from]
      return render json: {
        errors: "Parameter 'from' must be present."
      }, status: 403
    end
    from = Time.parse(params[:from])

    # Require 'till' parameter.
    unless params[:till]
      return render json: {
        errors: "Parameter 'till' must be present."
      }, status: 403
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
      return render json: {
        errors: "Parameter 'from' must be present."
      }, status: 403
    end
    from = Time.parse(params[:from])

    # Require 'till' parameter.
    unless params[:till]
      return render json: {
        errors: "Parameter 'till' must be present."
      }, status: 403
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
      return render json: { errors: response.body }, status: response.code
    rescue StandardError => e
      return render json: { errors: e.message }, status: 400
    end

    # Prepare grouped time entries.
    @time_entries = GroupedTogglTimeEntry.new_from_feed(time_entries)
    output = {}
    # Expand certain Redmine models manually.
    @time_entries.values.each do |time_entry|
      hash = time_entry.as_json
      hash[:issue] = nil
      hash[:project] = nil
      hash[:errors] = []

      unless time_entry.issue.nil?
        # If the user has permission to see the project.
        if @user.admin? ||
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
  # TODO: Move params validation to import_validate_params().
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

    # Toggl IDs must be present.
    unless params[:toggl_ids].present?
      return render json: {
        errors: "Parameter 'toggl_ids' must be present."
      }, status: 400
    end

    # Abort if Toggl entries have already been imported.
    # This prevents re-imports for databases which do not support transactions.
    unless TogglMapping.find_by_toggl_ids(*params[:toggl_ids]).empty?
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
end
