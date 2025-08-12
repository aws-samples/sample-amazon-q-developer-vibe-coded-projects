// This file is a barrel file that re-exports from the nova-sonic folder
// This maintains backward compatibility with existing imports

export { 
  NovaSonicClient, 
  DefaultSystemPrompt,
  registerDefaultTools
} from './nova-sonic';

// Re-export types
export { 
  SessionContext
} from '../types/novasonic.types';

// Import and re-export the StreamSession
import { StreamSession } from './nova-sonic/stream-session';
export { StreamSession };

// Import and re-export constants
import { 
  DefaultInferenceConfiguration,
  DefaultAudioInputConfiguration,
  DefaultToolSchema,
  WeatherToolSchema,
  DefaultTextConfiguration,
  DefaultAudioOutputConfiguration
} from './nova-sonic/constants';

export {
  DefaultInferenceConfiguration,
  DefaultAudioInputConfiguration,
  DefaultToolSchema,
  WeatherToolSchema,
  DefaultTextConfiguration,
  DefaultAudioOutputConfiguration
};
