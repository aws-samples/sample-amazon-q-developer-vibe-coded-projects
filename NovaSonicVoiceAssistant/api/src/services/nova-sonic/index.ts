import { NovaSonicClient } from './client';
import { DefaultSystemPrompt } from './system-prompt';

// Export main components
export { NovaSonicClient, DefaultSystemPrompt };


//TODO
// This function is intentionally left empty as tools are registered from /api/src/tools/
export function registerDefaultTools(client: NovaSonicClient): void {
  // Tools are registered from /api/src/tools/ via registerAllTools()
}
