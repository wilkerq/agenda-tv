import { EventEmitter } from 'events';

// This is a global event emitter for handling specific types of errors.
// We are using the node 'events' module, which is available in Next.js environments.
export const errorEmitter = new EventEmitter();
