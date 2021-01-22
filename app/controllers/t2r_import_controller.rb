# frozen_string_literal: true

# Toggl2Redmine Import controller.
class T2rImportController < T2rBaseController
  menu_item :toggl2redmine

  # Creates time entries from request data.
  def import
    begin
      # TODO: Investigate usage of before_action with rescue_from.
      import_parse_params
    rescue ActionController::ParameterMissing,
           ActiveRecord::RecordInvalid => e
      return render json: { errors: [e.message] }, status: 400
    end

    # If project associated to the time entry could be identified.
    @project = @time_entry.project
    unless @project.nil?
      # Check if the user is a member of the project.
      # TODO: Do we need this check?
      unless @project.members.pluck(:user_id).include?(@user.id)
        return render json: {
          errors: ['You are not a member of this project.']
        }, status: 403
      end

      # Check if the user has permission to log time on the project.
      unless @user.allowed_to?(:log_time, @time_entry.project)
        return render json: {
          errors: ['You are not allowed to log time on this project.']
        }, status: 403
      end
    end

    # Abort if Toggl entries have already been imported.
    # This prevents re-imports for databases which do not support transactions.
    unless TogglMapping.where(toggl_id: params[:toggl_ids]).empty?
      return render json: {
        errors: ['Toggl ID has already been imported.']
      }, status: 400
    end

    begin
      # Save the Redmine time entry and map Toggl time entries to it.
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
    rescue ActiveRecord::ActiveRecordError => e
      messages = [e.message]

      # If the transaction couldn't be rolled back, raise an alert.
      unless @time_entry.id.nil?
        @time_entry.delete
        messages.push(I18n.t('t2r.text_db_transaction_warning'))
      end

      return render json: { errors: messages }, status: 503
    end

    render json: true, status: 201
  end

  private

  # Parses request parameters for "import" action.
  #
  # - Prepares a @time_entry object
  # - Prepares a @toggl_ids array
  def import_parse_params
    params[:toggl_ids]&.keep_if { |id| id.respond_to?(:to_i) && id.to_i.positive? }
    @toggl_ids = params.require(:toggl_ids)

    @time_entry = TimeEntry.new do |te|
      attributes = params.require(:time_entry)
        .permit(
          :activity_id,
          :comments,
          :hours,
          :issue_id,
          :spent_on
        )
      te.assign_attributes(attributes)
      te.user = @user
      te.project = te.issue&.project
      te.validate!
    end
  end
end
