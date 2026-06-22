import { extensionConfig } from '@/shared/config/extension';
import { registerBackgroundHandlers } from './app';

registerBackgroundHandlers(chrome, extensionConfig);
