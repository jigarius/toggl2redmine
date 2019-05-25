# Toggl 2 Redmine Controller.
class T2rTogglController < T2rController
  # Reads time entries from Toggl.
  def read_time_entries
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
end
