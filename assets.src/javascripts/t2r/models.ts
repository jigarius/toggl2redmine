import * as datetime from "./datetime.js"

interface Optionable {
  id: number | string
  name: string
}

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
  // todo: Only allow Duration.
  duration: datetime.Duration | number
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
  issue_id: number
  status: string // todo: Use enum?
  issue: Issue
  project: Project
}

export interface KeyedTogglTimeEntryCollection {
  [index:string]: TogglTimeEntry
}
