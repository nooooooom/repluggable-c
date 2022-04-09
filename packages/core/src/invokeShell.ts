import type { EntryPoint, PrivateShell } from './types/appHost'

export const invokeEntryPointPhase = (
  phase: keyof EntryPoint,
  shell: PrivateShell[],
  action: (shell: PrivateShell) => void,
  predicate?: (shell: PrivateShell) => boolean
) => {
  try {
    shell
      .filter((f) => !predicate || predicate(f))
      .forEach((f) => invokeShell(f, action, phase))
  } catch (err) {
    console.error(`${phase} phase FAILED`, err)
    throw err
  }
}

export const invokeShell = (
  shell: PrivateShell,
  action: (shell: PrivateShell) => void,
  phase: string
) => {
  try {
    action(shell)
  } catch (err) {
    console.error('AppHost.shellFailed', err, {
      shell: shell.name,
      phase,
      message: `Shell '${shell.name}' FAILED ${phase} phase`,
      error: err
    })
    throw err
  }
}
