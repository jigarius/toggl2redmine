import * as datetime from "./datetime.js"

export interface TimeEntryActivity {
  id: number
  name: string
  active: boolean
  is_default: boolean
}

export interface Issue {
  id: number
  subject: string
  path: string
  tracker: Tracker
  is_closed: boolean
}

export interface Project {
  id: number
  name: string
  path: string
  status: number // todo: Use enum?
}

export interface Tracker {
  id: number
  name: string
}

export interface TimeEntry {
  id: number
  hours: string
  duration: datetime.Duration
  comments: string
  activity: TimeEntryActivity
  issue: Issue
  project: Project
  spent_on?: string
}

export interface TogglWorkspace {
  id: number
  name: string
}

export interface TogglTimeEntry {
  key: string
  comments: string
  // todo: Use only datetime.Duration
  duration: datetime.Duration | number
  roundedDuration?: datetime.Duration
  errors: string[]
  ids: number[]
  issue_id: number | null
  status: string // todo: Use enum?
  issue: Issue | null
  project: Project | null
}

export interface KeyedTogglTimeEntryCollection {
  [index:string]: TogglTimeEntry
}
