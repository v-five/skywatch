import type { Module } from '../../core'
import type { ModuleView } from '../context'
import { BLACKBOX_VIEW } from './blackbox'
import { BRIDGE_VIEW } from './bridge'
import { COUNCIL_VIEW } from './council'
import { MISSION_VIEW } from './mission'
import { PLAN_VIEW } from './plan'
import { PROBES_VIEW } from './probes'
import { SHIELDS_VIEW } from './shields'
import { SHUTTLES_VIEW } from './shuttles'

/** How each module is drawn, and when it has nothing to show and takes no room. */
export const MODULE_VIEWS: Readonly<Record<Module, ModuleView>> = {
  bridge: BRIDGE_VIEW,
  plan: PLAN_VIEW,
  council: COUNCIL_VIEW,
  shields: SHIELDS_VIEW,
  shuttles: SHUTTLES_VIEW,
  probes: PROBES_VIEW,
  mission: MISSION_VIEW,
  blackbox: BLACKBOX_VIEW,
}
