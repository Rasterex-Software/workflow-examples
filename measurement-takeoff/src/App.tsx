import type { CSSProperties } from 'react'
import { useTheme } from '../../../src/hooks/useTheme'
import { demoPlatformConfig } from '../../../src/config/demoConfig'
import { ScenarioWorkspacePage } from '../../../src/pages/ScenarioWorkspacePage'

function getMeasurementTakeoffScenario() {
  const scenario = demoPlatformConfig.scenarios.find((candidate) => candidate.id === 'measurement-takeoff')

  if (!scenario) {
    throw new Error('The existing Measurement & Takeoff scenario could not be found.')
  }

  return scenario
}

const measurementTakeoffScenario = getMeasurementTakeoffScenario()

function App() {
  const { isDark, toggleTheme } = useTheme()
  const hostTheme = isDark ? demoPlatformConfig.ui.darkTheme : demoPlatformConfig.ui.theme
  const hostThemeStyle = {
    '--ui-app-bg': hostTheme.appBackground,
    '--ui-surface': hostTheme.surface,
    '--ui-subtle': hostTheme.subtleSurface,
    '--ui-text': hostTheme.text,
    '--ui-muted': hostTheme.mutedText,
    '--ui-border': hostTheme.border,
    '--ui-hover': hostTheme.hoverSurface,
    '--ui-active': hostTheme.activeSurface,
    '--ui-active-text': hostTheme.activeText,
    '--ui-disabled': hostTheme.disabledText,
  } as CSSProperties

  return (
    <div style={hostThemeStyle}>
      <ScenarioWorkspacePage
        scenario={measurementTakeoffScenario}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onBackToWorkspace={() => window.history.back()}
      />
    </div>
  )
}

export default App
